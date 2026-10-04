//! Path-owning JSON settings transactions without an application schema.
//! Decoding, validation, migration, and defaults belong to the caller.

use serde_json::Value;
use std::{
    io,
    marker::PhantomData,
    path::{Path, PathBuf},
};

pub use explorer_json_store::UpdateAction;

/// A path-owning settings store whose policies produce settings of type `T`.
///
/// Each operation holds the same process-local lock as `explorer-json-store`'s
/// save and update functions across the complete read/decision/write cycle.
/// Callbacks must not call another JSON save/update operation: the lock is not
/// reentrant. The lock does not serialize separate processes.
pub struct JsonSettingsStore<T> {
    path: PathBuf,
    settings: PhantomData<fn() -> T>,
}

impl<T> JsonSettingsStore<T> {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            path: path.into(),
            settings: PhantomData,
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Loads settings under the JSON transaction lock.
    ///
    /// The callback owns decoding, validation, migration, and defaults. It
    /// receives `None` only when the file is absent. Return `Unchanged` for a
    /// normal read, including an absent file with an in-memory default. Return
    /// `Write` only when migration or normalization must persist a new document.
    pub fn load(
        &self,
        policy: impl FnOnce(Option<Value>) -> io::Result<UpdateAction<Value, T>>,
    ) -> io::Result<T> {
        explorer_json_store::update_json_if_changed(&self.path, policy)
    }

    /// Updates settings under the JSON transaction lock.
    ///
    /// `R` is an application result (for example the ID of a new item). The
    /// callback returns both the current settings and this result. `Unchanged`
    /// avoids a write; callback or write errors preserve the original document.
    pub fn update<R>(
        &self,
        policy: impl FnOnce(Option<Value>) -> io::Result<UpdateAction<Value, (T, R)>>,
    ) -> io::Result<(T, R)> {
        explorer_json_store::update_json_if_changed(&self.path, policy)
    }
}
