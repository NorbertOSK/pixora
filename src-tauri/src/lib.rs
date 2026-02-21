mod commands;

use commands::{compress, exif, pipeline, remove_bg, resize, save, system};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            remove_bg::set_app_handle(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            resize::resize_image,
            compress::compress_image,
            compress::get_image_info,
            exif::strip_exif,
            exif::read_exif,
            remove_bg::remove_background,
            remove_bg::check_bg_model_exists,
            pipeline::process_image,
            pipeline::read_temp_as_data_url,
            pipeline::delete_temp_files,
            pipeline::cleanup_all_temp,
            save::save_image,
            save::copy_file,
            save::create_zip,
            save::load_image_file,
            system::get_system_info,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                pipeline::cleanup_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
