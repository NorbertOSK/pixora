use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use crate::error::{PixoraError, Result};

#[tauri::command]
pub async fn load_image_file(path: String) -> Result<String> {
    let path_buf = PathBuf::from(&path);
    let ext = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    let allowed = ["jpg", "jpeg", "png", "webp", "gif", "tiff", "tif", "bmp"];
    let ext_str = ext.as_deref().unwrap_or("");
    if !allowed.contains(&ext_str) {
        return Err(PixoraError::Process(format!("Formato no permitido: {:?}", ext)));
    }

    let bytes = tokio::fs::read(&path_buf).await?;
    let b64 = general_purpose::STANDARD.encode(&bytes);
    let mime = match ext_str {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "tiff" | "tif" => "image/tiff",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    };
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub async fn save_image(data_url: String, path: String) -> Result<()> {
    let (_, data) = data_url
        .split_once(',')
        .ok_or_else(|| PixoraError::Process("URL de datos inválida".to_string()))?;

    let bytes = general_purpose::STANDARD
        .decode(data)
        .map_err(|e| PixoraError::Process(format!("Error decodificando imagen: {}", e)))?;

    tokio::fs::write(&path, bytes).await?;
    Ok(())
}

#[tauri::command]
pub async fn copy_file(src: String, dest: String) -> Result<()> {
    tokio::fs::copy(&src, &dest).await?;
    Ok(())
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ZipEntry {
    pub path: String,
    pub name: String,
}

#[tauri::command]
pub async fn import_images_batch(
    app_handle: AppHandle,
    paths: Vec<String>,
) -> Result<()> {
    let total = paths.len();

    for (i, path) in paths.into_iter().enumerate() {
        let path_buf = PathBuf::from(&path);
        let _name = path_buf.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("image")
            .to_string();

        let progress = ((i as f32 / total as f32) * 100.0) as u32;
        let _ = app_handle.emit("import-progress", progress);

        if let Ok(bytes) = std::fs::read(&path_buf) {
            let ext = path_buf.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
            let b64 = general_purpose::STANDARD.encode(&bytes);
            let mime = match ext.to_lowercase().as_str() {
                "png" => "image/png",
                "webp" => "image/webp",
                _ => "image/jpeg",
            };
            
            let _ = app_handle.emit("import-new-image", ZipEntry {
                path,
                name: format!("data:{};base64,{}", mime, b64),
            });
        }
    }
    
    let _ = app_handle.emit("import-progress", 100);
    Ok(())
}

#[tauri::command]
pub async fn create_zip(
    app_handle: AppHandle,
    files: Vec<ZipEntry>,
    dest_path: String,
) -> Result<()> {
    tauri::async_runtime::spawn_blocking(move || {
        let temp_path = format!("{}.part", dest_path);
        let dest = std::fs::File::create(&temp_path)?;

        let buf_writer = std::io::BufWriter::new(dest);
        let mut zip = zip::ZipWriter::new(buf_writer);
        
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        let total_files = files.len();

        for (i, entry) in files.iter().enumerate() {
            let progress = (i as f32 / total_files as f32 * 100.0) as u32;
            let _ = app_handle.emit("zip-progress", progress);

            let name = entry.name
                .replace('\\', "/")
                .split('/')
                .last()
                .unwrap_or(&entry.name)
                .to_string();

            let mut file = std::fs::File::open(&entry.path)?;

            zip.start_file(name, options)
                .map_err(|e| PixoraError::Process(format!("Error en ZIP (start_file): {}", e)))?;

            std::io::copy(&mut file, &mut zip)?;
        }

        let _ = app_handle.emit("zip-progress", 100);

        zip.finish().map_err(|e| PixoraError::Process(format!("Error finalizando ZIP: {}", e)))?;
        
        if let Err(_e) = std::fs::rename(&temp_path, &dest_path) {
            std::fs::copy(&temp_path, &dest_path)?;
            let _ = std::fs::remove_file(&temp_path);
        }

        Ok(())
    }).await.map_err(|e| PixoraError::Process(e.to_string()))?
}

