use serde::Serialize;
use std::{fs, time::UNIX_EPOCH};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_ms: Option<u64>,
}

pub fn list_dir(path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    list_dir_stream(path, show_hidden, &|| false, &mut |entry| {
        entries.push(entry);
        Ok(())
    })?;
    entries.sort_by_cached_key(|e| (!e.is_dir, e.name.to_lowercase()));
    Ok(entries)
}

/// Streams an unsorted, non-recursive listing. Unreadable entries are skipped,
/// matching list_dir. Directory symlinks remain browsable; no recursion occurs.
/// Callback errors and cancellation stop traversal immediately.
pub fn list_dir_stream(
    path: String,
    show_hidden: bool,
    cancelled: &dyn Fn() -> bool,
    on_entry: &mut dyn FnMut(FileEntry) -> Result<(), String>,
) -> Result<(), String> {
    crate::check_cancelled(cancelled)?;
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    for entry in entries {
        crate::check_cancelled(cancelled)?;
        let Ok(entry) = entry else { continue };
        let name = entry.file_name().to_string_lossy().into_owned();
        if !show_hidden && name.starts_with('.') {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        let resolved = if metadata.is_symlink() {
            let Ok(target) = fs::metadata(entry.path()) else {
                continue;
            };
            target
        } else {
            metadata
        };
        crate::check_cancelled(cancelled)?;
        on_entry(FileEntry {
            path: entry.path().to_string_lossy().into_owned(),
            is_dir: resolved.is_dir(),
            size: if resolved.is_dir() { 0 } else { resolved.len() },
            modified_ms: resolved
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64),
            name,
        })?;
    }
    crate::check_cancelled(cancelled)
}
