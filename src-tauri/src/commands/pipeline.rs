use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Manager, State};

use crate::error::{PixoraError, Result};
use crate::state::PixoraState;

use super::remove_bg::apply_remove_bg;
use super::resize::decode_data_url;

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn pixora_temp_dir(app: &AppHandle) -> Result<PathBuf> {
    let dir = app.path().temp_dir()?.join("pixora");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

fn next_temp_path(app: &AppHandle, ext: &str) -> Result<PathBuf> {
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let pid = std::process::id();
    Ok(pixora_temp_dir(app)?.join(format!("{pid}-{n}.{ext}")))
}

pub async fn cleanup_all(app: &AppHandle, state: &State<'_, PixoraState>) -> Result<()> {
    let files_to_remove: Vec<PathBuf> = {
        let mut files = state.temp_files.lock().map_err(|e| PixoraError::Lock(e.to_string()))?;
        let list = files.clone();
        files.clear();
        list
    };

    for p in files_to_remove {
        let _ = tokio::fs::remove_file(p).await;
    }
    
    let temp_dir = pixora_temp_dir(app)?;
    if temp_dir.exists() {
        let _ = tokio::fs::remove_dir_all(temp_dir).await;
    }
    Ok(())
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

fn run_pipeline(app: AppHandle, data_url: String, s: ProcessSettings) -> Result<ProcessResult> {
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
        apply_remove_bg(&app, img)?
    } else {
        img
    };

    let format = if s.remove_bg_enabled && s.format == "jpeg" {
        "png"
    } else {
        s.format.as_str()
    };
    let quality = s.quality.clamp(1, 100);
    let ext = match format { "png" => "png", "webp" => "webp", _ => "jpg" };

    let out_path = next_temp_path(&app, ext)?;
    {
        let file = std::fs::File::create(&out_path)?;
        let mut writer = BufWriter::new(file);

        match format {
            "png"  => img.write_to(&mut writer, ImageFormat::Png)
                         .map_err(|e| PixoraError::Image(e.to_string()))?,
            "webp" => img.write_to(&mut writer, ImageFormat::WebP)
                         .map_err(|e| PixoraError::Image(e.to_string()))?,
            _ => {
                let mut enc =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, quality);
                enc.encode_image(&img).map_err(|e| PixoraError::Image(e.to_string()))?;
            }
        }
    }

    let size_bytes = out_path.metadata()?.len();
    let (width, height) = img.dimensions();

    Ok(ProcessResult {
        output_path: out_path.to_string_lossy().into_owned(),
        width,
        height,
        size_bytes,
    })
}


fn register_temp(state: &State<'_, PixoraState>, path: PathBuf) -> Result<()> {
    let mut files = state.temp_files.lock().map_err(|e| PixoraError::Lock(e.to_string()))?;
    if !files.contains(&path) {
        files.push(path);
    }
    Ok(())
}

#[tauri::command]
pub async fn process_image(
    app: AppHandle,
    state: State<'_, PixoraState>,
    data_url: String,
    settings: ProcessSettings,
) -> Result<ProcessResult> {
    let result = tauri::async_runtime::spawn_blocking(move || run_pipeline(app, data_url, settings))
        .await
        .map_err(|e| PixoraError::Process(e.to_string()))??;
    
    register_temp(&state, PathBuf::from(&result.output_path))?;
    
    Ok(result)
}

#[tauri::command]
pub async fn read_temp_as_data_url(state: State<'_, PixoraState>, path: String) -> Result<String> {
    let path_buf = PathBuf::from(&path);

    {
        let files = state.temp_files.lock().map_err(|e| PixoraError::Lock(e.to_string()))?;
        if !files.contains(&path_buf) {
            // For improved robustness, if it exist but not tracked, we might want to track it
            // but for now let's keep it strict or just load it if it exists.
            if !path_buf.exists() {
                return Err(PixoraError::NotTracked(path));
            }
        }
    }

    crate::commands::save::load_image_file(path).await
}

#[tauri::command]
pub async fn delete_temp_files(state: State<'_, PixoraState>, paths: Vec<String>) -> Result<()> {
    let to_delete: std::collections::HashSet<PathBuf> =
        paths.into_iter().map(PathBuf::from).collect();

    let mut files = state.temp_files.lock().map_err(|e| PixoraError::Lock(e.to_string()))?;
    files.retain(|p| {
        if to_delete.contains(p) {
            let _ = std::fs::remove_file(p);
            false
        } else {
            true
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn cleanup_all_temp(app: AppHandle, state: State<'_, PixoraState>) -> Result<()> {
    cleanup_all(&app, &state).await
}


