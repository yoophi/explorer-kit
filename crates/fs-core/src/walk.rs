//! App-neutral directory traversal. Callers own inspection, DTOs and cancellation policy.
use std::collections::VecDeque;
use std::fs;
use std::io;
use std::path::Path;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WalkPolicy {
    /// Folder: sorted depth-first, root included, unreadable entry ignored.
    FolderDfs,
    /// Repository: breadth-first, root at depth zero, permission-denied directories skipped.
    RepositoryBfs { max_depth: usize },
}

#[derive(Debug)]
pub enum WalkError<E> {
    Cancelled,
    Io(io::Error),
    Callback(E),
}

/// Visits the root and each non-symlink child directory. `skip_directory` applies to
/// children before enqueueing, never to the root. Callback errors stop traversal.
/// A caller can map Cancelled to success (Folder) or Interrupted (Repository).
pub fn walk_directories<E>(
    root: &Path,
    policy: WalkPolicy,
    cancelled: &dyn Fn() -> bool,
    skip_directory: &dyn Fn(&Path) -> bool,
    on_directory: &mut dyn FnMut(&Path, usize) -> Result<(), E>,
) -> Result<(), WalkError<E>> {
    let mut pending = VecDeque::from([(root.to_path_buf(), 0_usize)]);
    while let Some((path, depth)) = pending.pop_front() {
        check_cancelled(cancelled)?;
        match policy {
            WalkPolicy::FolderDfs => {
                // Folder reads the directory before it emits its folder DTO.
                let directory = fs::read_dir(&path).map_err(WalkError::Io)?;
                let mut entries = Vec::new();
                for entry in directory {
                    check_cancelled(cancelled)?;
                    if let Ok(entry) = entry {
                        entries.push(entry);
                    }
                }
                check_cancelled(cancelled)?;
                on_directory(&path, depth).map_err(WalkError::Callback)?;
                let mut children = Vec::new();
                for entry in entries {
                    check_cancelled(cancelled)?;
                    if entry.file_type().is_ok_and(|kind| kind.is_dir()) {
                        let child = entry.path();
                        if !skip_directory(&child) {
                            children.push(child);
                        }
                    }
                }
                children.sort_by_cached_key(|path| {
                    path.file_name()
                        .map(|name| name.to_string_lossy().to_lowercase())
                });
                for child in children.into_iter().rev() {
                    pending.push_front((child, depth + 1));
                }
            }
            WalkPolicy::RepositoryBfs { max_depth } => {
                on_directory(&path, depth).map_err(WalkError::Callback)?;
                if depth >= max_depth {
                    continue;
                }
                let entries = match fs::read_dir(&path) {
                    Ok(entries) => entries,
                    Err(error) if error.kind() == io::ErrorKind::PermissionDenied => continue,
                    Err(error) => return Err(WalkError::Io(error)),
                };
                for entry in entries {
                    check_cancelled(cancelled)?;
                    let entry = entry.map_err(WalkError::Io)?;
                    if !entry.file_type().map_err(WalkError::Io)?.is_dir() {
                        continue;
                    }
                    let child = entry.path();
                    if !skip_directory(&child) {
                        pending.push_back((child, depth + 1));
                    }
                }
            }
        }
    }
    Ok(())
}

fn check_cancelled<E>(cancelled: &dyn Fn() -> bool) -> Result<(), WalkError<E>> {
    if cancelled() {
        Err(WalkError::Cancelled)
    } else {
        Ok(())
    }
}
