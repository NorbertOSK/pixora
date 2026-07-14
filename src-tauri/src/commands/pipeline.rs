use image::{imageops::FilterType, GenericImageView};
use serde::{Deserialize, Serialize};
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Manager, State};

use crate::error::{PixoraError, Result};
use crate::state::PixoraState;

use super::remove_bg::apply_remove_bg;
use super::resize::{compute_target_dimensions, decode_data_url, encode_image_to_writer};

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
    #[serde(default = "default_true")]
    pub lock_aspect_ratio: bool,
    pub remove_bg_enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
}

/// Resolves the output format and encode quality for the final write.
///
/// When background removal forces the format from the user's `"jpeg"` selection to `"png"`
/// (to preserve the cutout's transparency), quality is also forced to 100 (lossless) so the
/// alpha-channel cutout is never palette-quantized. A user-selected PNG (no override) keeps
/// the user's chosen quality.
fn resolve_format_and_quality(format: &str, remove_bg_enabled: bool, quality: u8) -> (&str, u8) {
    if remove_bg_enabled && format == "jpeg" {
        ("png", 100)
    } else {
        (format, quality.clamp(1, 100))
    }
}

fn run_pipeline(app: AppHandle, data_url: String, s: ProcessSettings) -> Result<ProcessResult> {
    let (img, _) = decode_data_url(&data_url)?;

    let img = if s.resize_enabled && s.resize_max_px > 0 {
        let (orig_w, orig_h) = img.dimensions();
        let (new_w, new_h) = compute_target_dimensions(
            orig_w,
            orig_h,
            s.resize_max_px,
            s.resize_custom_h,
            s.lock_aspect_ratio,
        );
        if new_w != orig_w || new_h != orig_h {
            img.resize_exact(new_w, new_h, FilterType::Lanczos3)
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

    let (format, quality) = resolve_format_and_quality(&s.format, s.remove_bg_enabled, s.quality);
    let ext = match format { "png" => "png", "webp" => "webp", _ => "jpg" };

    let out_path = next_temp_path(&app, ext)?;
    {
        let file = std::fs::File::create(&out_path)?;
        let mut writer = BufWriter::new(file);

        encode_image_to_writer(&img, &mut writer, format, quality)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Background removal forcing a JPEG selection to PNG (to preserve transparency) must
    /// also force quality to 100 so the alpha-channel cutout is never palette-quantized.
    #[test]
    fn remove_bg_forces_png_and_lossless_quality_for_jpeg_selection() {
        let (format, quality) = resolve_format_and_quality("jpeg", true, 60);
        assert_eq!(format, "png");
        assert_eq!(quality, 100);
    }

    /// A user-selected PNG is not a format override, so the user's chosen quality must be
    /// preserved even with background removal enabled.
    #[test]
    fn remove_bg_does_not_override_user_selected_png_quality() {
        let (format, quality) = resolve_format_and_quality("png", true, 60);
        assert_eq!(format, "png");
        assert_eq!(quality, 60);
    }

    /// With background removal disabled, format and quality pass through unchanged
    /// (aside from clamping to the valid 1-100 range).
    #[test]
    fn format_and_quality_pass_through_when_remove_bg_disabled() {
        let (format, quality) = resolve_format_and_quality("jpeg", false, 60);
        assert_eq!(format, "jpeg");
        assert_eq!(quality, 60);
    }
}
