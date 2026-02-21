use sysinfo::System;

#[derive(serde::Serialize)]
pub struct SystemInfo {
    pub cpu_count: usize,
    pub cpu_usage: f32,
    pub memory_total_mb: u64,
    pub memory_used_mb: u64,
}

#[tauri::command]
pub async fn get_system_info() -> SystemInfo {
    tauri::async_runtime::spawn_blocking(|| {
        let mut sys = System::new();

        sys.refresh_cpu_usage();
        std::thread::sleep(std::time::Duration::from_millis(200));
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        SystemInfo {
            cpu_count: sys.cpus().len(),
            cpu_usage: sys.global_cpu_usage(),
            memory_total_mb: sys.total_memory() / (1024 * 1024),
            memory_used_mb: sys.used_memory() / (1024 * 1024),
        }
    })
    .await
    .unwrap_or(SystemInfo {
        cpu_count: 1,
        cpu_usage: 0.0,
        memory_total_mb: 0,
        memory_used_mb: 0,
    })
}
