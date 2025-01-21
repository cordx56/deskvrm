// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use mouse_position::mouse_position::Mouse;
use tauri::Manager;
use window_shadows::set_shadow;

#[derive(serde::Serialize, Clone)]
struct MousePosition {
    x: i32,
    y: i32,
}
#[derive(serde::Deserialize, Clone)]
struct CursorGrab {
    grab: bool,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            #[cfg(any(windows, target_os = "macos"))]
            set_shadow(&window, false).unwrap();

            let win = window.clone();
            app.listen_global("cursor_grab", move |ev| {
                if let Some(payload) = ev.payload() {
                    if let Ok(data) = serde_json::from_str::<CursorGrab>(payload) {
                        let _ = win.set_cursor_grab(data.grab);
                    }
                }
            });

            let app_handle = app.app_handle();
            tauri::async_runtime::spawn(async move {
                loop {
                    match Mouse::get_mouse_position() {
                        Mouse::Position { x, y } => {
                            let _ = app_handle.emit_all("mouse_position", MousePosition { x, y });
                        }
                        _ => {}
                    }
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
