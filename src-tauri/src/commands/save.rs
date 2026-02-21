use base64::{engine::general_purpose, Engine as _};
use serde::Deserialize;
use std::io::Write;

#[tauri::command]
pub fn load_image_file(path: String) -> Result<String, String> {
    let path_buf = std::path::PathBuf::from(&path);
    let ext = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    let allowed = ["jpg", "jpeg", "png", "webp", "gif", "tiff", "tif", "bmp"];
    if !ext.as_deref().map(|e| allowed.contains(&e)).unwrap_or(false) {
        return Err(format!("Formato no permitido: {:?}", ext));
    }

    let bytes = std::fs::read(&path_buf).map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&bytes);
    let mime = match ext.as_deref().unwrap_or("") {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "tiff" | "tif" => "image/tiff",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    };
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub fn save_image(data_url: String, path: String) -> Result<(), String> {
    let (_, data) = data_url
        .split_once(',')
        .ok_or_else(|| "URL de datos inválida".to_string())?;

    let bytes = general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Error decodificando imagen: {}", e))?;

    std::fs::write(&path, bytes)
        .map_err(|e| format!("Error guardando archivo en {}: {}", path, e))
}

#[tauri::command]
pub fn copy_file(src: String, dest: String) -> Result<(), String> {
    std::fs::copy(&src, &dest)
        .map(|_| ())
        .map_err(|e| format!("Error copiando archivo: {}", e))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipEntry {
    pub path: String,
    pub name: String,
}

#[tauri::command]
pub fn create_zip(files: Vec<ZipEntry>, dest_path: String) -> Result<(), String> {
    let dest = std::fs::File::create(&dest_path)
        .map_err(|e| format!("No se pudo crear el ZIP: {}", e))?;

    let mut zip = zip::ZipWriter::new(dest);
    let options =
        zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

    for entry in &files {
        let bytes = std::fs::read(&entry.path)
            .map_err(|e| format!("Error leyendo {}: {}", entry.name, e))?;
        zip.start_file(&entry.name, options)
            .map_err(|e| format!("Error en ZIP: {}", e))?;
        zip.write_all(&bytes)
            .map_err(|e| format!("Error escribiendo en ZIP: {}", e))?;
    }

    zip.finish().map_err(|e| format!("Error finalizando ZIP: {}", e))?;
    Ok(())
}
