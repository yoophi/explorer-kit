//! JSON I/O extracted from movie-folder-explorer's cache adapter.
//! App schemas and migration policy are deliberately owned by callers.
use serde::{de::DeserializeOwned, Serialize};
use std::{
    fs,
    io::{self, Write},
    path::Path,
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
    let _guard = WRITE_LOCK
        .lock()
        .map_err(|_| io::Error::other("JSON write lock poisoned"))?;
    let (value, result) = update(load_json(path.as_ref())?)?;
    save_unlocked(path.as_ref(), &value)?;
    Ok(result)
}

fn save_unlocked<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    let bytes = serde_json::to_vec_pretty(value).map_err(invalid_data)?;
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
    temporary.write_all(&bytes)?;
    temporary.as_file().sync_all()?;
    temporary.persist(path).map_err(|error| error.error)?;
    Ok(())
}

fn invalid_data(error: serde_json::Error) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, error)
}

#[cfg(test)]
mod tests {
    use super::*;
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
}
