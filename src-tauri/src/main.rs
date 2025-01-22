// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use mouse_position::mouse_position::Mouse;
use std::path::PathBuf;
use tauri::Manager;

#[derive(serde::Serialize, Clone)]
struct MousePosition {
    x: i32,
    y: i32,
}
#[derive(serde::Deserialize, Clone)]
struct CursorGrab {
    grab: bool,
}
#[derive(serde::Deserialize, Clone)]
struct ModelViewParam {
    vrm: String,
}
#[derive(serde::Serialize, Clone)]
struct ModelList {
    models: Vec<String>,
}

fn main() {
    simple_logger::init_with_env().unwrap();
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.app_handle();
            tauri::async_runtime::spawn(async move {
                let handle = app_handle.clone();
                app_handle.listen_global("cursor_grab", move |ev| {
                    if let Some(payload) = ev.payload() {
                        if let Ok(data) = serde_json::from_str::<CursorGrab>(payload) {
                            if let Some(win) = handle.get_focused_window() {
                                let _ = win.set_cursor_grab(data.grab);
                            }
                        }
                    }
                });

                let handle = app_handle.clone();
                app_handle.listen_global("modelView", move |ev| {
                    if let Some(payload) = ev.payload() {
                        if let Ok(data) = serde_json::from_str::<ModelViewParam>(payload) {
                            if let Ok(window) = tauri::WindowBuilder::new(
                                &handle,
                                "modelView",
                                tauri::WindowUrl::App(format!("/model-view/{}", data.vrm).into()),
                            )
                            .title("deskvrm")
                            .inner_size(300.0, 500.0)
                            .resizable(false)
                            .decorations(false)
                            .transparent(true)
                            .always_on_top(true)
                            .build()
                            {
                                let _ = window.show();
                                //#[cfg(any(windows, target_os = "macos"))]
                                //let _ = set_shadow(&window, false);
                            }
                        }
                    }
                });

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

            let app_handle = app.app_handle();
            tauri::async_runtime::spawn(async move {
                use axum::{
                    http::StatusCode,
                    routing::{get, post},
                    Json,
                };
                use tower_http::cors::{AllowMethods, Any, CorsLayer};

                let data_dir = app_handle.path_resolver().app_data_dir().unwrap();
                let data_dir2 = data_dir.clone();
                let data_dir3 = data_dir.clone();

                let app = axum::Router::new()
                    .route(
                        "/vrm",
                        get(|| async move {
                            let vrm_dir = data_dir3.join("vrm");
                            if let Ok(mut files) = tokio::fs::read_dir(&vrm_dir).await {
                                let mut models = Vec::new();
                                while let Ok(Some(file)) = files.next_entry().await {
                                    let filename = file.file_name().to_string_lossy().to_string();
                                    if filename.ends_with(".vrm") {
                                        models.push(filename);
                                    }
                                }
                                (StatusCode::OK, Json(ModelList { models }))
                            } else {
                                let _ = tokio::fs::create_dir_all(&vrm_dir).await;
                                (StatusCode::OK, Json(ModelList { models: Vec::new() }))
                            }
                        }),
                    )
                    .route(
                        "/vrm/{vrm}",
                        get(|p: axum::extract::Path<String>| async move {
                            if let Ok(data) = tokio::fs::read(
                                data_dir
                                    .join("vrm")
                                    .join(PathBuf::from(&p.0).file_name().unwrap()),
                            )
                            .await
                            {
                                (axum::http::StatusCode::OK, data)
                            } else {
                                (axum::http::StatusCode::NOT_FOUND, Vec::new())
                            }
                        }),
                    )
                    .route(
                        "/vrm/{vrm}",
                        post(
                            |p: axum::extract::Path<String>, body: axum::body::Bytes| async move {
                                if let Ok(_) = tokio::fs::write(
                                    data_dir2
                                        .join("vrm")
                                        .join(PathBuf::from(&p.0).file_name().unwrap()),
                                    body,
                                )
                                .await
                                {
                                    (axum::http::StatusCode::OK, Vec::new())
                                } else {
                                    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Vec::new())
                                }
                            },
                        ),
                    )
                    .layer(
                        CorsLayer::new()
                            .allow_origin(Any)
                            .allow_methods(AllowMethods::any()),
                    )
                    .layer(axum::extract::DefaultBodyLimit::max(1024 * 1024 * 1024));
                axum::serve(
                    tokio::net::TcpListener::bind(
                        "127.0.0.1:8108".parse::<std::net::SocketAddrV4>().unwrap(),
                    )
                    .await
                    .unwrap(),
                    app,
                )
                .await
                .unwrap();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
