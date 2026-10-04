#[derive(serde::Serialize)]
pub struct ScannedFile {
    pub id: String,
    pub name: String,
    pub path: String,
    pub directory: String,
    pub extension: String,
    pub size_bytes: u64,
    pub modified_ms: Option<u128>,
}

pub fn scan_files(
    root_path: String,
    include_patterns: Vec<String>,
) -> Result<Vec<ScannedFile>, String> {
    let root = std::path::PathBuf::from(root_path);

    if !root.is_dir() {
        return Err("Selected path is not a directory.".to_string());
    }

    let matcher = build_glob_matcher(&include_patterns)?;
    let mut files = Vec::new();
    scan_directory(&root, &root, &matcher, &mut files)?;
    files.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));

    Ok(files)
}

fn scan_directory(
    root: &std::path::Path,
    directory: &std::path::Path,
    matcher: &globset::GlobSet,
    files: &mut Vec<ScannedFile>,
) -> Result<(), String> {
    let entries = std::fs::read_dir(directory)
        .map_err(|error| format!("Failed to read {}: {error}", directory.display()))?;

    for entry in entries {
        let entry = entry
            .map_err(|error| format!("Failed to read entry in {}: {error}", directory.display()))?;
        let path = entry.path();
        let metadata = std::fs::symlink_metadata(&path)
            .map_err(|error| format!("Failed to read metadata for {}: {error}", path.display()))?;

        if metadata.file_type().is_symlink() {
            continue;
        }

        if metadata.is_dir() {
            scan_directory(root, &path, matcher, files)?;
            continue;
        }

        if !metadata.is_file() || !matches_include_patterns(root, &path, matcher) {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string();
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_lowercase();
        let directory = path
            .parent()
            .map(|value| value.display().to_string())
            .unwrap_or_default();
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis());
        let path_string = path.display().to_string();

        files.push(ScannedFile {
            id: path_string.clone(),
            name,
            path: path_string,
            directory,
            extension,
            size_bytes: metadata.len(),
            modified_ms,
        });
    }

    Ok(())
}

fn build_glob_matcher(patterns: &[String]) -> Result<globset::GlobSet, String> {
    let mut builder = globset::GlobSetBuilder::new();
    let mut added = false;

    for pattern in patterns {
        let pattern = normalize_glob_pattern(pattern);
        if pattern.is_empty() {
            continue;
        }

        let glob = globset::GlobBuilder::new(&pattern)
            .case_insensitive(true)
            .build()
            .map_err(|error| format!("Invalid glob pattern `{pattern}`: {error}"))?;
        builder.add(glob);
        added = true;
    }

    if !added {
        let glob = globset::GlobBuilder::new("**/*")
            .case_insensitive(true)
            .build()
            .map_err(|error| format!("Invalid default glob pattern: {error}"))?;
        builder.add(glob);
    }

    builder
        .build()
        .map_err(|error| format!("Failed to build glob matcher: {error}"))
}

fn matches_include_patterns(
    root: &std::path::Path,
    path: &std::path::Path,
    matcher: &globset::GlobSet,
) -> bool {
    let relative_path = path.strip_prefix(root).unwrap_or(path);
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();

    matcher.is_match(relative_path) || matcher.is_match(file_name)
}

fn normalize_glob_pattern(pattern: &str) -> String {
    pattern
        .trim()
        .replace('\\', "/")
        .replace('|', ",")
        .replace(",}", "}")
}
