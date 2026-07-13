use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, DynamicImage, GenericImageView, ImageEncoder};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Write};
use crate::error::{PixoraError, Result};

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

pub fn decode_data_url(data_url: &str) -> Result<(DynamicImage, String)> {
    let (header, data) = data_url
        .split_once(',')
        .ok_or_else(|| PixoraError::Process("URL de datos inválida".to_string()))?;

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
    Ok((img, format.to_string()))
}

/// Encode image to the given format with quality control.
/// - JPEG: quality 1-100 (lossy)
/// - WebP: quality 1-100 via libwebp (lossy)
/// - PNG: quality 100 is lossless (PngEncoder, best compression). Quality < 100 uses
///   `imagequant` (pngquant-style) lossy palette quantization to an indexed PNG, which is
///   what actually drives PNG file size down — DEFLATE compression-effort tuning alone
///   (the previous approach) barely moves the needle on photographic PNGs.
pub fn encode_image_to_writer<W: Write>(img: &DynamicImage, writer: &mut W, format: &str, quality: u8) -> Result<()> {
    match format {
        "png" => {
            if quality >= 100 {
                let encoder = image::codecs::png::PngEncoder::new_with_quality(
                    writer,
                    image::codecs::png::CompressionType::Best,
                    image::codecs::png::FilterType::Adaptive,
                );
                encoder.write_image(
                    img.as_bytes(),
                    img.width(),
                    img.height(),
                    img.color().into(),
                ).map_err(|e: image::ImageError| PixoraError::Image(e.to_string()))?;
            } else {
                encode_png_quantized(img, writer, quality)?;
            }
        }
        "webp" => {
            let rgba = img.to_rgba8();
            let encoder = webp::Encoder::from_rgba(&rgba, img.width(), img.height());
            let mem = encoder.encode(quality as f32);
            writer.write_all(&mem).map_err(|e| PixoraError::Image(e.to_string()))?;
        }
        _ => {
            let mut encoder =
                image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality);
            encoder.encode_image(img).map_err(|e| PixoraError::Image(e.to_string()))?;
        }
    }
    Ok(())
}

/// Lossy PNG compression via `imagequant` (the library behind pngquant): quantizes the
/// image down to a palette of at most 256 colors and writes an indexed PNG (PLTE + tRNS).
/// This is what closes the gap with tools like pngquant/compresspng.com — plain DEFLATE
/// compression-level tuning on RGBA data cannot reach comparable file sizes.
fn encode_png_quantized<W: Write>(img: &DynamicImage, writer: &mut W, quality: u8) -> Result<()> {
    let rgba = img.to_rgba8();
    let width = rgba.width() as usize;
    let height = rgba.height() as usize;

    let pixels: Vec<imagequant::RGBA> = rgba
        .pixels()
        .map(|p| imagequant::RGBA::new(p[0], p[1], p[2], p[3]))
        .collect();

    let mut liq = imagequant::new();
    liq.set_quality(0, quality.min(100))
        .map_err(|e| PixoraError::Image(format!("imagequant quality: {e:?}")))?;
    liq.set_speed(5)
        .map_err(|e| PixoraError::Image(format!("imagequant speed: {e:?}")))?;

    let mut liq_img = liq
        .new_image(pixels, width, height, 0.0)
        .map_err(|e| PixoraError::Image(format!("imagequant image: {e:?}")))?;

    let mut res = liq
        .quantize(&mut liq_img)
        .map_err(|e| PixoraError::Image(format!("imagequant quantize: {e:?}")))?;
    res.set_dithering_level(1.0)
        .map_err(|e| PixoraError::Image(format!("imagequant dither: {e:?}")))?;

    let (palette, indexed_pixels) = res
        .remapped(&mut liq_img)
        .map_err(|e| PixoraError::Image(format!("imagequant remap: {e:?}")))?;

    let mut encoder = png::Encoder::new(writer, width as u32, height as u32);
    encoder.set_color(png::ColorType::Indexed);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::High);

    let mut plte = Vec::with_capacity(palette.len() * 3);
    let mut trns = Vec::with_capacity(palette.len());
    for c in &palette {
        plte.push(c.r);
        plte.push(c.g);
        plte.push(c.b);
        trns.push(c.a);
    }
    encoder.set_palette(plte);
    encoder.set_trns(trns);

    let mut png_writer = encoder
        .write_header()
        .map_err(|e| PixoraError::Image(e.to_string()))?;
    png_writer
        .write_image_data(&indexed_pixels)
        .map_err(|e| PixoraError::Image(e.to_string()))?;

    Ok(())
}

pub fn encode_image(img: &DynamicImage, format: &str, quality: u8) -> Result<(String, usize)> {
    let mut buf = Cursor::new(Vec::new());
    encode_image_to_writer(img, &mut buf, format, quality)?;

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
pub async fn resize_image(data_url: String, options: ResizeOptions) -> Result<ResizeResult> {
    tauri::async_runtime::spawn_blocking(move || {
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
    }).await.map_err(|e| PixoraError::Process(e.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};

    /// Synthetic photo-like RGBA image: smooth gradients plus per-pixel noise, so it behaves
    /// like a photograph (large, hard-to-DEFLATE color range) rather than flat-color test art.
    fn photo_like_image(size: u32) -> DynamicImage {
        let mut seed: u32 = 0x1234_5678;
        let mut next_rand = move || {
            // Small xorshift PRNG — deterministic, no extra dev-dependency needed.
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            seed
        };

        let buf = ImageBuffer::from_fn(size, size, |x, y| {
            let noise = (next_rand() % 32) as i32 - 16;
            let r = ((x * 255 / size) as i32 + noise).clamp(0, 255) as u8;
            let g = ((y * 255 / size) as i32 + noise).clamp(0, 255) as u8;
            let b = (((x + y) * 255 / (2 * size)) as i32 + noise).clamp(0, 255) as u8;
            let a = 255u8;
            Rgba([r, g, b, a])
        });
        DynamicImage::ImageRgba8(buf)
    }

    #[test]
    fn png_quantized_is_significantly_smaller_than_lossless() {
        let img = photo_like_image(512);

        let mut lossless_buf = Cursor::new(Vec::new());
        encode_image_to_writer(&img, &mut lossless_buf, "png", 100).unwrap();
        let lossless_bytes = lossless_buf.into_inner();

        let mut quantized_buf = Cursor::new(Vec::new());
        encode_image_to_writer(&img, &mut quantized_buf, "png", 80).unwrap();
        let quantized_bytes = quantized_buf.into_inner();

        assert!(
            (quantized_bytes.len() as f64) < (lossless_bytes.len() as f64) * 0.6,
            "expected quantized PNG (quality 80) to be < 60% of lossless size; lossless={} quantized={}",
            lossless_bytes.len(),
            quantized_bytes.len()
        );

        let decoded = image::load_from_memory(&quantized_bytes).unwrap();
        assert_eq!(decoded.width(), 512);
        assert_eq!(decoded.height(), 512);

        let decoded_lossless = image::load_from_memory(&lossless_bytes).unwrap();
        assert_eq!(decoded_lossless.width(), 512);
        assert_eq!(decoded_lossless.height(), 512);
    }

    #[test]
    fn webp_quality_80_is_smaller_than_quality_100() {
        let img = photo_like_image(512);

        let mut q100_buf = Cursor::new(Vec::new());
        encode_image_to_writer(&img, &mut q100_buf, "webp", 100).unwrap();
        let q100_bytes = q100_buf.into_inner();

        let mut q80_buf = Cursor::new(Vec::new());
        encode_image_to_writer(&img, &mut q80_buf, "webp", 80).unwrap();
        let q80_bytes = q80_buf.into_inner();

        assert_ne!(q100_bytes, q80_bytes, "quality 80 and 100 WebP output should differ");
        assert!(
            q80_bytes.len() < q100_bytes.len(),
            "expected quality 80 WebP to be smaller than quality 100; q80={} q100={}",
            q80_bytes.len(),
            q100_bytes.len()
        );
    }

    #[test]
    fn jpeg_quality_50_is_smaller_than_quality_95() {
        let img = photo_like_image(512);

        let mut q95_buf = Cursor::new(Vec::new());
        encode_image_to_writer(&img, &mut q95_buf, "jpeg", 95).unwrap();
        let q95_bytes = q95_buf.into_inner();

        let mut q50_buf = Cursor::new(Vec::new());
        encode_image_to_writer(&img, &mut q50_buf, "jpeg", 50).unwrap();
        let q50_bytes = q50_buf.into_inner();

        assert!(
            q50_bytes.len() < q95_bytes.len(),
            "expected quality 50 JPEG to be smaller than quality 95; q50={} q95={}",
            q50_bytes.len(),
            q95_bytes.len()
        );
    }
}

