//! Tauri-free registration, cancellation, and terminal classification for scans.
//! The caller owns traversal, events, and the worker's execution strategy.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};

#[derive(Clone, Default)]
pub struct ScanRegistry {
    active: Arc<Mutex<HashMap<String, CancellationToken>>>,
}

#[derive(Clone, Debug)]
pub struct CancellationToken(Arc<AtomicBool>);

#[derive(Debug, PartialEq, Eq)]
pub enum RegisterError {
    DuplicateId,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TerminalState {
    Completed,
    Cancelled,
    Failed,
}

pub struct JobGuard {
    registry: ScanRegistry,
    id: String,
    token: CancellationToken,
}

impl ScanRegistry {
    /// Register before acknowledging a scan request. IDs remain occupied until
    /// the returned guard is finished or dropped.
    pub fn register(&self, id: impl Into<String>) -> Result<JobGuard, RegisterError> {
        let id = id.into();
        let mut active = self.lock();
        if active.contains_key(&id) {
            return Err(RegisterError::DuplicateId);
        }
        let token = CancellationToken(Arc::new(AtomicBool::new(false)));
        active.insert(id.clone(), token.clone());
        Ok(JobGuard {
            registry: self.clone(),
            id,
            token,
        })
    }

    /// Request cancellation of an active job. Returns false for unknown IDs.
    pub fn cancel(&self, id: &str) -> bool {
        let active = self.lock();
        match active.get(id) {
            Some(token) => {
                token.0.store(true, Ordering::Release);
                true
            }
            None => false,
        }
    }

    fn lock(&self) -> MutexGuard<'_, HashMap<String, CancellationToken>> {
        self.active
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn remove_if_current(&self, id: &str, token: &CancellationToken) {
        let mut active = self.lock();
        if active
            .get(id)
            .is_some_and(|current| Arc::ptr_eq(&current.0, &token.0))
        {
            active.remove(id);
        }
    }
}

impl CancellationToken {
    /// Safe to call from a blocking worker or event loop thread.
    pub fn is_cancelled(&self) -> bool {
        self.0.load(Ordering::Acquire)
    }

    /// Cancellation takes precedence over success or failure, matching the
    /// scan's final observed state. The result stays with the app for its DTO
    /// or command response; this type has no serialization contract.
    pub fn terminal<T, E>(&self, result: &Result<T, E>) -> TerminalState {
        if self.is_cancelled() {
            TerminalState::Cancelled
        } else {
            match result {
                Ok(_) => TerminalState::Completed,
                Err(_) => TerminalState::Failed,
            }
        }
    }
}

impl JobGuard {
    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn token(&self) -> CancellationToken {
        self.token.clone()
    }

    pub fn is_cancelled(&self) -> bool {
        self.token.is_cancelled()
    }

    /// Classify the worker result and release the ID before returning. Drop
    /// also releases it if the worker exits without calling finish.
    pub fn finish<T, E>(self, result: &Result<T, E>) -> TerminalState {
        let mut active = self.registry.lock();
        let terminal = self.token.terminal(result);
        if active
            .get(&self.id)
            .is_some_and(|current| Arc::ptr_eq(&current.0, &self.token.0))
        {
            active.remove(&self.id);
        }
        terminal
    }
}

impl Drop for JobGuard {
    fn drop(&mut self) {
        self.registry.remove_if_current(&self.id, &self.token);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Barrier;
    use std::thread;

    #[test]
    fn duplicate_id_is_rejected_across_registry_clones() {
        let registry = ScanRegistry::default();
        let guard = registry.register("scan-1").unwrap();
        assert_eq!(guard.id(), "scan-1");
        assert!(matches!(
            registry.clone().register("scan-1"),
            Err(RegisterError::DuplicateId)
        ));
        assert!(registry.register("scan-2").is_ok());
    }

    #[test]
    fn cancellation_is_visible_to_worker_thread() {
        let registry = ScanRegistry::default();
        let guard = registry.register("scan").unwrap();
        let token = guard.token();
        let barrier = Arc::new(Barrier::new(2));
        let worker_barrier = barrier.clone();
        let worker = thread::spawn(move || {
            worker_barrier.wait();
            token.is_cancelled()
        });

        assert!(!guard.is_cancelled());
        assert!(!registry.cancel("missing"));
        assert!(registry.cancel("scan"));
        barrier.wait();
        assert!(worker.join().unwrap());
        assert!(guard.is_cancelled());
    }

    #[test]
    fn finish_and_drop_release_registration_for_reuse() {
        let registry = ScanRegistry::default();
        let completed = registry.register("scan").unwrap();
        assert_eq!(
            completed.finish(&Ok::<(), &str>(())),
            TerminalState::Completed
        );
        assert!(!registry.cancel("scan"));

        let abandoned = registry.register("scan").unwrap();
        drop(abandoned);
        assert!(!registry.cancel("scan"));
        assert!(registry.register("scan").is_ok());
    }

    #[test]
    fn stale_guard_cannot_remove_reused_id() {
        let registry = ScanRegistry::default();
        let first = registry.register("scan").unwrap();
        let old_token = first.token();
        first.finish(&Ok::<(), &str>(()));

        let second = registry.register("scan").unwrap();
        let stale = JobGuard {
            registry: registry.clone(),
            id: "scan".into(),
            token: old_token.clone(),
        };
        drop(stale);
        assert!(registry.cancel("scan"));
        assert!(second.is_cancelled());
        assert!(!old_token.is_cancelled());
    }

    #[test]
    fn terminal_state_leaves_result_with_caller_and_prioritizes_cancellation() {
        let registry = ScanRegistry::default();
        assert_eq!(
            registry.register("ok").unwrap().finish(&Ok::<(), &str>(())),
            TerminalState::Completed
        );
        let failed = Err::<Vec<String>, _>("disk error");
        assert_eq!(
            registry.register("failed").unwrap().finish(&failed),
            TerminalState::Failed
        );
        assert_eq!(failed.unwrap_err(), "disk error");
        let cancelled = registry.register("cancelled").unwrap();
        assert!(registry.cancel("cancelled"));
        assert_eq!(
            cancelled.finish(&Err::<(), _>("late error")),
            TerminalState::Cancelled
        );
        assert!(!registry.cancel("cancelled"));
    }
}
