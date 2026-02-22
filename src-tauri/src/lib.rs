mod commands;
pub mod error;
pub mod state;

use commands::{compress, exif, pipeline, remove_bg, resize, save, system};
use state::PixoraState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PixoraState::new())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<PixoraState>();
                let _ = pipeline::cleanup_all(&handle, &state).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            resize::resize_image,
            compress::compress_image,
            compress::get_image_info,
            remove_bg::remove_background,
            remove_bg::check_bg_model_exists,
            save::load_image_file,
            save::save_image,
            save::copy_file,
            save::import_images_batch,
            save::create_zip,
            pipeline::process_image,
            pipeline::cleanup_all_temp,
            pipeline::read_temp_as_data_url,
            pipeline::delete_temp_files,
            exif::read_exif,
            exif::strip_exif,
            system::get_system_info,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let handle = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    let state = handle.state::<PixoraState>();
                    let _ = pipeline::cleanup_all(&handle, &state).await;
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
