use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, DynamicImage, ImageFormat, RgbaImage};
use ndarray::Array;
use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use ort::value::TensorRef;
use serde::Serialize;
use std::io::Cursor;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

use crate::error::{PixoraError, Result};
use super::resize::decode_data_url;

const IMGLY_BASE: &str = "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/";
const MODEL_KEY: &str = "/models/isnet_quint8";
pub const RESOLUTION: u32 = 1024;
pub const MEAN: f32 = 128.0;
pub const STD: f32 = 256.0;

static SESSION: Mutex<Option<Session>> = Mutex::new(None);


#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveBgResult {
    pub data_url: String,
}

#[derive(serde::Deserialize)]
struct ResourceChunk {
    name: String,
    offsets: [u64; 2],
}

#[derive(serde::Deserialize)]
struct ResourceEntry {
    chunks: Vec<ResourceChunk>,
    size: usize,
}

fn model_path() -> Result<PathBuf> {
    let dir = dirs::data_local_dir()
        .or_else(dirs::cache_dir)
        .ok_or_else(|| PixoraError::Process("Could not determine cache directory".to_string()))?;
    let model_dir = dir.join("pixora");
    if !model_dir.exists() {
        std::fs::create_dir_all(&model_dir)?;
    }
    Ok(model_dir.join("isnet_quint8.onnx"))
}

fn download_model_chunked() -> Result<Vec<u8>> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| PixoraError::Process(e.to_string()))?;

    let resources_url = format!("{}resources.json", IMGLY_BASE);
    let resp = client
        .get(&resources_url)
        .send()?;
    let resource_map: std::collections::HashMap<String, ResourceEntry> = resp.json()?;

    let entry = resource_map
        .get(MODEL_KEY)
        .ok_or_else(|| PixoraError::Process(format!("Model {} not found in resources", MODEL_KEY)))?;

    let mut data = Vec::with_capacity(entry.size);
    for chunk in &entry.chunks {
        let chunk_url = format!("{}{}", IMGLY_BASE, chunk.name);
        let chunk_bytes = client
            .get(&chunk_url)
            .send()?
            .bytes()?;
        let expected = (chunk.offsets[1] - chunk.offsets[0]) as usize;
        if chunk_bytes.len() != expected {
            return Err(PixoraError::Process(format!(
                "Chunk {} size mismatch: expected {}, got {}",
                chunk.name, expected, chunk_bytes.len()
            )));
        }
        data.extend_from_slice(&chunk_bytes);
    }

    if data.len() != entry.size {
        return Err(PixoraError::Process(format!(
            "Model size mismatch: expected {}, got {}",
            entry.size,
            data.len()
        )));
    }

    Ok(data)
}

fn create_session(app: &AppHandle) -> Result<Session> {
    let path = model_path()?;

    let model_data = if path.exists() {
        std::fs::read(&path)?
    } else {
        let _ = app.emit("bg-model-downloading", true);
        let data = download_model_chunked()?;
        std::fs::write(&path, &data)?;
        let _ = app.emit("bg-model-downloaded", true);
        data
    };

    let session = Session::builder()
        .map_err(|e: ort::Error| PixoraError::Process(e.to_string()))?
        .with_optimization_level(GraphOptimizationLevel::Level1)
        .map_err(|e: ort::Error| PixoraError::Process(e.to_string()))?
        .commit_from_memory(&model_data)
        .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to load ONNX model: {}", e)))?;
    Ok(session)
}

fn ensure_session(app: &AppHandle) -> Result<std::sync::MutexGuard<'static, Option<Session>>> {
    let mut guard = SESSION
        .lock()
        .map_err(|e| PixoraError::Lock(e.to_string()))?;
    if guard.is_none() {
        *guard = Some(create_session(app)?);
    }
    Ok(guard)
}

fn encode_png_data_url(img: &RgbaImage) -> Result<String> {
    let mut buf = Cursor::new(Vec::new());
    let dynamic = DynamicImage::ImageRgba8(img.clone());
    dynamic
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| PixoraError::Image(e.to_string()))?;
    let b64 = general_purpose::STANDARD.encode(buf.into_inner());
    Ok(format!("data:image/png;base64,{}", b64))
}

pub fn apply_remove_bg_sync(app: &AppHandle, img: DynamicImage) -> Result<DynamicImage> {
    let mut guard = ensure_session(app)?;
    let session = guard.as_mut().unwrap();

    let rgba = img.to_rgba8();
    let (orig_w, orig_h) = rgba.dimensions();

    let resized = image::imageops::resize(&rgba, RESOLUTION, RESOLUTION, FilterType::Triangle);

    let input_array = Array::from_shape_fn(
        (1, 3, RESOLUTION as usize, RESOLUTION as usize),
        |(_n, c, h, w)| {
            let pixel = resized.get_pixel(w as u32, h as u32);
            (pixel[c] as f32 - MEAN) / STD
        },
    );

    let input_tensor = TensorRef::from_array_view(&input_array)
        .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to create input tensor: {}", e)))?;

    let outputs = session
        .run(ort::inputs![&*input_tensor])
        .map_err(|e: ort::Error| PixoraError::Process(format!("Inference failed: {}", e)))?;

    let output = &outputs[0];
    let mask_view = output
        .try_extract_array::<f32>()
        .map_err(|e: ort::Error| PixoraError::Process(format!("Failed to extract output: {}", e)))?;

    let mut result_rgba = resized.clone();
    for y in 0..RESOLUTION {
        for x in 0..RESOLUTION {
            let alpha = if mask_view.ndim() == 4 {
                mask_view[[0, 0, y as usize, x as usize]]
            } else {
                mask_view[[0, y as usize, x as usize]]
            };
            result_rgba.get_pixel_mut(x, y)[3] = (alpha.clamp(0.0, 1.0) * 255.0) as u8;
        }
    }

    let output_img = image::imageops::resize(&result_rgba, orig_w, orig_h, FilterType::Triangle);
    Ok(DynamicImage::ImageRgba8(output_img))
}

pub fn apply_remove_bg(app: &AppHandle, img: DynamicImage) -> Result<DynamicImage> {
    apply_remove_bg_sync(app, img)
}

#[tauri::command]
pub async fn remove_background(app: AppHandle, data_url: String) -> Result<RemoveBgResult> {
    let (img, _format) = decode_data_url(&data_url)?;
    
    let result = tauri::async_runtime::spawn_blocking(move || {
        apply_remove_bg_sync(&app, img)
    }).await.map_err(|e| PixoraError::Process(e.to_string()))??;
    
    let data_url = encode_png_data_url(&result.to_rgba8())?;
    Ok(RemoveBgResult { data_url })
}

#[tauri::command]
pub async fn check_bg_model_exists() -> Result<bool> {
    let path = model_path()?;
    Ok(path.exists())
}

