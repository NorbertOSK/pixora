use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, DynamicImage, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub keep_aspect: bool,
    pub format: Option<String>,
    pub quality: Option<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeResult {
    pub data_url: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: usize,
}

pub fn decode_data_url(data_url: &str) -> Result<(DynamicImage, String), String> {
    let (header, data) = data_url
        .split_once(',')
        .ok_or_else(|| "URL de datos inválida".to_string())?;

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
        .map_err(|e| e.to_string())?;

    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    Ok((img, format.to_string()))
}

pub fn encode_image(img: &DynamicImage, format: &str, quality: u8) -> Result<(String, usize), String> {
    let mut buf = Cursor::new(Vec::new());

    match format {
        "png" => img
            .write_to(&mut buf, ImageFormat::Png)
            .map_err(|e| e.to_string())?,
        "webp" => img
            .write_to(&mut buf, ImageFormat::WebP)
            .map_err(|e| e.to_string())?,
        _ => {
            let mut encoder =
                image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
            encoder.encode_image(img).map_err(|e| e.to_string())?;
        }
    }

    let bytes = buf.into_inner();
    let size = bytes.len();
    let b64 = general_purpose::STANDARD.encode(&bytes);
    let mime = match format {
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "image/jpeg",
    };

    Ok((format!("data:{};base64,{}", mime, b64), size))
}

#[tauri::command]
pub fn resize_image(data_url: String, options: ResizeOptions) -> Result<ResizeResult, String> {
    let (img, orig_format) = decode_data_url(&data_url)?;
    let (orig_w, orig_h) = img.dimensions();
    let format = options.format.as_deref().unwrap_or(&orig_format).to_string();
    let quality = options.quality.unwrap_or(85).clamp(1, 100);

    let (new_w, new_h) = match (options.width, options.height) {
        (Some(w), Some(h)) => {
            if options.keep_aspect {
                let ratio = (w as f64 / orig_w as f64).min(h as f64 / orig_h as f64);
                ((orig_w as f64 * ratio) as u32, (orig_h as f64 * ratio) as u32)
            } else {
                (w, h)
            }
        }
        (Some(w), None) => {
            let ratio = w as f64 / orig_w as f64;
            (w, (orig_h as f64 * ratio) as u32)
        }
        (None, Some(h)) => {
            let ratio = h as f64 / orig_h as f64;
            ((orig_w as f64 * ratio) as u32, h)
        }
        (None, None) => (orig_w, orig_h),
    };

    let new_w = new_w.max(1);
    let new_h = new_h.max(1);

    let resized = img.resize_exact(new_w, new_h, FilterType::Lanczos3);
    let (data_url_out, size_bytes) = encode_image(&resized, &format, quality)?;

    Ok(ResizeResult {
        data_url: data_url_out,
        width: new_w,
        height: new_h,
        size_bytes,
    })
}
