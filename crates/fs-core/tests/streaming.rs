use explorer_fs_core::{list_dir, list_dir_stream, scan_files, scan_files_stream};
use std::{cell::Cell, fs};

#[test]
fn streaming_scan_matches_collected_results_and_stops_after_first_callback() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("nested")).unwrap();
    fs::write(dir.path().join("A.MP4"), "a").unwrap();
    fs::write(dir.path().join("nested/b.mp4"), "b").unwrap();
    fs::write(dir.path().join("ignored.txt"), "c").unwrap();
    let root = dir.path().display().to_string();
    let mut names = Vec::new();
    scan_files_stream(root.clone(), vec!["*.mp4".into()], &|| false, &mut |file| {
        names.push(file.name);
        Ok(())
    })
    .unwrap();
    names.sort();
    let collected = scan_files(root.clone(), vec!["*.mp4".into()]).unwrap();
    assert_eq!(
        names,
        collected
            .iter()
            .map(|file| file.name.clone())
            .collect::<Vec<_>>()
    );
    let cancelled = Cell::new(false);
    let mut count = 0;
    let result = scan_files_stream(root, vec![], &|| cancelled.get(), &mut |_| {
        count += 1;
        cancelled.set(true);
        Ok(())
    });
    assert!(result.unwrap_err().contains("cancelled"));
    assert_eq!(count, 1);
}

#[test]
fn listing_stream_preserves_hidden_filter_and_propagates_sink_failure() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("folder")).unwrap();
    fs::write(dir.path().join("file"), "x").unwrap();
    fs::write(dir.path().join(".hidden"), "x").unwrap();
    let root = dir.path().display().to_string();
    for hidden in [true, false] {
        let mut streamed = Vec::new();
        list_dir_stream(root.clone(), hidden, &|| false, &mut |entry| {
            streamed.push((entry.name, entry.is_dir, entry.size));
            Ok(())
        })
        .unwrap();
        streamed.sort();
        let mut collected = list_dir(root.clone(), hidden)
            .unwrap()
            .into_iter()
            .map(|entry| (entry.name, entry.is_dir, entry.size))
            .collect::<Vec<_>>();
        collected.sort();
        assert_eq!(streamed, collected);
    }
    let mut count = 0;
    let result = list_dir_stream(root, true, &|| false, &mut |_| {
        count += 1;
        Err("sink closed".into())
    });
    assert_eq!(result, Err("sink closed".into()));
    assert_eq!(count, 1);
}

#[test]
fn listing_cancels_after_first_delivery_and_pre_cancel_does_not_touch_path() {
    let dir = tempfile::tempdir().unwrap();
    for i in 0..3 {
        fs::write(dir.path().join(i.to_string()), "x").unwrap();
    }
    let cancelled = Cell::new(false);
    let mut count = 0;
    let result = list_dir_stream(
        dir.path().display().to_string(),
        true,
        &|| cancelled.get(),
        &mut |_| {
            count += 1;
            cancelled.set(true);
            Ok(())
        },
    );
    assert!(result.unwrap_err().contains("cancelled"));
    assert_eq!(count, 1);
    assert!(scan_files_stream(
        "/not/a/real/path".into(),
        vec![],
        &|| true,
        &mut |_| panic!("late item")
    )
    .unwrap_err()
    .contains("cancelled"));
    assert!(
        list_dir_stream("/not/a/real/path".into(), false, &|| true, &mut |_| panic!(
            "late item"
        ))
        .unwrap_err()
        .contains("cancelled")
    );
}

#[test]
fn invalid_root_glob_and_scan_sink_errors_remain_errors() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().display().to_string();
    assert!(
        scan_files_stream(root.clone(), vec!["[".into()], &|| false, &mut |_| panic!(
            "invalid glob emitted"
        ))
        .unwrap_err()
        .contains("Invalid glob")
    );
    assert!(list_dir_stream(
        dir.path().join("missing").display().to_string(),
        true,
        &|| false,
        &mut |_| panic!("missing directory emitted")
    )
    .is_err());
    fs::write(dir.path().join("one.mp4"), "x").unwrap();
    assert_eq!(
        scan_files_stream(root, vec![], &|| false, &mut |_| Err("sink failure".into())),
        Err("sink failure".into())
    );
}
