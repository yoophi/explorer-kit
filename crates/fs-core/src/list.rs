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
    let mut entries: Vec<FileEntry> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if !show_hidden && name.starts_with('.') {
                return None;
            }
            // Symlink-aware: a symlink to a directory is browsable as one.
            let metadata = entry.metadata().ok()?;
            let resolved = if metadata.is_symlink() {
                fs::metadata(entry.path()).ok()?
            } else {
                metadata
            };
            Some(FileEntry {
                path: entry.path().to_string_lossy().into_owned(),
                is_dir: resolved.is_dir(),
                size: if resolved.is_dir() { 0 } else { resolved.len() },
                modified_ms: resolved
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64),
                name,
            })
        })
        .collect();

    entries.sort_by_cached_key(|e| (!e.is_dir, e.name.to_lowercase()));
    Ok(entries)
}
