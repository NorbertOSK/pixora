use base64::{engine::general_purpose, Engine as _};
use image::{DynamicImage, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use crate::error::{PixoraError, Result};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressOptions {
    pub quality: u8,
    pub format: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressResult {
    pub data_url: String,
    pub size_bytes: usize,
    pub original_size: usize,
    pub saved_percent: f32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub size_bytes: usize,
    pub format: String,
}

fn decode(data_url: &str) -> Result<(DynamicImage, String, usize)> {
    let (header, data) = data_url
        .split_once(',')
        .ok_or_else(|| PixoraError::Process("URL inválida".to_string()))?;

    let format = if header.contains("jpeg") || header.contains("jpg") {
        "jpeg"
    } else if header.contains("png") {
        "png"
    } else if header.contains("webp") {
        "webp"
    } else {
        "jpeg"
    };

    let bytes = general_purpose::STANDARD
        .decode(data)
        .map_err(|e| PixoraError::Process(e.to_string()))?;
    let original_size = bytes.len();
    let img = image::load_from_memory(&bytes).map_err(|e| PixoraError::Image(e.to_string()))?;
    Ok((img, format.to_string(), original_size))
}

#[tauri::command]
pub async fn compress_image(data_url: String, options: CompressOptions) -> Result<CompressResult> {
    tauri::async_runtime::spawn_blocking(move || {
        let (img, orig_format, original_size) = decode(&data_url)?;
        let format = options.format.as_deref().unwrap_or(&orig_format).to_string();
        let quality = options.quality.clamp(1, 100);

        let mut buf = Cursor::new(Vec::new());

        match format.as_str() {
            "png" => img
                .write_to(&mut buf, ImageFormat::Png)
                .map_err(|e| PixoraError::Image(e.to_string()))?,
            "webp" => img
                .write_to(&mut buf, ImageFormat::WebP)
                .map_err(|e| PixoraError::Image(e.to_string()))?,
            _ => {
                let mut encoder =
                    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
                encoder.encode_image(&img).map_err(|e| PixoraError::Image(e.to_string()))?;
            }
        }

        let compressed = buf.into_inner();
        let size_bytes = compressed.len();
        let saved_percent = if original_size > 0 {
            ((original_size as f32 - size_bytes as f32) / original_size as f32) * 100.0
        } else {
            0.0
        };

        let b64 = general_purpose::STANDARD.encode(&compressed);
        let mime = match format.as_str() {
            "png" => "image/png",
            "webp" => "image/webp",
            _ => "image/jpeg",
        };

        Ok(CompressResult {
            data_url: format!("data:{};base64,{}", mime, b64),
            size_bytes,
            original_size,
            saved_percent,
        })
    }).await.map_err(|e| PixoraError::Process(e.to_string()))?
}

#[tauri::command]
pub async fn get_image_info(data_url: String) -> Result<ImageInfo> {
    tauri::async_runtime::spawn_blocking(move || {
        let (header, data) = data_url
            .split_once(',')
            .ok_or_else(|| PixoraError::Process("URL inválida".to_string()))?;

        let format = if header.contains("jpeg") || header.contains("jpg") {
            "JPEG"
        } else if header.contains("png") {
            "PNG"
        } else if header.contains("webp") {
            "WebP"
        } else {
            "Unknown"
        };

        let bytes = general_purpose::STANDARD
            .decode(data)
            .map_err(|e| PixoraError::Process(e.to_string()))?;
        let size_bytes = bytes.len();
        let img = image::load_from_memory(&bytes).map_err(|e| PixoraError::Image(e.to_string()))?;
        let (width, height) = img.dimensions();

        Ok(ImageInfo {
            width,
            height,
            size_bytes,
            format: format.to_string(),
        })
    }).await.map_err(|e| PixoraError::Process(e.to_string()))?
}

