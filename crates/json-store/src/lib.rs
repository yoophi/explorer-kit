//! JSON I/O extracted from movie-folder-explorer's cache adapter.
//! App schemas and migration policy are deliberately owned by callers.
use serde::{de::DeserializeOwned, Serialize};
use std::{
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};

// Serializes in-process writes and read-modify-write operations, including separate store instances.
static WRITE_LOCK: Mutex<()> = Mutex::new(());

pub fn load_json<T: DeserializeOwned>(path: impl AsRef<Path>) -> io::Result<Option<T>> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(invalid_data)
}

pub fn save_json<T: Serialize>(path: impl AsRef<Path>, value: &T) -> io::Result<()> {
    let _guard = WRITE_LOCK
        .lock()
        .map_err(|_| io::Error::other("JSON write lock poisoned"))?;
    save_unlocked(path.as_ref(), value)
}

/// Atomic only within this process. All cooperating mutations must use this function.
/// A migration can be performed in the callback; unknown versions should be rejected there.
pub fn update_json<T: DeserializeOwned + Serialize, R>(
    path: impl AsRef<Path>,
    update: impl FnOnce(Option<T>) -> io::Result<(T, R)>,
) -> io::Result<R> {
    update_json_if_changed(path, |value| {
        let (value, result) = update(value)?;
        Ok(UpdateAction::Write { value, result })
    })
}

/// A transaction may inspect a document without rewriting it.
pub enum UpdateAction<T, R> {
    Unchanged(R),
    Write { value: T, result: R },
}

/// Serializes the complete read/decision/write operation within this process.
/// Unchanged does not create a missing file or require write permission.
/// The callback must not call another JSON save/update operation (the lock is not reentrant).
pub fn update_json_if_changed<T: DeserializeOwned + Serialize, R>(
    path: impl AsRef<Path>,
    update: impl FnOnce(Option<T>) -> io::Result<UpdateAction<T, R>>,
) -> io::Result<R> {
    let _guard = WRITE_LOCK
        .lock()
        .map_err(|_| io::Error::other("JSON write lock poisoned"))?;
    match update(load_json(path.as_ref())?)? {
        UpdateAction::Unchanged(result) => Ok(result),
        UpdateAction::Write { value, result } => {
            save_unlocked(path.as_ref(), &value)?;
            Ok(result)
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum DocumentVersion {
    Legacy,
    Current,
}

/// Only an absent version or an explicitly allowed legacy version is legacy.
/// The application must still validate the corresponding schema before writing.
pub fn document_version(
    value: &serde_json::Value,
    current: u64,
    legacy: &[u64],
) -> io::Result<DocumentVersion> {
    if !value.is_object() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "JSON document must be an object",
        ));
    }
    match value.get("version") {
        None => Ok(DocumentVersion::Legacy),
        Some(version) if version.as_u64() == Some(current) => Ok(DocumentVersion::Current),
        Some(version) if version.as_u64().is_some_and(|v| legacy.contains(&v)) => {
            Ok(DocumentVersion::Legacy)
        }
        Some(version) => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Unsupported JSON version: {version}"),
        )),
    }
}

fn save_unlocked<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    let bytes = serde_json::to_vec_pretty(value).map_err(invalid_data)?;
    write_bytes_atomic(path, &bytes)
}

/// Atomically replaces bytes, following destination symlinks and preserving permissions.
/// This primitive has no transaction lock; callers serialize read/modify/write or cleanup.
/// As with JSON saves, parent write permission is required and inode/xattrs are not preserved.
pub fn write_bytes_atomic(path: impl AsRef<Path>, bytes: &[u8]) -> io::Result<()> {
    let path = path.as_ref();
    // fs::write followed existing links. Keep that contract while replacing the
    // target atomically rather than replacing the link itself.
    let destination = resolve_destination(path)?;
    let path = destination.as_path();
    let permissions = match fs::metadata(path) {
        Ok(metadata) => {
            let permissions = metadata.permissions();
            if permissions.readonly() {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "JSON file is read-only",
                ));
            }
            Some(permissions)
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => None,
        Err(error) => return Err(error),
    };
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
    temporary.write_all(bytes)?;
    if let Some(permissions) = permissions {
        temporary.as_file().set_permissions(permissions)?;
    }
    temporary.as_file().sync_all()?;
    temporary.persist(path).map_err(|error| error.error)?;
    Ok(())
}

fn resolve_destination(path: &Path) -> io::Result<PathBuf> {
    let mut target = path.to_path_buf();
    for _ in 0..64 {
        match fs::symlink_metadata(&target) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                let link = fs::read_link(&target)?;
                target = if link.is_absolute() {
                    link
                } else {
                    target.parent().unwrap_or(Path::new(".")).join(link)
                };
            }
            Ok(_) => return Ok(target),
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(target),
            Err(error) => return Err(error),
        }
    }
    Err(io::Error::new(
        io::ErrorKind::InvalidInput,
        "Too many JSON symlinks",
    ))
}

fn invalid_data(error: serde_json::Error) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, error)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unchanged_missing_document_does_not_create_directories() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("absent/settings.json");
        let result = update_json_if_changed::<u32, _>(&path, |value| {
            assert!(value.is_none());
            Ok(UpdateAction::Unchanged(42))
        })
        .unwrap();
        assert_eq!(result, 42);
        assert!(!path.parent().unwrap().exists());
    }

    #[cfg(unix)]
    #[test]
    fn unchanged_read_only_document_preserves_bytes_and_inode() {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(&path, " 42\n").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o444)).unwrap();
        let inode = fs::metadata(&path).unwrap().ino();
        assert_eq!(
            update_json_if_changed::<u32, _>(&path, |value| {
                Ok(UpdateAction::Unchanged(value.unwrap()))
            })
            .unwrap(),
            42
        );
        assert_eq!(fs::read_to_string(&path).unwrap(), " 42\n");
        assert_eq!(fs::metadata(&path).unwrap().ino(), inode);
    }

    #[test]
    fn unsupported_or_malformed_versions_never_overwrite_documents() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        for version in [
            serde_json::json!(3),
            serde_json::json!(null),
            serde_json::json!("2"),
            serde_json::json!(-1),
        ] {
            let original = serde_json::json!({"version": version, "keep": "data"}).to_string();
            fs::write(&path, &original).unwrap();
            let result = update_json_if_changed::<serde_json::Value, ()>(&path, |value| {
                let value = value.unwrap();
                document_version(&value, 2, &[1])?;
                Ok(UpdateAction::Write {
                    value: serde_json::json!({}),
                    result: (),
                })
            });
            assert_eq!(result.unwrap_err().kind(), io::ErrorKind::InvalidData);
            assert_eq!(fs::read_to_string(&path).unwrap(), original);
        }
        assert_eq!(
            document_version(&serde_json::json!({}), 2, &[1]).unwrap(),
            DocumentVersion::Legacy
        );
        assert_eq!(
            document_version(&serde_json::json!({"version":1}), 2, &[1]).unwrap(),
            DocumentVersion::Legacy
        );
        assert_eq!(
            document_version(&serde_json::json!({"version":2}), 2, &[1]).unwrap(),
            DocumentVersion::Current
        );
        assert!(document_version(&serde_json::json!([]), 2, &[1]).is_err());
    }
    #[test]
    fn round_trip_and_corruption_are_distinct_from_missing() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested/settings.json");
        assert_eq!(load_json::<Vec<String>>(&path).unwrap(), None);
        save_json(&path, &vec!["한글"]).unwrap();
        assert_eq!(
            load_json::<Vec<String>>(&path).unwrap().unwrap(),
            vec!["한글"]
        );
        fs::write(&path, "{broken").unwrap();
        assert!(load_json::<Vec<String>>(&path).is_err());
    }
    #[test]
    fn concurrent_updates_do_not_lose_changes() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("counter.json");
        std::thread::scope(|scope| {
            for _ in 0..8 {
                let path = &path;
                scope.spawn(move || {
                    for _ in 0..20 {
                        update_json::<u32, _>(path, |value| Ok((value.unwrap_or(0) + 1, ())))
                            .unwrap();
                    }
                });
            }
        });
        assert_eq!(load_json::<u32>(path).unwrap(), Some(160));
    }
    #[test]
    fn failed_update_preserves_existing_data() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        save_json(&path, &42).unwrap();
        assert!(
            update_json::<u32, ()>(&path, |_| Err(io::Error::other("unsupported version")))
                .is_err()
        );
        assert_eq!(load_json::<u32>(path).unwrap(), Some(42));
    }

    #[cfg(unix)]
    #[test]
    fn update_preserves_relative_symlink_chain_and_target_permissions() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("actual.json");
        fs::write(&target, "1").unwrap();
        fs::set_permissions(&target, fs::Permissions::from_mode(0o640)).unwrap();
        symlink("actual.json", dir.path().join("middle.json")).unwrap();
        let link = dir.path().join("settings.json");
        symlink("middle.json", &link).unwrap();
        update_json::<u32, _>(&link, |value| Ok((value.unwrap() + 1, ()))).unwrap();
        assert!(fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink());
        assert!(fs::symlink_metadata(dir.path().join("middle.json"))
            .unwrap()
            .file_type()
            .is_symlink());
        assert_eq!(load_json::<u32>(&target).unwrap(), Some(2));
        assert_eq!(
            fs::metadata(target).unwrap().permissions().mode() & 0o777,
            0o640
        );
    }

    #[cfg(unix)]
    #[test]
    fn save_creates_dangling_link_target_without_replacing_link() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let link = dir.path().join("settings.json");
        symlink("new.json", &link).unwrap();
        save_json(&link, &42).unwrap();
        assert!(fs::symlink_metadata(link).unwrap().file_type().is_symlink());
        assert_eq!(
            load_json::<u32>(dir.path().join("new.json")).unwrap(),
            Some(42)
        );
    }

    #[cfg(unix)]
    #[test]
    fn symlink_cycle_is_rejected_without_replacing_links() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let link = dir.path().join("loop.json");
        symlink("loop.json", &link).unwrap();
        assert!(save_json(&link, &42).is_err());
        assert!(fs::symlink_metadata(link).unwrap().file_type().is_symlink());
    }

    #[cfg(unix)]
    #[test]
    fn read_only_file_is_not_replaced() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(&path, "1").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o440)).unwrap();
        assert_eq!(
            save_json(&path, &2).unwrap_err().kind(),
            io::ErrorKind::PermissionDenied
        );
        assert_eq!(fs::read_to_string(path).unwrap(), "1");
    }
}
