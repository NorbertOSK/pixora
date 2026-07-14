use image::{imageops::FilterType, GenericImageView};
use serde::{Deserialize, Serialize};
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Manager, State};

use crate::error::{PixoraError, Result};
use crate::state::PixoraState;

use super::remove_bg::apply_remove_bg;
use super::resize::{decode_data_url, encode_image_to_writer};

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

/// Computes the target (width, height) for the resize step.
///
/// - When `lock_aspect_ratio` is true (default), or when the user has only supplied one
///   dimension (`max_h == 0`), the image is fit *within* a `max_w` x `max_h` box, preserving
///   the original aspect ratio — the historical "longest side" behavior.
/// - When `lock_aspect_ratio` is false AND both a width and a height were supplied
///   (`max_h > 0`), the output is forced to exactly `max_w` x `max_h`, distortion allowed.
fn compute_target_dimensions(
    orig_w: u32,
    orig_h: u32,
    max_w: u32,
    max_h: u32,
    lock_aspect_ratio: bool,
) -> (u32, u32) {
    let has_custom_h = max_h > 0;

    if !lock_aspect_ratio && has_custom_h {
        return (max_w.max(1), max_h.max(1));
    }

    let effective_h = if has_custom_h { max_h } else { max_w };
    let ratio = (max_w as f64 / orig_w as f64).min(effective_h as f64 / orig_h as f64);
    if ratio < 0.9999 {
        let nw = ((orig_w as f64 * ratio) as u32).max(1);
        let nh = ((orig_h as f64 * ratio) as u32).max(1);
        (nw, nh)
    } else {
        (orig_w, orig_h)
    }
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

    /// Lock off + both dimensions supplied: output must be exactly the requested size,
    /// distortion allowed. This is the bug the aspect-ratio lock toggle fixes.
    #[test]
    fn custom_dimensions_with_lock_off_yields_exact_size() {
        let (w, h) = compute_target_dimensions(400, 300, 500, 500, false);
        assert_eq!((w, h), (500, 500));
    }

    /// Lock on (default): fits *within* the requested box, preserving the original aspect
    /// ratio — this is the pre-existing "longest side" behavior, and it never upscales.
    /// An 800x600 (4:3) source requesting a 500x500 box -> min(500/800, 500/600) = 0.625
    /// -> 500x375, still 4:3.
    #[test]
    fn custom_dimensions_with_lock_on_preserves_aspect_ratio() {
        let (w, h) = compute_target_dimensions(800, 600, 500, 500, true);
        assert_eq!((w, h), (500, 375));
    }

    /// Same 500x500 request against a smaller 400x300 source: the fit-within box is larger
    /// than the source in both dimensions, so the pre-existing "no upscale" guard keeps the
    /// original size — this is the exact scenario from the bug report where a user expects
    /// their custom WxH to be honored but, with the lock on, only the fit-within/no-upscale
    /// behavior applies.
    #[test]
    fn custom_dimensions_with_lock_on_does_not_upscale() {
        let (w, h) = compute_target_dimensions(400, 300, 500, 500, true);
        assert_eq!((w, h), (400, 300));
    }

    /// Only width supplied (height unset/0): even with lock off, there is no second
    /// dimension to honor, so the existing "fit longest side" behavior must be preserved.
    /// 400x300 downscaled to fit within 200 -> ratio 0.5 -> 200x150.
    #[test]
    fn width_only_mode_is_unaffected_by_lock_flag() {
        let locked = compute_target_dimensions(400, 300, 200, 0, true);
        let unlocked = compute_target_dimensions(400, 300, 200, 0, false);
        assert_eq!(locked, unlocked);
        assert_eq!(locked, (200, 150));
    }

    /// Requesting a box larger than the source with lock on should not upscale
    /// (ratio >= 1 short-circuits to original dimensions) — unchanged legacy behavior.
    #[test]
    fn no_upscale_when_target_box_is_not_smaller_with_lock_on() {
        let (w, h) = compute_target_dimensions(400, 300, 4000, 4000, true);
        assert_eq!((w, h), (400, 300));
    }

    /// Lock off but target equals the original size: exact mode still requested,
    /// dimensions simply come out unchanged.
    #[test]
    fn exact_mode_matching_original_size_is_a_no_op() {
        let (w, h) = compute_target_dimensions(400, 300, 400, 300, false);
        assert_eq!((w, h), (400, 300));
    }

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
