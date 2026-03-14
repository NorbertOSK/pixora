use image::{imageops::FilterType, DynamicImage, GenericImageView, ImageBuffer, Rgba, RgbaImage};
use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use ort::value::Value;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

use crate::error::{PixoraError, Result};

/// Result of watermark removal.
pub struct WatermarkResult {
    pub image: DynamicImage,
    pub status: String,
}

#[derive(Clone, Debug)]
struct BBox {
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
}

pub fn apply_remove_wm(
    _app: &AppHandle,
    img: DynamicImage,
) -> Result<WatermarkResult> {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return Err(PixoraError::Process("Empty image".to_string()));
    }

    let rgba = img.to_rgba8();

    // 1) Run YOLO detector mask.
    let (mask, area_ratio) = detect_wm_mask(&rgba, w, h)?;

    if area_ratio == 0.0 {
        // Sin detección: devolver original pero marcar ok (sin advertencia).
        return Ok(WatermarkResult {
            image: DynamicImage::ImageRgba8(rgba),
            status: "ok".to_string(),
        });
    }

    if area_ratio > 0.50 {
        return Ok(WatermarkResult {
            image: DynamicImage::ImageRgba8(rgba),
            status: "skipped_dense".to_string(),
        });
    }

    match run_lama_inpaint(&rgba, &mask, w, h) {
        Ok(inpainted) => Ok(WatermarkResult {
            image: DynamicImage::ImageRgba8(inpainted),
            status: "ok".to_string(),
        }),
        Err(e) => {
            println!("[wm] LaMa failed, returning original. err={e}");
            Ok(WatermarkResult {
                image: DynamicImage::ImageRgba8(rgba),
                status: "ok".to_string(),
            })
        }
    }
}

// ------------------ LaMa Inpaint ------------------

static LAMA_SESSION: Mutex<Option<Session>> = Mutex::new(None);
static YOLO_SESSION: Mutex<Option<Session>> = Mutex::new(None);

fn lama_model_bytes() -> Result<Vec<u8>> {
    let mut tried: Vec<String> = Vec::new();
    let candidate_paths = [
        // Dev path (repo root) — parent of src-tauri
        Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("models").join("lama_inpaint.onnx")),
        // Dev path (if current_dir is repo root)
        std::env::current_dir()
            .ok()
            .map(|d| d.join("models").join("lama_inpaint.onnx")),
        // Bundled path (tauri resources next to exe)
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("resources").join("models").join("lama_inpaint.onnx"))),
        // App data cache (if ever copied)
        dirs::data_local_dir().map(|d| d.join("pixora").join("lama_inpaint.onnx")),
    ];
    for path_opt in candidate_paths.into_iter().flatten() {
        tried.push(path_opt.display().to_string());
        if path_opt.exists() {
            println!("[wm] loading LaMa model from {}", path_opt.display());
            let bytes = std::fs::read(&path_opt)
                .map_err(|e| PixoraError::Process(format!("Failed to read LaMa model at {}: {e}", path_opt.display())))?;
            return Ok(bytes);
        }
    }
    Err(PixoraError::Process(format!(
        "LaMa model not found. Tried: {}",
        tried.join(" | ")
    )))
}

fn ensure_lama_session() -> Result<std::sync::MutexGuard<'static, Option<Session>>> {
    let mut guard = LAMA_SESSION
        .lock()
        .map_err(|e| PixoraError::Lock(e.to_string()))?;
    if guard.is_none() {
        let data = lama_model_bytes()?;
        let session = Session::builder()
            .map_err(|e: ort::Error| PixoraError::Process(e.to_string()))?
            .with_optimization_level(GraphOptimizationLevel::Level1)
            .map_err(|e: ort::Error| PixoraError::Process(e.to_string()))?
            .commit_from_memory(&data)
            .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to load LaMa ONNX: {e}")))?;
        *guard = Some(session);
    }
    Ok(guard)
}

fn yolo_model_bytes() -> Result<Vec<u8>> {
    let mut tried: Vec<String> = Vec::new();
    let candidate_paths = [
        Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("models").join("yolo_watermark.onnx")),
        Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("models").join("yolo_watermark_v2.onnx")),
        std::env::current_dir()
            .ok()
            .map(|d| d.join("models").join("yolo_watermark.onnx")),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("resources").join("models").join("yolo_watermark.onnx"))),
        dirs::data_local_dir().map(|d| d.join("pixora").join("yolo_watermark.onnx")),
    ];
    for path_opt in candidate_paths.into_iter().flatten() {
        tried.push(path_opt.display().to_string());
        if path_opt.exists() {
            println!("[wm] loading YOLO WM model from {}", path_opt.display());
            let bytes = std::fs::read(&path_opt)
                .map_err(|e| PixoraError::Process(format!("Failed to read YOLO WM model at {}: {e}", path_opt.display())))?;
            return Ok(bytes);
        }
    }
    Err(PixoraError::Process(format!(
        "YOLO watermark model not found. Tried: {}",
        tried.join(" | ")
    )))
}

fn ensure_yolo_session() -> Result<std::sync::MutexGuard<'static, Option<Session>>> {
    let mut guard = YOLO_SESSION
        .lock()
        .map_err(|e| PixoraError::Lock(e.to_string()))?;
    if guard.is_none() {
        let data = yolo_model_bytes()?;
        let session = Session::builder()
            .map_err(|e: ort::Error| PixoraError::Process(e.to_string()))?
            .with_optimization_level(GraphOptimizationLevel::Level1)
            .map_err(|e: ort::Error| PixoraError::Process(e.to_string()))?
            .commit_from_memory(&data)
            .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to load YOLO WM ONNX: {e}")))?;
        *guard = Some(session);
    }
    Ok(guard)
}

fn letterbox_rgba(img: &RgbaImage, size: u32) -> (RgbaImage, f32, f32, u32, u32) {
    let (w, h) = img.dimensions();
    let scale = (size as f32 / w as f32).min(size as f32 / h as f32);
    let new_w = (w as f32 * scale).round() as u32;
    let new_h = (h as f32 * scale).round() as u32;
    let resized = image::imageops::resize(img, new_w, new_h, FilterType::CatmullRom);
    let pad_x = (size - new_w) / 2;
    let pad_y = (size - new_h) / 2;
    let mut canvas = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_pixel(size, size, Rgba([114, 114, 114, 255]));
    image::imageops::overlay(&mut canvas, &resized, pad_x as i64, pad_y as i64);
    (canvas, scale, scale, pad_x, pad_y)
}

fn iou(a: &BBox, b: &BBox) -> f32 {
    let x1 = a.x1.max(b.x1);
    let y1 = a.y1.max(b.y1);
    let x2 = a.x2.min(b.x2);
    let y2 = a.y2.min(b.y2);
    let inter = (x2 - x1).max(0.0) * (y2 - y1).max(0.0);
    let area_a = (a.x2 - a.x1).max(0.0) * (a.y2 - a.y1).max(0.0);
    let area_b = (b.x2 - b.x1).max(0.0) * (b.y2 - b.y1).max(0.0);
    if area_a + area_b - inter <= 0.0 {
        0.0
    } else {
        inter / (area_a + area_b - inter)
    }
}

fn nms(mut boxes: Vec<(BBox, f32)>, iou_thresh: f32) -> Vec<BBox> {
    boxes.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let mut kept = Vec::new();
    for (b, _) in boxes.into_iter() {
        if kept.iter().all(|k: &BBox| iou(k, &b) < iou_thresh) {
            kept.push(b);
        }
    }
    kept
}

fn detect_wm_mask(img: &RgbaImage, w: u32, h: u32) -> Result<(Vec<f32>, f32)> {
    let mut guard = ensure_yolo_session()?;
    let session = guard.as_mut().unwrap();

    // yolo_watermark.onnx expects 640 input (letterbox).
    let input_size = 640u32;
    let (letter, _, _, pad_x, pad_y) = letterbox_rgba(img, input_size);

    // Build CHW float32 0-1
    let mut tensor: ndarray::Array4<f32> = ndarray::Array::zeros((1, 3, input_size as usize, input_size as usize));
    for (y, row) in letter.rows().enumerate() {
        for (x, p) in row.enumerate() {
            tensor[[0, 0, y, x]] = p[0] as f32 / 255.0;
            tensor[[0, 1, y, x]] = p[1] as f32 / 255.0;
            tensor[[0, 2, y, x]] = p[2] as f32 / 255.0;
        }
    }

    let input_val = Value::from_array(tensor)
        .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to wrap YOLO tensor: {e}")))?;

    let outputs = match session.run(ort::inputs![input_val]) {
        Ok(v) => v,
        Err(e) => {
            println!("[wm] YOLO run error: {e}");
            return Err(PixoraError::Process(format!("YOLO run error: {e}")));
        }
    };

    // Expect first output [1, N, 6] => x1,y1,x2,y2,score,class
    // SessionOutputs is keyed by output name; take the first (only) value by index 0 via iter().
    let out = outputs
        .values()
        .next()
        .ok_or_else(|| PixoraError::Process("YOLO output missing".into()))?;
    let arr = out.try_extract_array::<f32>().map_err(|e| PixoraError::Process(format!("YOLO extract error: {e}")))?;
    let shape = arr.shape();
    if shape.len() != 3 || shape[2] < 6 {
        return Err(PixoraError::Process(format!("YOLO unexpected shape: {:?}", shape)));
    }
    let boxes_n = shape[1];
    let mut boxes: Vec<(BBox, f32)> = Vec::new();
    for i in 0..boxes_n {
        let x1 = arr[[0, i, 0]];
        let y1 = arr[[0, i, 1]];
        let x2 = arr[[0, i, 2]];
        let y2 = arr[[0, i, 3]];
        let score = arr[[0, i, 4]];
        // allow any class id; watermark model may use single class=0
        if score >= 0.05 {
            boxes.push((BBox { x1, y1, x2, y2 }, score));
        }
    }

    if boxes.is_empty() {
        // Log best score to debug
        let max_score = (0..boxes_n)
            .map(|i| arr[[0, i, 4]])
            .fold(0.0f32, |a, b| a.max(b));
        println!("[wm] YOLO no boxes (max_score={max_score:.4})");
        return Ok((vec![0.0; (w * h) as usize], 0.0));
    }

    let boxes = nms(boxes, 0.45);

    let mut mask = vec![0f32; (w * h) as usize];
    let idx = |x: i32, y: i32| -> Option<usize> {
        if x >= 0 && y >= 0 && x < w as i32 && y < h as i32 {
            Some((y as u32 * w + x as u32) as usize)
        } else {
            None
        }
    };

    for b in boxes {
        // Undo letterbox
        let sx = (b.x1 - pad_x as f32) / input_size as f32;
        let sy = (b.y1 - pad_y as f32) / input_size as f32;
        let ex = (b.x2 - pad_x as f32) / input_size as f32;
        let ey = (b.y2 - pad_y as f32) / input_size as f32;
        let x1 = (sx * w as f32).clamp(0.0, w as f32 - 1.0) as i32;
        let y1 = (sy * h as f32).clamp(0.0, h as f32 - 1.0) as i32;
        let x2 = (ex * w as f32).clamp(0.0, w as f32 - 1.0) as i32;
        let y2 = (ey * h as f32).clamp(0.0, h as f32 - 1.0) as i32;
        let dil = 6.max(((x2 - x1).abs().max(y2 - y1).abs()) / 14);
        for y in (y1 - dil)..=(y2 + dil) {
            for x in (x1 - dil)..=(x2 + dil) {
                if let Some(p) = idx(x, y) {
                    mask[p] = 1.0;
                }
            }
        }
    }

    let area: f32 = mask.iter().sum();
    let area_ratio = area / (w * h) as f32;
    Ok((mask, area_ratio))
}

fn run_lama_inpaint(img: &RgbaImage, mask: &[f32], w: u32, h: u32) -> Result<RgbaImage> {
    // Resize to 512 for LaMa
    let target = 512u32;
    let img_resized = image::imageops::resize(img, target, target, FilterType::Lanczos3);

    // Resize + feather mask
    let mut mask_img = ImageBuffer::<image::Luma<u8>, Vec<u8>>::new(w, h);
    for (i, m) in mask.iter().enumerate() {
        let x = (i as u32) % w;
        let y = (i as u32) / w;
        mask_img.put_pixel(x, y, image::Luma([(*m * 255.0).clamp(0.0, 255.0) as u8]));
    }
    let blurred: ImageBuffer<image::Luma<u8>, Vec<u8>> = image::imageops::blur(&mask_img, 1.8);
    let mask_resized = image::imageops::resize(&blurred, target, target, FilterType::Lanczos3);

    // Prepare tensors
    let mut img_tensor: ndarray::Array4<f32> =
        ndarray::Array::zeros((1, 3, target as usize, target as usize));
    for (y, row) in img_resized.rows().enumerate() {
        for (x, p) in row.enumerate() {
            // Normalize to [0,1] as expected by most LaMa ONNX exports.
            img_tensor[[0, 0, y, x]] = p[0] as f32 / 255.0;
            img_tensor[[0, 1, y, x]] = p[1] as f32 / 255.0;
            img_tensor[[0, 2, y, x]] = p[2] as f32 / 255.0;
        }
    }

    let mut mask_tensor: ndarray::Array4<f32> =
        ndarray::Array::zeros((1, 1, target as usize, target as usize));
    for (y, row) in mask_resized.rows().enumerate() {
        for (x, p) in row.enumerate() {
            mask_tensor[[0, 0, y, x]] = (p[0] as f32 / 255.0).clamp(0.0, 1.0);
        }
    }

    let mut guard = ensure_lama_session()?;
    let session = guard.as_mut().unwrap();

    // Allocate Ort values (owns its buffer) to avoid lifetime/double-free issues.
    let img_val = Value::from_array(img_tensor)
        .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to wrap image tensor: {e}")))?;
    let mask_val = Value::from_array(mask_tensor)
        .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to wrap mask tensor: {e}")))?;

    let outputs = session.run(ort::inputs![img_val, mask_val]);
    let outputs = match outputs {
        Ok(v) => v,
        Err(e) => {
            println!("[wm] LaMa run error: {e}");
            return Err(PixoraError::Process(format!("LaMa run error: {e}")));
        }
    };

    let output = &outputs[0];
    let arr = output.try_extract_array::<f32>();
    let arr = match arr {
        Ok(a) => a,
        Err(e) => {
            println!("[wm] LaMa extract error: {e}");
            return Err(PixoraError::Process(format!("LaMa extract error: {e}")));
        }
    };

    let mut out_resized = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(target, target);
    for y in 0..target as usize {
        for x in 0..target as usize {
            // Model is expected to output [0,1]; clamp defensively.
            let r = (arr[[0, 0, y, x]].clamp(0.0, 1.0) * 255.0) as u8;
            let g = (arr[[0, 1, y, x]].clamp(0.0, 1.0) * 255.0) as u8;
            let b = (arr[[0, 2, y, x]].clamp(0.0, 1.0) * 255.0) as u8;
            out_resized.put_pixel(x as u32, y as u32, Rgba([r, g, b, 255]));
        }
    }

    // Resize back to original
    let out_full = image::imageops::resize(&out_resized, w, h, FilterType::Lanczos3);
    let mask_full = image::imageops::resize(&mask_resized, w, h, FilterType::Lanczos3);

    // Composite: alpha blend with soft mask to avoid contraste shifts
    let mut final_img = img.clone();
    for (x, y, pix) in final_img.enumerate_pixels_mut() {
        let m = mask_full.get_pixel(x, y)[0] as f32 / 255.0;
        if m > 0.05 {
            let p = out_full.get_pixel(x, y);
            let a = m.clamp(0.0, 1.0);
            let inv = 1.0 - a;
            let r = (p[0] as f32 * a + pix[0] as f32 * inv).clamp(0.0, 255.0) as u8;
            let g = (p[1] as f32 * a + pix[1] as f32 * inv).clamp(0.0, 255.0) as u8;
            let b = (p[2] as f32 * a + pix[2] as f32 * inv).clamp(0.0, 255.0) as u8;
            *pix = Rgba([r, g, b, 255]);
        }
    }

    Ok(final_img)
}
