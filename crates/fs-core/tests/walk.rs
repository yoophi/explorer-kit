use explorer_fs_core::{walk_directories, WalkError, WalkPolicy};
use std::cell::Cell;
use std::fs;
use std::path::Path;

fn name(path: &Path) -> String {
    path.file_name().unwrap().to_string_lossy().to_string()
}

#[test]
fn folder_is_sorted_dfs_and_includes_root_without_following_links() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("root");
    for child in ["b/z", "A/x", "c/y"] {
        fs::create_dir_all(root.join(child)).unwrap();
    }
    #[cfg(unix)]
    std::os::unix::fs::symlink(root.join("A"), root.join("link")).unwrap();
    let mut seen = Vec::new();
    walk_directories(
        &root,
        WalkPolicy::FolderDfs,
        &|| false,
        &|_| false,
        &mut |path, depth| {
            seen.push((name(path), depth));
            Ok::<_, ()>(())
        },
    )
    .unwrap();
    assert_eq!(seen[0], ("root".into(), 0));
    assert_eq!(seen[1].0, "A");
    assert_eq!(seen[2], ("x".into(), 2));
    assert_eq!(seen[3].0, "b");
    assert_eq!(seen[4], ("z".into(), 2));
    assert_eq!(seen[5].0, "c");
    assert_eq!(seen[6], ("y".into(), 2));
    assert_eq!(seen.len(), 7);
}

#[test]
fn repository_is_bfs_depth_limited_and_skips_selected_children() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("root");
    for child in ["first/deep", "second/deep", "skip/deep"] {
        fs::create_dir_all(root.join(child)).unwrap();
    }
    let mut seen = Vec::new();
    walk_directories(
        &root,
        WalkPolicy::RepositoryBfs { max_depth: 1 },
        &|| false,
        &|path| name(path) == "skip",
        &mut |path, depth| {
            seen.push((name(path), depth));
            Ok::<_, ()>(())
        },
    )
    .unwrap();
    assert_eq!(seen[0], ("root".into(), 0));
    assert_eq!(seen.len(), 3);
    assert!(seen[1..].iter().all(|(_, depth)| *depth == 1));
    assert!(!seen
        .iter()
        .any(|(name, _)| name == "skip" || name == "deep"));
}

#[test]
fn cancellation_and_callback_errors_stop_traversal() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("child")).unwrap();
    let cancelled = Cell::new(false);
    let mut seen = 0;
    let result = walk_directories(
        dir.path(),
        WalkPolicy::FolderDfs,
        &|| cancelled.get(),
        &|_| false,
        &mut |_, _| {
            seen += 1;
            cancelled.set(true);
            Ok::<_, &'static str>(())
        },
    );
    assert!(matches!(result, Err(WalkError::Cancelled)));
    assert_eq!(seen, 1);
    let result = walk_directories(
        dir.path(),
        WalkPolicy::RepositoryBfs { max_depth: 2 },
        &|| false,
        &|_| false,
        &mut |_, _| Err::<(), _>("sink failed"),
    );
    assert!(matches!(result, Err(WalkError::Callback("sink failed"))));
}

#[test]
fn folder_read_error_precedes_visit_but_repository_visits_before_read_error() {
    let missing = Path::new("/nonexistent/explorer-walker-review-fixture");
    let mut seen = 0;
    let folder = walk_directories(
        missing,
        WalkPolicy::FolderDfs,
        &|| false,
        &|_| false,
        &mut |_, _| {
            seen += 1;
            Ok::<_, ()>(())
        },
    );
    assert!(matches!(folder, Err(WalkError::Io(_))));
    assert_eq!(seen, 0);
    let repository = walk_directories(
        missing,
        WalkPolicy::RepositoryBfs { max_depth: 1 },
        &|| false,
        &|_| false,
        &mut |_, _| {
            seen += 1;
            Ok::<_, ()>(())
        },
    );
    assert!(matches!(repository, Err(WalkError::Io(_))));
    assert_eq!(seen, 1);
}

#[cfg(unix)]
#[test]
fn permission_denied_child_is_skipped_only_by_repository_policy() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let blocked = dir.path().join("blocked");
    fs::create_dir(&blocked).unwrap();
    fs::create_dir(dir.path().join("open")).unwrap();
    fs::set_permissions(&blocked, fs::Permissions::from_mode(0o000)).unwrap();
    if fs::read_dir(&blocked).is_ok() {
        fs::set_permissions(&blocked, fs::Permissions::from_mode(0o700)).unwrap();
        return; // Privileged test runner bypasses mode bits.
    }
    let mut folder_seen = Vec::new();
    let folder = walk_directories(
        dir.path(),
        WalkPolicy::FolderDfs,
        &|| false,
        &|_| false,
        &mut |path, _| {
            folder_seen.push(name(path));
            Ok::<_, ()>(())
        },
    );
    assert!(matches!(folder, Err(WalkError::Io(_))));
    let mut repository_seen = Vec::new();
    walk_directories(
        dir.path(),
        WalkPolicy::RepositoryBfs { max_depth: 2 },
        &|| false,
        &|_| false,
        &mut |path, _| {
            repository_seen.push(name(path));
            Ok::<_, ()>(())
        },
    )
    .unwrap();
    assert!(repository_seen.contains(&"blocked".to_string()));
    assert!(repository_seen.contains(&"open".to_string()));
    fs::set_permissions(&blocked, fs::Permissions::from_mode(0o700)).unwrap();
}
