use explorer_fs_core::{list_dir, scan_files};
use std::fs;

#[test]
fn listing_is_shallow_sorted_and_respects_hidden_setting() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("z-folder")).unwrap();
    fs::write(dir.path().join("a.txt"), "abc").unwrap();
    fs::write(dir.path().join(".hidden"), "").unwrap();
    fs::write(dir.path().join("z-folder/deep.txt"), "").unwrap();
    let path = dir.path().display().to_string();
    let entries = list_dir(path.clone(), false).unwrap();
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0].name, "z-folder");
    assert_eq!(entries[1].size, 3);
    assert_eq!(list_dir(path, true).unwrap().len(), 3);
}

#[test]
fn scans_nested_files_with_case_insensitive_globs() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("nested")).unwrap();
    fs::write(dir.path().join("nested/Video.MP4"), "movie").unwrap();
    fs::write(dir.path().join("notes.txt"), "notes").unwrap();
    let path = dir.path().display().to_string();
    let files = scan_files(path.clone(), vec!["**/*.{mp4|mkv}".into()]).unwrap();
    assert_eq!(files.len(), 1);
    assert_eq!(files[0].extension, "mp4");
    assert_eq!(scan_files(path.clone(), vec![]).unwrap().len(), 2);
    assert!(scan_files(path, vec!["[invalid".into()]).is_err());
}

#[cfg(unix)]
#[test]
fn recursive_scan_skips_symlinks_but_listing_allows_directory_links() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("nested")).unwrap();
    fs::write(dir.path().join("nested/a.txt"), "a").unwrap();
    std::os::unix::fs::symlink(dir.path(), dir.path().join("nested/cycle")).unwrap();
    let path = dir.path().display().to_string();
    assert_eq!(scan_files(path, vec![]).unwrap().len(), 1);
    assert!(
        list_dir(dir.path().join("nested").display().to_string(), false)
            .unwrap()
            .iter()
            .any(|entry| entry.name == "cycle" && entry.is_dir)
    );
}
