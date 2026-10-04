//! Filesystem implementations copied from the file and movie explorers.
//! These blocking functions must run on the host application's blocking worker.
mod list;
mod scan;
mod walk;
pub use list::{list_dir, list_dir_stream, FileEntry};
pub use scan::{scan_files, scan_files_stream, ScannedFile};
pub use walk::{walk_directories, WalkError, WalkPolicy};

fn check_cancelled(cancelled: &dyn Fn() -> bool) -> Result<(), String> {
    if cancelled() {
        Err("Directory traversal cancelled.".into())
    } else {
        Ok(())
    }
}
