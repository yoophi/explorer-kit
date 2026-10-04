use explorer_json_store::{document_version, DocumentVersion};
use explorer_settings_store::{JsonSettingsStore, UpdateAction};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, io, sync::Arc, thread};
use tempfile::tempdir;

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct Settings {
    version: u64,
    theme: String,
}

fn decode_current(document: Value) -> io::Result<Settings> {
    if document_version(&document, 2, &[1])? != DocumentVersion::Current {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "migration required",
        ));
    }
    serde_json::from_value(document)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

#[test]
fn absent_load_uses_default_without_creating_a_file() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = temporary.path().join("missing-parent/settings.json");
    let store = JsonSettingsStore::<Settings>::new(&path);
    assert_eq!(store.path(), path);
    let settings = store.load(|document| {
        assert!(document.is_none());
        Ok(UpdateAction::Unchanged(Settings {
            version: 2,
            theme: "system".into(),
        }))
    })?;
    assert_eq!(settings.theme, "system");
    assert!(!path.exists());
    assert!(!path.parent().unwrap().exists());
    Ok(())
}

#[test]
fn current_read_and_noop_update_leave_readonly_bytes_untouched() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = temporary.path().join("settings.json");
    let bytes = b"{\"version\":2, \"theme\":\"dark\"}\n";
    fs::write(&path, bytes)?;
    let mut permissions = fs::metadata(&path)?.permissions();
    permissions.set_readonly(true);
    fs::set_permissions(&path, permissions)?;
    let store = JsonSettingsStore::<Settings>::new(&path);
    let settings =
        store.load(|document| Ok(UpdateAction::Unchanged(decode_current(document.unwrap())?)))?;
    assert_eq!(settings.theme, "dark");
    let (settings, changed) = store.update(|document| {
        Ok(UpdateAction::Unchanged((
            decode_current(document.unwrap())?,
            false,
        )))
    })?;
    assert_eq!(settings.theme, "dark");
    assert!(!changed);
    assert_eq!(fs::read(&path)?, bytes);
    Ok(())
}

#[test]
fn future_and_invalid_versions_fail_without_rewriting() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = temporary.path().join("settings.json");
    let store = JsonSettingsStore::<Settings>::new(&path);
    for bytes in [
        b"{\"version\":3,\"theme\":\"future\"}".as_slice(),
        b"{\"version\":\"2\",\"theme\":\"invalid\"}".as_slice(),
        b"{\"version\":2,\"theme\":9}".as_slice(),
        b"{broken".as_slice(),
    ] {
        fs::write(&path, bytes)?;
        assert!(store
            .load(|document| Ok(UpdateAction::Unchanged(decode_current(document.unwrap())?)))
            .is_err());
        assert!(store
            .update(|document| {
                let settings = decode_current(document.unwrap())?;
                Ok(UpdateAction::Unchanged((settings, ())))
            })
            .is_err());
        assert_eq!(fs::read(&path)?, bytes);
    }
    Ok(())
}

#[test]
fn failed_write_preserves_the_readonly_document() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = temporary.path().join("settings.json");
    let bytes = b"{\"version\":2,\"theme\":\"light\"}";
    fs::write(&path, bytes)?;
    let mut permissions = fs::metadata(&path)?.permissions();
    permissions.set_readonly(true);
    fs::set_permissions(&path, permissions)?;
    let store = JsonSettingsStore::<Settings>::new(&path);
    let error = store
        .update(|document| {
            let mut settings = decode_current(document.unwrap())?;
            settings.theme = "dark".into();
            Ok(UpdateAction::Write {
                value: serde_json::to_value(&settings).unwrap(),
                result: (settings, ()),
            })
        })
        .err()
        .expect("read-only write must fail");
    assert_eq!(error.kind(), io::ErrorKind::PermissionDenied);
    assert_eq!(fs::read(&path)?, bytes);
    Ok(())
}

#[test]
fn app_callback_can_migrate_legacy_and_preserve_fields() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = temporary.path().join("settings.json");
    fs::write(
        &path,
        br#"{"version":1,"theme":"dark","custom":{"keep":true}}"#,
    )?;
    let store = JsonSettingsStore::<Settings>::new(&path);
    let settings = store.load(|document| {
        let mut document = document.unwrap();
        assert_eq!(
            document_version(&document, 2, &[1])?,
            DocumentVersion::Legacy
        );
        document["version"] = json!(2);
        let settings = Settings {
            version: 2,
            theme: document["theme"].as_str().unwrap().into(),
        };
        Ok(UpdateAction::Write {
            value: document,
            result: settings,
        })
    })?;
    assert_eq!(settings.theme, "dark");
    let migrated: Value = serde_json::from_slice(&fs::read(&path)?)?;
    assert_eq!(
        migrated,
        json!({"version":2,"theme":"dark","custom":{"keep":true}})
    );
    Ok(())
}

#[test]
fn update_first_migrates_then_noop_update_keeps_bytes() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = temporary.path().join("settings.json");
    fs::write(&path, br#"{"version":1,"theme":"dark","custom":"keep"}"#)?;
    let store = JsonSettingsStore::<Settings>::new(&path);

    let update_theme = |desired: &str| {
        store.update(|document| {
            let original = document.unwrap();
            let mut next = original.clone();
            match document_version(&next, 2, &[1])? {
                DocumentVersion::Legacy => next["version"] = json!(2),
                DocumentVersion::Current => {}
            }
            let mut settings = decode_current(next.clone())?;
            settings.theme = desired.into();
            next["theme"] = json!(desired);
            let result = (settings, ());
            if next == original {
                Ok(UpdateAction::Unchanged(result))
            } else {
                Ok(UpdateAction::Write {
                    value: next,
                    result,
                })
            }
        })
    };

    let (settings, ()) = update_theme("dark")?;
    assert_eq!(settings.version, 2);
    let migrated = fs::read(&path)?;
    assert_eq!(
        serde_json::from_slice::<Value>(&migrated)?["custom"],
        "keep"
    );
    update_theme("dark")?;
    assert_eq!(fs::read(&path)?, migrated);
    Ok(())
}

#[test]
fn direct_json_updates_and_settings_updates_share_the_lock() -> io::Result<()> {
    let temporary = tempdir()?;
    let path = Arc::new(temporary.path().join("settings.json"));
    fs::write(&*path, b"{\"count\":0}")?;
    let direct_path = Arc::clone(&path);
    let direct = thread::spawn(move || -> io::Result<()> {
        for _ in 0..50 {
            explorer_json_store::update_json_if_changed::<Value, _>(&*direct_path, |document| {
                let mut document = document.unwrap();
                document["count"] = json!(document["count"].as_u64().unwrap() + 1);
                Ok(UpdateAction::Write {
                    value: document,
                    result: (),
                })
            })?;
        }
        Ok(())
    });
    let store = JsonSettingsStore::<u64>::new(&*path);
    for _ in 0..50 {
        store.update(|document| {
            let mut document = document.unwrap();
            let count = document["count"].as_u64().unwrap() + 1;
            document["count"] = json!(count);
            Ok(UpdateAction::Write {
                value: document,
                result: (count, ()),
            })
        })?;
    }
    direct.join().expect("thread panicked")?;
    let document: Value = serde_json::from_slice(&fs::read(&*path)?)?;
    assert_eq!(document["count"], 100);
    Ok(())
}
