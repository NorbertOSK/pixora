use base64::{engine::general_purpose, Engine as _};
use image::{DynamicImage, ImageFormat};
use serde::Serialize;
use std::io::Cursor;
use crate::error::{PixoraError, Result};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifInfo {
    pub has_metadata: bool,
    pub fields: Vec<ExifField>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifResult {
    pub data_url: String,
    pub removed: bool,
}

fn decode(data_url: &str) -> Result<(DynamicImage, String, Vec<u8>)> {
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
    let img = image::load_from_memory(&bytes).map_err(|e| PixoraError::Image(e.to_string()))?;
    Ok((img, format.to_string(), bytes))
}

#[tauri::command]
pub async fn read_exif(data_url: String) -> Result<ExifInfo> {
    tauri::async_runtime::spawn_blocking(move || {
        let (_, _, bytes) = decode(&data_url)?;

        let reader = kamadak_exif::Reader::new();
        match reader.read_from_container(&mut Cursor::new(&bytes)) {
            Ok(exif) => {
                let fields: Vec<ExifField> = exif
                    .fields()
                    .filter(|f| f.ifd_num == kamadak_exif::In::PRIMARY)
                    .map(|f| ExifField {
                        tag: f.tag.to_string(),
                        value: f.display_value().with_unit(&exif).to_string(),
                    })
                    .collect();
                Ok(ExifInfo {
                    has_metadata: !fields.is_empty(),
                    fields,
                })
            }
            Err(_) => Ok(ExifInfo {
                has_metadata: false,
                fields: vec![],
            }),
        }
    }).await.map_err(|e| PixoraError::Process(e.to_string()))?
}

#[tauri::command]
pub async fn strip_exif(data_url: String) -> Result<ExifResult> {
    tauri::async_runtime::spawn_blocking(move || {
        let (img, format, _) = decode(&data_url)?;

        let mut buf = Cursor::new(Vec::new());
        match format.as_str() {
            "png" => img
                .write_to(&mut buf, ImageFormat::Png)
                .map_err(|e| PixoraError::Image(e.to_string()))?,
            "webp" => img
                .write_to(&mut buf, ImageFormat::WebP)
                .map_err(|e| PixoraError::Image(e.to_string()))?,
            _ => {
                let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 92);
                encoder.encode_image(&img).map_err(|e| PixoraError::Image(e.to_string()))?;
            }
        }

        let bytes = buf.into_inner();
        let mime = match format.as_str() {
            "png" => "image/png",
            "webp" => "image/webp",
            _ => "image/jpeg",
        };
        let b64 = general_purpose::STANDARD.encode(&bytes);
        Ok(ExifResult {
            data_url: format!("data:{};base64,{}", mime, b64),
            removed: true,
        })
    }).await.map_err(|e| PixoraError::Process(e.to_string()))?
}

