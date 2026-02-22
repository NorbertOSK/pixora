use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PixoraError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Image error: {0}")]
    Image(String),
    #[error("Process error: {0}")]
    Process(String),
    #[error("Not tracked: {0}")]
    NotTracked(String),
    #[error("Lock error: {0}")]
    Lock(String),
}

impl Serialize for PixoraError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, PixoraError>;
