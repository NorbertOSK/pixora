use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use super::remove_bg::apply_remove_bg;
use super::resize::decode_data_url;

static COUNTER: AtomicU64 = AtomicU64::new(0);
static TEMP_FILES: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());

fn pixora_temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("pixora");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn next_temp_path(ext: &str) -> PathBuf {
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let pid = std::process::id();
    pixora_temp_dir().join(format!("{pid}-{n}.{ext}"))
}

fn register_temp(path: &PathBuf) {
    if let Ok(mut files) = TEMP_FILES.lock() {
        files.push(path.clone());
    }
}

pub fn cleanup_all() {
    if let Ok(mut files) = TEMP_FILES.lock() {
        for p in files.iter() {
            let _ = std::fs::remove_file(p);
        }
        files.clear();
    }
    let _ = std::fs::remove_dir(pixora_temp_dir());
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSettings {
    pub format: String,
    pub quality: u8,
    pub resize_enabled: bool,
    pub resize_max_px: u32,
    pub resize_custom_h: u32,
    pub remove_bg_enabled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
}

fn run_pipeline(data_url: String, s: ProcessSettings) -> Result<ProcessResult, String> {
    let (img, _) = decode_data_url(&data_url)?;

    let img = if s.resize_enabled && s.resize_max_px > 0 {
        let (orig_w, orig_h) = img.dimensions();
        let max_w = s.resize_max_px;
        let max_h = if s.resize_custom_h > 0 { s.resize_custom_h } else { s.resize_max_px };
        let ratio = (max_w as f64 / orig_w as f64).min(max_h as f64 / orig_h as f64);
        if ratio < 0.9999 {
            let nw = ((orig_w as f64 * ratio) as u32).max(1);
            let nh = ((orig_h as f64 * ratio) as u32).max(1);
            img.resize_exact(nw, nh, FilterType::Lanczos3)
        } else {
            img
        }
    } else {
        img
    };

    let img = if s.remove_bg_enabled {
        apply_remove_bg(img)?
    } else {
        img
    };

    // JPEG has no alpha channel — if bg removal ran, force PNG to keep transparency.
    let format = if s.remove_bg_enabled && s.format == "jpeg" {
        "png"
    } else {
        s.format.as_str()
    };
    let quality = s.quality.clamp(1, 100);
    let ext = match format { "png" => "png", "webp" => "webp", _ => "jpg" };

    let out_path = next_temp_path(ext);
    {
        let file = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
        let mut writer = BufWriter::new(file);

        match format {
            "png"  => img.write_to(&mut writer, ImageFormat::Png)
                         .map_err(|e| e.to_string())?,
            "webp" => img.write_to(&mut writer, ImageFormat::WebP)
                         .map_err(|e| e.to_string())?,
            _ => {
                let mut enc =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, quality);
                enc.encode_image(&img).map_err(|e| e.to_string())?;
            }
        }
    }

    let size_bytes = out_path.metadata().map(|m| m.len()).unwrap_or(0);
    let (width, height) = img.dimensions();

    register_temp(&out_path);

    Ok(ProcessResult {
        output_path: out_path.to_string_lossy().into_owned(),
        width,
        height,
        size_bytes,
    })
}

#[tauri::command]
pub async fn process_image(
    data_url: String,
    settings: ProcessSettings,
) -> Result<ProcessResult, String> {
    tauri::async_runtime::spawn_blocking(move || run_pipeline(data_url, settings))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn read_temp_as_data_url(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);

    {
        let files = TEMP_FILES.lock().map_err(|_| "Lock poisoned".to_string())?;
        if !files.contains(&path_buf) {
            return Err("Not a tracked temp file".to_string());
        }
    }

    let bytes = std::fs::read(&path_buf).map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&bytes);
    let ext = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");
    let mime = match ext {
        "png"  => "image/png",
        "webp" => "image/webp",
        _      => "image/jpeg",
    };
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub fn delete_temp_files(paths: Vec<String>) {
    let to_delete: std::collections::HashSet<PathBuf> =
        paths.into_iter().map(PathBuf::from).collect();

    if let Ok(mut files) = TEMP_FILES.lock() {
        files.retain(|p| {
            if to_delete.contains(p) {
                let _ = std::fs::remove_file(p);
                false
            } else {
                true
            }
        });
    }
}

#[tauri::command]
pub fn cleanup_all_temp() {
    cleanup_all();
}
