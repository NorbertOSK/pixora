use std::path::PathBuf;
use std::sync::Mutex;

pub struct PixoraState {
    pub temp_files: Mutex<Vec<PathBuf>>,
}

impl PixoraState {
    pub fn new() -> Self {
        Self {
            temp_files: Mutex::new(Vec::new()),
        }
    }
}
