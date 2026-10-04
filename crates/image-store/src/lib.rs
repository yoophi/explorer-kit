//! Tauri-free image file storage. Callers own directories, stems, and identity rules.
use std::{
    collections::HashSet,
    fs, io,
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
};

/// Preferred lookup order, shared by replacement cleanup and discovery.
pub const IMAGE_EXTENSIONS: [&str; 5] = ["png", "jpg", "jpeg", "webp", "gif"];

/// Folder-style lookup may match a stem with different ASCII casing.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StemMatch {
    /// Canonical filename paths, using the filesystem's native case behavior.
    Exact,
    AsciiCaseInsensitive,
}

#[derive(Debug)]
pub struct CleanupWarning {
    pub path: PathBuf,
    pub error: io::Error,
}

/// A successful atomic write can still leave an older extension behind.
/// Callers must inspect `cleanup_warnings` before treating replacement as complete.
#[derive(Debug)]
pub struct SaveOutcome {
    pub saved_path: PathBuf,
    pub cleanup_warnings: Vec<CleanupWarning>,
}

/// Structured interpretation of a completed write. CleanupIncomplete is still
/// a successful save; its saved path must be retained for reconciliation.
#[derive(Debug)]
pub enum SaveCompletion {
    Complete {
        saved_path: PathBuf,
    },
    CleanupIncomplete {
        saved_path: PathBuf,
        warnings: Vec<CleanupWarning>,
    },
}

impl SaveOutcome {
    pub fn is_complete(&self) -> bool {
        self.cleanup_warnings.is_empty()
    }

    pub fn into_completion(self) -> SaveCompletion {
        if self.cleanup_warnings.is_empty() {
            SaveCompletion::Complete {
                saved_path: self.saved_path,
            }
        } else {
            SaveCompletion::CleanupIncomplete {
                saved_path: self.saved_path,
                warnings: self.cleanup_warnings,
            }
        }
    }
}

/// Caller-selected candidates. Naming and group membership remain app policy.
/// `FileName` selects one exact spelling (including upper-case extensions),
/// useful when a caller has enumerated orphan images by its own group rule.
#[derive(Clone, Copy, Debug)]
pub enum RemovalTarget<'a> {
    Stem {
        stem: &'a str,
        stem_match: StemMatch,
    },
    FileName(&'a str),
}

/// Commit means the caller's database change has already succeeded. Cleanup
/// failure leaves remaining staged bytes at `quarantine_directory` for repair.
#[derive(Debug)]
pub enum CommitOutcome {
    Complete,
    CleanupFailed {
        quarantine_directory: PathBuf,
        warnings: Vec<CleanupWarning>,
    },
}

struct StagedFile {
    original: PathBuf,
    staged: PathBuf,
    was_symlink: bool,
}

/// Holds the image mutex until explicit commit or rollback (including I/O).
/// Use inside a JSON update callback, then finish after the JSON result is known.
/// Dropping unfinished work attempts rollback and logs any failure; explicit
/// rollback is required when the caller needs to handle recovery errors.
pub struct StagedRemoval {
    _guard: MutexGuard<'static, ()>,
    quarantine_directory: Option<PathBuf>,
    files: Vec<StagedFile>,
    finished: bool,
}

impl StagedRemoval {
    pub fn quarantine_directory(&self) -> Option<&Path> {
        self.quarantine_directory.as_deref()
    }

    /// Restore staged originals without replacing any newly created path.
    /// On conflict/failure, unresolved originals stay in quarantine and the
    /// returned error identifies its path. This is not crash-atomic recovery.
    pub fn rollback(mut self) -> io::Result<()> {
        let result = self.rollback_inner();
        self.finished = true;
        result
    }

    /// Finalize a database-committed removal. Cleanup failure is explicitly
    /// different from a failed database operation; do not roll back afterward.
    pub fn commit(mut self) -> CommitOutcome {
        let result = self.commit_inner();
        self.finished = true;
        result
    }

    fn rollback_inner(&mut self) -> io::Result<()> {
        let mut failures = Vec::new();
        for file in self.files.iter().rev() {
            match fs::symlink_metadata(&file.original) {
                Ok(_) => {
                    failures.push(format!(
                        "{} already exists; original retained at {}",
                        file.original.display(),
                        file.staged.display()
                    ));
                    continue;
                }
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(error) => {
                    failures.push(format!(
                        "{}: {error}; original retained at {}",
                        file.original.display(),
                        file.staged.display()
                    ));
                    continue;
                }
            }
            if let Err(error) = fs::rename(&file.staged, &file.original) {
                failures.push(format!(
                    "{} -> {}: {error}",
                    file.staged.display(),
                    file.original.display()
                ));
            }
        }
        if failures.is_empty() {
            if let Some(directory) = &self.quarantine_directory {
                if let Err(error) = fs::remove_dir(directory) {
                    failures.push(format!("{}: {error}", directory.display()));
                }
            }
        }
        if failures.is_empty() {
            Ok(())
        } else {
            let directory = self
                .quarantine_directory
                .as_ref()
                .map(|v| v.display().to_string())
                .unwrap_or_default();
            Err(io::Error::other(format!(
                "Image rollback incomplete; quarantine {directory}: {}",
                failures.join("; ")
            )))
        }
    }

    fn commit_inner(&mut self) -> CommitOutcome {
        let Some(directory) = &self.quarantine_directory else {
            return CommitOutcome::Complete;
        };
        let mut warnings = Vec::new();
        for file in &self.files {
            if let Err(error) = require_staged_file(&file.staged, file.was_symlink)
                .and_then(|_| fs::remove_file(&file.staged))
            {
                warnings.push(CleanupWarning {
                    path: file.staged.clone(),
                    error,
                });
            }
        }
        if warnings.is_empty() {
            if let Err(error) = fs::remove_dir(directory) {
                warnings.push(CleanupWarning {
                    path: directory.clone(),
                    error,
                });
            }
        }
        if warnings.is_empty() {
            CommitOutcome::Complete
        } else {
            CommitOutcome::CleanupFailed {
                quarantine_directory: directory.clone(),
                warnings,
            }
        }
    }
}

impl Drop for StagedRemoval {
    fn drop(&mut self) {
        if !self.finished {
            if let Err(error) = self.rollback_inner() {
                eprintln!("Unfinished image removal could not be restored: {error}");
            }
            self.finished = true;
        }
    }
}

// Serializes saves, cleanup, and lookup among cooperating callers in this process.
static IMAGE_LOCK: Mutex<()> = Mutex::new(());

pub fn normalize_extension(extension: &str) -> io::Result<&'static str> {
    let extension = extension
        .trim()
        .strip_prefix('.')
        .unwrap_or(extension.trim());
    IMAGE_EXTENSIONS
        .iter()
        .copied()
        .find(|candidate| candidate.eq_ignore_ascii_case(extension))
        .ok_or_else(|| invalid_input("Unsupported image extension"))
}

/// A stem is one filename component; path separators and unsafe punctuation are rejected.
/// A trailing dot is safe here because an extension is appended to the filename.
pub fn validate_stem(stem: &str) -> io::Result<()> {
    if stem.is_empty()
        || stem.trim() != stem
        || stem == "."
        || stem == ".."
        || stem
            .chars()
            .any(|ch| ch.is_control() || "<>:\"/\\|?*".contains(ch))
    {
        return Err(invalid_input("Unsafe image filename stem"));
    }
    Ok(())
}

/// Validates one filename component with a supported image extension.
/// Callers may use this while selecting exact-case orphan candidates; staging
/// always validates again under the image mutex.
pub fn validate_image_filename(file_name: &str) -> io::Result<()> {
    let (stem, extension) = file_name
        .rsplit_once('.')
        .ok_or_else(|| invalid_input("Image filename has no extension"))?;
    validate_stem(stem)?;
    // Existing filenames must already have a supported extension. Unlike a
    // user's extension input, whitespace/control characters are not normalized.
    if !IMAGE_EXTENSIONS
        .iter()
        .any(|supported| extension.eq_ignore_ascii_case(supported))
    {
        return Err(invalid_input("Unsupported image filename extension"));
    }
    Ok(())
}

/// Stage recognized regular image variants for multiple stems in one operation.
/// The image mutex is held until `StagedRemoval::commit` or `rollback` returns.
/// Staging uses a hidden temporary directory within `directory`, so renames
/// stay on the same filesystem. A stage failure restores completed moves;
/// rollback failure is returned with the retained quarantine path.
pub fn stage_remove_images(
    directory: impl AsRef<Path>,
    targets: &[RemovalTarget<'_>],
) -> io::Result<StagedRemoval> {
    stage_remove_images_with_hook(directory.as_ref(), targets, |_| Ok(()))
}

fn stage_remove_images_with_hook(
    directory: &Path,
    targets: &[RemovalTarget<'_>],
    mut before_move: impl FnMut(usize) -> io::Result<()>,
) -> io::Result<StagedRemoval> {
    for target in targets {
        match target {
            RemovalTarget::Stem { stem, .. } => validate_stem(stem)?,
            RemovalTarget::FileName(name) => validate_image_filename(name)?,
        }
    }
    let guard = IMAGE_LOCK
        .lock()
        .map_err(|_| io::Error::other("Image lock poisoned"))?;
    let mut candidates = Vec::new();
    let mut seen = HashSet::new();
    // Explicit filenames come first so an aliasing stem cannot change the
    // original spelling if a later stage move fails on a case-insensitive FS.
    for target in targets
        .iter()
        .filter(|v| matches!(v, RemovalTarget::FileName(_)))
        .chain(
            targets
                .iter()
                .filter(|v| matches!(v, RemovalTarget::Stem { .. })),
        )
    {
        let paths = match target {
            RemovalTarget::Stem { stem, stem_match } => {
                match matching_variants(directory, stem, *stem_match) {
                    Ok(variants) => variants.into_iter().map(|(_, path)| path).collect(),
                    Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
                    Err(error) => return Err(error),
                }
            }
            RemovalTarget::FileName(name) => {
                let path = directory.join(name);
                match fs::symlink_metadata(&path) {
                    Ok(_) => vec![path],
                    Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
                    Err(error) => return Err(error),
                }
            }
        };
        for path in paths {
            if seen.insert(path.clone()) {
                require_image_file(&path)?;
                candidates.push(path);
            }
        }
    }
    let quarantine_directory = if candidates.is_empty() {
        None
    } else {
        Some(
            tempfile::Builder::new()
                .prefix(".explorer-image-stage-")
                .tempdir_in(directory)?
                .keep(),
        )
    };
    let mut staged = StagedRemoval {
        _guard: guard,
        quarantine_directory,
        files: Vec::new(),
        finished: false,
    };
    for (index, original) in candidates.into_iter().enumerate() {
        // Preserve the exact filename so an interrupted process leaves enough
        // information for manual recovery without a separate manifest.
        let target = staged
            .quarantine_directory
            .as_ref()
            .unwrap()
            .join(original.file_name().unwrap());
        let result = (|| {
            let was_symlink = fs::symlink_metadata(&original)?.file_type().is_symlink();
            before_move(index)?;
            fs::rename(&original, &target)?;
            Ok(was_symlink)
        })();
        match result {
            Ok(was_symlink) => staged.files.push(StagedFile {
                original,
                staged: target,
                was_symlink,
            }),
            Err(error) => {
                let rollback = staged.rollback_inner();
                staged.finished = true;
                return match rollback {
                    Ok(()) => Err(error),
                    Err(rollback_error) => Err(io::Error::other(format!(
                        "Image staging failed: {error}; {rollback_error}"
                    ))),
                };
            }
        }
    }
    Ok(staged)
}

/// Writes bytes atomically, then removes competing variants according to stem_match.
/// Write errors return `Err`; cleanup errors are carried with the saved path.
pub fn save_image(
    directory: impl AsRef<Path>,
    stem: &str,
    extension: &str,
    bytes: &[u8],
    stem_match: StemMatch,
) -> io::Result<SaveOutcome> {
    validate_stem(stem)?;
    let extension = normalize_extension(extension)?;
    let _guard = IMAGE_LOCK
        .lock()
        .map_err(|_| io::Error::other("Image lock poisoned"))?;
    let directory = directory.as_ref();
    let saved_path = directory.join(format!("{stem}.{extension}"));
    explorer_json_store::write_bytes_atomic(&saved_path, bytes)?;

    let mut cleanup_warnings = Vec::new();
    match matching_variants(directory, stem, stem_match) {
        Ok(variants) => {
            let saved_target = fs::canonicalize(&saved_path).ok();
            for (_, variant) in variants {
                if variant == saved_path
                    || saved_target.as_ref().is_some_and(|target| {
                        fs::canonicalize(&variant).ok().as_ref() == Some(target)
                    })
                {
                    continue;
                }
                if let Err(error) =
                    require_image_file(&variant).and_then(|_| fs::remove_file(&variant))
                {
                    cleanup_warnings.push(CleanupWarning {
                        path: variant,
                        error,
                    });
                }
            }
        }
        Err(error) => cleanup_warnings.push(CleanupWarning {
            path: directory.to_path_buf(),
            error,
        }),
    }
    Ok(SaveOutcome {
        saved_path,
        cleanup_warnings,
    })
}

/// Returns the first existing file in png, jpg, jpeg, webp, gif order.
/// Exact mode checks canonical extension paths without listing the directory.
/// Case-insensitive mode lists variants; ties prefer exact spelling, then path order.
/// If a prior save returned cleanup warnings, callers should retain its `saved_path`
/// until reconciliation; a plain lookup may still select an older higher-priority file.
pub fn find_image(
    directory: impl AsRef<Path>,
    stem: &str,
    stem_match: StemMatch,
) -> io::Result<Option<PathBuf>> {
    validate_stem(stem)?;
    let _guard = IMAGE_LOCK
        .lock()
        .map_err(|_| io::Error::other("Image lock poisoned"))?;
    let mut variants = match matching_variants(directory.as_ref(), stem, stem_match) {
        Ok(variants) => variants,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    variants.retain(|(_, path)| path.is_file());
    Ok(variants.into_iter().next().map(|(_, path)| path))
}

/// Move a legacy image only when no current image exists, under the image lock.
/// Retrying after a partial multi-image migration preserves already migrated/new images.
/// Both stems live in the same directory; naming/schema decisions belong to the caller.
pub fn migrate_image_if_absent(
    directory: impl AsRef<Path>,
    legacy_stem: &str,
    target_stem: &str,
    stem_match: StemMatch,
) -> io::Result<Option<PathBuf>> {
    validate_stem(legacy_stem)?;
    validate_stem(target_stem)?;
    let _guard = IMAGE_LOCK
        .lock()
        .map_err(|_| io::Error::other("Image lock poisoned"))?;
    let directory = directory.as_ref();
    let current = match matching_variants(directory, target_stem, stem_match) {
        Ok(variants) => variants,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    if let Some((_, path)) = current.into_iter().find(|(_, path)| path.is_file()) {
        return Ok(Some(path));
    }
    let legacy = matching_variants(directory, legacy_stem, stem_match)?;
    let Some((_, source)) = legacy.into_iter().find(|(_, path)| path.is_file()) else {
        return Ok(None);
    };
    let extension = normalize_extension(
        source
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or_default(),
    )?;
    let target = directory.join(format!("{target_stem}.{extension}"));
    fs::rename(source, &target)?;
    Ok(Some(target))
}

/// Removes recognized variants under the same lock as save and migration.
/// Missing files are already removed; other cleanup failures remain errors.
pub fn remove_images(
    directory: impl AsRef<Path>,
    stem: &str,
    stem_match: StemMatch,
) -> io::Result<()> {
    validate_stem(stem)?;
    let _guard = IMAGE_LOCK
        .lock()
        .map_err(|_| io::Error::other("Image lock poisoned"))?;
    let variants = match matching_variants(directory.as_ref(), stem, stem_match) {
        Ok(variants) => variants,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };
    for (_, path) in variants {
        match require_image_file(&path).and_then(|_| fs::remove_file(path)) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error),
        }
    }
    Ok(())
}

fn matching_variants(
    directory: &Path,
    stem: &str,
    stem_match: StemMatch,
) -> io::Result<Vec<((usize, bool, bool, PathBuf), PathBuf)>> {
    // Canonical paths preserve Bookmark's existing filesystem case semantics and
    // avoid a full library scan per entry. Folder lookup explicitly opts into scanning.
    if stem_match == StemMatch::Exact {
        let mut variants = Vec::new();
        for (rank, extension) in IMAGE_EXTENSIONS.iter().enumerate() {
            let path = directory.join(format!("{stem}.{extension}"));
            match fs::symlink_metadata(&path) {
                Ok(_) => variants.push(((rank, false, false, path.clone()), path)),
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(error) => return Err(error),
            }
        }
        return Ok(variants);
    }
    let mut variants = Vec::new();
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        let Some((candidate_stem, extension)) = name.rsplit_once('.') else {
            continue;
        };
        let stem_matches = match stem_match {
            StemMatch::Exact => candidate_stem == stem,
            StemMatch::AsciiCaseInsensitive => candidate_stem.eq_ignore_ascii_case(stem),
        };
        if !stem_matches {
            continue;
        }
        let Ok(extension_name) = normalize_extension(extension) else {
            continue;
        };
        let rank = IMAGE_EXTENSIONS
            .iter()
            .position(|candidate| *candidate == extension_name)
            .unwrap();
        let path = entry.path();
        variants.push((
            (
                rank,
                candidate_stem != stem,
                extension != extension_name,
                path.clone(),
            ),
            path,
        ));
    }
    variants.sort_by(|left, right| left.0.cmp(&right.0));
    Ok(variants)
}

fn invalid_input(message: &'static str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message)
}

fn require_image_file(path: &Path) -> io::Result<()> {
    if fs::metadata(path)?.is_file() {
        Ok(())
    } else {
        Err(invalid_input("Image candidate is not a regular file"))
    }
}

fn require_staged_file(path: &Path, was_symlink: bool) -> io::Result<()> {
    let kind = fs::symlink_metadata(path)?.file_type();
    if (was_symlink && kind.is_symlink()) || (!was_symlink && kind.is_file()) {
        Ok(())
    } else {
        Err(invalid_input("Staged image candidate changed file type"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_filenames_do_not_normalize_non_image_suffixes() {
        let dir = tempfile::tempdir().unwrap();
        for name in ["notes.png ", "notes. png", "notes.png\n"] {
            let path = dir.path().join(name);
            fs::write(&path, b"preserve").unwrap();
            assert!(validate_image_filename(name).is_err());
            assert!(stage_remove_images(dir.path(), &[RemovalTarget::FileName(name)]).is_err());
            assert_eq!(fs::read(&path).unwrap(), b"preserve");
        }
        validate_image_filename("trailer..PNG").unwrap();
        assert_eq!(normalize_extension(" .PNG ").unwrap(), "png");
    }

    #[cfg(unix)]
    #[test]
    fn replacement_and_removal_preserve_directory_symlinks() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("user-directory");
        fs::create_dir(&target).unwrap();
        let link = dir.path().join("COVER.png");
        symlink(&target, &link).unwrap();
        let saved = save_image(
            dir.path(),
            "COVER",
            "jpg",
            b"new",
            StemMatch::AsciiCaseInsensitive,
        )
        .unwrap();
        assert_eq!(saved.cleanup_warnings.len(), 1);
        assert!(fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink());
        assert!(remove_images(dir.path(), "COVER", StemMatch::Exact).is_err());
        assert!(fs::symlink_metadata(link).unwrap().file_type().is_symlink());
        assert!(target.is_dir());
    }

    #[test]
    fn removal_is_repeatable_and_preserves_other_stems() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("COVER.PNG"), b"a").unwrap();
        fs::write(dir.path().join("cover.jpg"), b"b").unwrap();
        fs::write(dir.path().join("other.png"), b"c").unwrap();
        remove_images(dir.path(), "cover", StemMatch::AsciiCaseInsensitive).unwrap();
        remove_images(dir.path(), "cover", StemMatch::AsciiCaseInsensitive).unwrap();
        assert_eq!(
            find_image(dir.path(), "cover", StemMatch::AsciiCaseInsensitive).unwrap(),
            None
        );
        assert_eq!(fs::read(dir.path().join("other.png")).unwrap(), b"c");
        remove_images(dir.path().join("missing"), "cover", StemMatch::Exact).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn exact_lookup_does_not_require_directory_listing_permission() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bookmark.png");
        fs::write(&path, b"image").unwrap();
        fs::set_permissions(dir.path(), fs::Permissions::from_mode(0o111)).unwrap();
        let found = find_image(dir.path(), "bookmark", StemMatch::Exact);
        let absent = find_image(dir.path(), "absent", StemMatch::Exact);
        fs::set_permissions(dir.path(), fs::Permissions::from_mode(0o700)).unwrap();
        assert_eq!(found.unwrap(), Some(path));
        assert_eq!(absent.unwrap(), None);
    }

    #[test]
    fn migration_preserves_new_image_across_extensions() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("legacy.png"), b"old").unwrap();
        fs::write(dir.path().join("current.jpg"), b"new").unwrap();
        assert_eq!(
            migrate_image_if_absent(dir.path(), "legacy", "current", StemMatch::Exact).unwrap(),
            Some(dir.path().join("current.jpg"))
        );
        assert_eq!(fs::read(dir.path().join("current.jpg")).unwrap(), b"new");
        assert!(dir.path().join("legacy.png").exists());
    }

    #[test]
    fn failed_migration_can_be_retried_without_losing_legacy_image() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("legacy.png"), b"old").unwrap();
        fs::create_dir(dir.path().join("current.png")).unwrap();
        assert!(
            migrate_image_if_absent(dir.path(), "legacy", "current", StemMatch::Exact).is_err()
        );
        assert_eq!(fs::read(dir.path().join("legacy.png")).unwrap(), b"old");
        fs::remove_dir(dir.path().join("current.png")).unwrap();
        let target =
            migrate_image_if_absent(dir.path(), "legacy", "current", StemMatch::Exact).unwrap();
        assert_eq!(target, Some(dir.path().join("current.png")));
        assert_eq!(
            migrate_image_if_absent(dir.path(), "legacy", "current", StemMatch::Exact).unwrap(),
            target
        );
        assert_eq!(fs::read(target.unwrap()).unwrap(), b"old");
        assert!(!dir.path().join("legacy.png").exists());
    }

    #[test]
    fn extension_and_stem_validation() {
        assert_eq!(normalize_extension(" .JpEg ").unwrap(), "jpeg");
        for extension in ["bmp", "..png", "png/other", ""] {
            assert!(normalize_extension(extension).is_err());
        }
        for stem in ["", ".", "..", "../escape", "a/b", "a\\b", "a:b", " a"] {
            assert!(validate_stem(stem).is_err());
        }
        validate_stem("한글%20.name").unwrap();
        validate_stem("a.").unwrap();
        assert!(validate_image_filename("a.txt").is_err());
        validate_image_filename("a..PNG").unwrap();
    }

    #[test]
    fn trailing_dot_stems_save_find_remove_and_migrate() {
        let dir = tempfile::tempdir().unwrap();
        let stem = "default%3A%2Ftrailer.";
        let saved = save_image(dir.path(), stem, "png", b"new", StemMatch::Exact)
            .unwrap()
            .saved_path;
        assert_eq!(saved.file_name().unwrap(), "default%3A%2Ftrailer..png");
        assert_eq!(
            find_image(dir.path(), stem, StemMatch::Exact).unwrap(),
            Some(saved.clone())
        );
        remove_images(dir.path(), stem, StemMatch::Exact).unwrap();
        assert!(!saved.exists());
        fs::write(dir.path().join("legacy..jpg"), b"old").unwrap();
        let moved = migrate_image_if_absent(dir.path(), "legacy.", stem, StemMatch::Exact)
            .unwrap()
            .unwrap();
        assert_eq!(moved, dir.path().join("default%3A%2Ftrailer..jpg"));
        assert_eq!(fs::read(moved).unwrap(), b"old");
    }

    #[test]
    fn staged_multi_stem_rollback_restores_bytes_and_releases_lock() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.png"), b"a").unwrap();
        fs::write(dir.path().join("b.jpg"), b"b").unwrap();
        fs::write(dir.path().join("notes.txt"), b"leave").unwrap();
        let transaction = stage_remove_images(
            dir.path(),
            &[
                RemovalTarget::Stem {
                    stem: "a",
                    stem_match: StemMatch::Exact,
                },
                RemovalTarget::Stem {
                    stem: "b",
                    stem_match: StemMatch::Exact,
                },
                RemovalTarget::FileName("a.png"),
            ],
        )
        .unwrap();
        let quarantine = transaction.quarantine_directory().unwrap().to_path_buf();
        assert!(IMAGE_LOCK.try_lock().is_err());
        assert!(!dir.path().join("a.png").exists());
        assert!(!dir.path().join("b.jpg").exists());
        assert_eq!(fs::read(quarantine.join("a.png")).unwrap(), b"a");
        assert_eq!(fs::read(quarantine.join("b.jpg")).unwrap(), b"b");
        transaction.rollback().unwrap();
        assert!(!quarantine.exists());
        assert_eq!(fs::read(dir.path().join("a.png")).unwrap(), b"a");
        assert_eq!(fs::read(dir.path().join("b.jpg")).unwrap(), b"b");
        assert_eq!(fs::read(dir.path().join("notes.txt")).unwrap(), b"leave");
        assert_eq!(
            find_image(dir.path(), "a", StemMatch::Exact).unwrap(),
            Some(dir.path().join("a.png"))
        );
    }

    #[test]
    fn partial_stage_failure_rolls_back_every_completed_move() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.png"), b"a").unwrap();
        fs::write(dir.path().join("b.jpg"), b"b").unwrap();
        let error = stage_remove_images_with_hook(
            dir.path(),
            &[
                RemovalTarget::FileName("a.png"),
                RemovalTarget::FileName("b.jpg"),
            ],
            |index| {
                if index == 1 {
                    Err(io::Error::other("injected stage failure"))
                } else {
                    Ok(())
                }
            },
        )
        .err()
        .expect("second move must fail");
        assert!(error.to_string().contains("injected stage failure"));
        assert_eq!(fs::read(dir.path().join("a.png")).unwrap(), b"a");
        assert_eq!(fs::read(dir.path().join("b.jpg")).unwrap(), b"b");
        assert!(!fs::read_dir(dir.path()).unwrap().any(|entry| entry
            .unwrap()
            .file_name()
            .to_string_lossy()
            .starts_with(".explorer-image-stage-")));
    }

    #[test]
    fn partial_stage_rollback_conflict_reports_retained_backup() {
        let dir = tempfile::tempdir().unwrap();
        let first = dir.path().join("a.png");
        fs::write(&first, b"old").unwrap();
        fs::write(dir.path().join("b.jpg"), b"second").unwrap();
        let error = stage_remove_images_with_hook(
            dir.path(),
            &[
                RemovalTarget::FileName("a.png"),
                RemovalTarget::FileName("b.jpg"),
            ],
            |index| {
                if index == 1 {
                    fs::write(&first, b"new")?;
                    Err(io::Error::other("injected second move failure"))
                } else {
                    Ok(())
                }
            },
        )
        .err()
        .expect("stage must fail");
        let quarantine = fs::read_dir(dir.path())
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .find(|path| {
                path.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with(".explorer-image-stage-")
            })
            .expect("failed rollback must retain quarantine");
        assert!(error
            .to_string()
            .contains(&quarantine.display().to_string()));
        assert_eq!(fs::read(first).unwrap(), b"new");
        assert_eq!(fs::read(quarantine.join("a.png")).unwrap(), b"old");
        assert_eq!(fs::read(dir.path().join("b.jpg")).unwrap(), b"second");
    }

    #[test]
    fn rollback_conflict_preserves_new_destination_and_staged_original() {
        let dir = tempfile::tempdir().unwrap();
        let original = dir.path().join("a.png");
        fs::write(&original, b"old").unwrap();
        let transaction =
            stage_remove_images(dir.path(), &[RemovalTarget::FileName("a.png")]).unwrap();
        let quarantine = transaction.quarantine_directory().unwrap().to_path_buf();
        fs::write(&original, b"new").unwrap();
        let error = transaction.rollback().unwrap_err();
        assert!(error
            .to_string()
            .contains(&quarantine.display().to_string()));
        assert_eq!(fs::read(original).unwrap(), b"new");
        assert_eq!(fs::read(quarantine.join("a.png")).unwrap(), b"old");
    }

    #[test]
    fn commit_removes_staged_images_and_reports_cleanup_failure_separately() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.png"), b"old").unwrap();
        let transaction =
            stage_remove_images(dir.path(), &[RemovalTarget::FileName("a.png")]).unwrap();
        let quarantine = transaction.quarantine_directory().unwrap().to_path_buf();
        assert!(matches!(transaction.commit(), CommitOutcome::Complete));
        assert!(!quarantine.exists());
        assert!(!dir.path().join("a.png").exists());

        fs::write(dir.path().join("b.jpg"), b"backup").unwrap();
        let transaction =
            stage_remove_images(dir.path(), &[RemovalTarget::FileName("b.jpg")]).unwrap();
        let quarantine = transaction.quarantine_directory().unwrap().to_path_buf();
        fs::rename(quarantine.join("b.jpg"), quarantine.join("backup.jpg")).unwrap();
        fs::create_dir(quarantine.join("b.jpg")).unwrap();
        let outcome = transaction.commit();
        match outcome {
            CommitOutcome::CleanupFailed {
                quarantine_directory,
                warnings,
            } => {
                assert_eq!(quarantine_directory, quarantine);
                assert_eq!(warnings[0].path, quarantine.join("b.jpg"));
            }
            CommitOutcome::Complete => panic!("quarantine cleanup should fail"),
        }
        assert!(quarantine.join("b.jpg").is_dir());
        assert_eq!(fs::read(quarantine.join("backup.jpg")).unwrap(), b"backup");
    }

    #[test]
    fn exact_filename_selects_uppercase_extension_without_other_candidates() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("Default%3Aorphan.PNG"), b"chosen").unwrap();
        fs::write(dir.path().join("default%3Aother.png"), b"other group").unwrap();
        fs::write(dir.path().join("Default%3Aprivate-notes.txt"), b"private").unwrap();
        assert!(stage_remove_images(
            dir.path(),
            &[RemovalTarget::FileName("Default%3Aprivate-notes.txt")]
        )
        .is_err());
        let transaction = stage_remove_images(
            dir.path(),
            &[RemovalTarget::FileName("Default%3Aorphan.PNG")],
        )
        .unwrap();
        assert!(matches!(transaction.commit(), CommitOutcome::Complete));
        assert!(!dir.path().join("Default%3Aorphan.PNG").exists());
        assert_eq!(
            fs::read(dir.path().join("default%3Aother.png")).unwrap(),
            b"other group"
        );
        assert_eq!(
            fs::read(dir.path().join("Default%3Aprivate-notes.txt")).unwrap(),
            b"private"
        );
    }

    #[test]
    fn case_aliases_fail_and_roll_back_or_distinct_files_both_stage() {
        let dir = tempfile::tempdir().unwrap();
        let original = dir.path().join("Abc.PNG");
        fs::write(&original, b"keep").unwrap();
        let lower = dir.path().join("abc.png");
        let case_alias = lower.exists();
        if !case_alias {
            fs::write(&lower, b"lower").unwrap();
        }
        let result = stage_remove_images(
            dir.path(),
            &[
                RemovalTarget::Stem {
                    stem: "abc",
                    stem_match: StemMatch::Exact,
                },
                RemovalTarget::FileName("Abc.PNG"),
            ],
        );
        if case_alias {
            assert!(result.is_err());
        } else {
            let staged = result.expect("distinct files must stage");
            let quarantine = staged.quarantine_directory().unwrap();
            assert!(quarantine.join("Abc.PNG").exists());
            assert!(quarantine.join("abc.png").exists());
            staged.rollback().unwrap();
        }
        assert_eq!(fs::read(&original).unwrap(), b"keep");
        assert!(lower.exists());
        assert!(!fs::read_dir(dir.path()).unwrap().any(|entry| entry
            .unwrap()
            .file_name()
            .to_string_lossy()
            .starts_with(".explorer-image-stage-")));
    }

    #[cfg(unix)]
    #[test]
    fn relative_symlink_is_restored_or_unlinked_without_touching_target() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("target.bin");
        fs::write(&target, b"target").unwrap();
        let link = dir.path().join("link.png");
        symlink("target.bin", &link).unwrap();
        let transaction =
            stage_remove_images(dir.path(), &[RemovalTarget::FileName("link.png")]).unwrap();
        let quarantine = transaction.quarantine_directory().unwrap().to_path_buf();
        assert!(fs::symlink_metadata(quarantine.join("link.png"))
            .unwrap()
            .file_type()
            .is_symlink());
        transaction.rollback().unwrap();
        assert_eq!(fs::read(&link).unwrap(), b"target");
        let transaction =
            stage_remove_images(dir.path(), &[RemovalTarget::FileName("link.png")]).unwrap();
        assert!(matches!(transaction.commit(), CommitOutcome::Complete));
        assert!(!link.exists());
        assert_eq!(fs::read(target).unwrap(), b"target");
    }

    #[cfg(unix)]
    #[test]
    fn directory_symlink_rejects_whole_stage_without_moving_regular_image() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("target-dir")).unwrap();
        symlink("target-dir", dir.path().join("bad.png")).unwrap();
        fs::write(dir.path().join("good.png"), b"good").unwrap();
        assert!(stage_remove_images(
            dir.path(),
            &[
                RemovalTarget::FileName("good.png"),
                RemovalTarget::FileName("bad.png"),
            ]
        )
        .is_err());
        assert_eq!(fs::read(dir.path().join("good.png")).unwrap(), b"good");
        assert!(fs::symlink_metadata(dir.path().join("bad.png"))
            .unwrap()
            .file_type()
            .is_symlink());
    }

    #[test]
    fn save_replaces_variants_and_lookup_is_deterministic() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("Cover.PNG"), b"old").unwrap();
        fs::write(dir.path().join("cover.gif"), b"old").unwrap();
        let outcome = save_image(
            dir.path(),
            "cover",
            "JPG",
            b"new",
            StemMatch::AsciiCaseInsensitive,
        )
        .unwrap();
        assert!(outcome.cleanup_warnings.is_empty());
        assert_eq!(outcome.saved_path, dir.path().join("cover.jpg"));
        assert_eq!(fs::read(&outcome.saved_path).unwrap(), b"new");
        assert!(!dir.path().join("Cover.PNG").exists());
        assert!(!dir.path().join("cover.gif").exists());
        assert_eq!(
            find_image(dir.path(), "cover", StemMatch::AsciiCaseInsensitive).unwrap(),
            Some(outcome.saved_path)
        );
    }

    #[test]
    fn exact_lookup_and_extension_priority() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("Name.webp"), b"upper").unwrap();
        fs::write(dir.path().join("name.jpg"), b"lower").unwrap();
        fs::write(dir.path().join("name.png"), b"priority").unwrap();
        assert_eq!(
            find_image(dir.path(), "Name", StemMatch::Exact).unwrap(),
            Some(dir.path().join(if dir.path().join("Name.png").is_file() {
                "Name.png"
            } else {
                "Name.webp"
            }))
        );
        assert_eq!(
            find_image(dir.path(), "name", StemMatch::AsciiCaseInsensitive).unwrap(),
            Some(dir.path().join("name.png"))
        );
        assert_eq!(
            find_image(dir.path().join("missing"), "name", StemMatch::Exact).unwrap(),
            None
        );
    }

    #[test]
    fn cleanup_failure_returns_saved_path_and_warning() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("cover.png")).unwrap();
        let outcome = save_image(dir.path(), "cover", "jpg", b"new", StemMatch::Exact).unwrap();
        assert_eq!(fs::read(&outcome.saved_path).unwrap(), b"new");
        assert_eq!(outcome.cleanup_warnings.len(), 1);
        assert_eq!(
            outcome.cleanup_warnings[0].path,
            dir.path().join("cover.png")
        );
        assert!(!outcome.is_complete());
        match outcome.into_completion() {
            SaveCompletion::CleanupIncomplete {
                saved_path,
                warnings,
            } => {
                assert_eq!(fs::read(saved_path).unwrap(), b"new");
                assert_eq!(warnings.len(), 1);
                assert_eq!(warnings[0].path, dir.path().join("cover.png"));
            }
            SaveCompletion::Complete { .. } => panic!("cleanup warning was lost"),
        }
    }

    #[test]
    fn successful_save_completion_keeps_path() {
        let dir = tempfile::tempdir().unwrap();
        let outcome = save_image(dir.path(), "cover", "png", b"new", StemMatch::Exact).unwrap();
        assert!(outcome.is_complete());
        match outcome.into_completion() {
            SaveCompletion::Complete { saved_path } => {
                assert_eq!(fs::read(saved_path).unwrap(), b"new")
            }
            SaveCompletion::CleanupIncomplete { .. } => panic!("unexpected warning"),
        }
    }

    #[cfg(unix)]
    #[test]
    fn atomic_writer_preserves_symlink_and_permissions() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("target.bin");
        fs::write(&target, b"old").unwrap();
        fs::set_permissions(&target, fs::Permissions::from_mode(0o640)).unwrap();
        let link = dir.path().join("cover.png");
        symlink("target.bin", &link).unwrap();
        let outcome = save_image(dir.path(), "cover", "png", b"new", StemMatch::Exact).unwrap();
        assert!(outcome.cleanup_warnings.is_empty());
        assert!(fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink());
        assert_eq!(fs::read(target).unwrap(), b"new");
        assert_eq!(
            fs::metadata(link).unwrap().permissions().mode() & 0o777,
            0o640
        );
    }
}
