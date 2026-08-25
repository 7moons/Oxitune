use local_ip_address::local_ip;
use qrcode::render::svg;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub ip: String,
    pub port: u16,
    pub url: String,
    pub qr_svg: String,
}

#[derive(Deserialize)]
struct InvokeRequest {
    cmd: String,
    args: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct UpdateTrackWrapper {
    track: crate::discord_rpc::TrackPayload,
}

#[derive(Deserialize)]
struct DownloadRequestWrapper {
    request: crate::downloader::DownloadRequest,
}

pub fn get_local_ip() -> String {
    local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

pub fn generate_qr_svg(url: &str) -> String {
    if let Ok(code) = QrCode::new(url.as_bytes()) {
        code.render::<svg::Color>()
            .min_dimensions(200, 200)
            .dark_color(svg::Color("#000000"))
            .light_color(svg::Color("#ffffff"))
            .build()
    } else {
        "<svg></svg>".to_string()
    }
}

pub fn get_remote_info(port: u16) -> RemoteInfo {
    let ip = get_local_ip();
    let url = format!("http://{}:{}", ip, port);
    let qr_svg = generate_qr_svg(&url);

    RemoteInfo {
        ip,
        port,
        url,
        qr_svg,
    }
}

pub fn start_remote_server(app_handle: AppHandle, port: u16) {
    tauri::async_runtime::spawn(async move {
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        let listener = match TcpListener::bind(addr).await {
            Ok(l) => {
                log::info!("[YTMD Remote] Server listening on http://0.0.0.0:{}", port);
                l
            }
            Err(e) => {
                log::warn!("[YTMD Remote] Failed to bind port {}: {}", port, e);
                return;
            }
        };

        loop {
            if let Ok((mut socket, _)) = listener.accept().await {
                let handle = app_handle.clone();
                tokio::spawn(async move {
                    let mut buffer = [0u8; 8192];
                    if let Ok(n) = socket.read(&mut buffer).await {
                        if n == 0 {
                            return;
                        }
                        let request_str = String::from_utf8_lossy(&buffer[..n]);
                        let first_line = request_str.lines().next().unwrap_or("");
                        let parts: Vec<&str> = first_line.split_whitespace().collect();

                        if parts.is_empty() {
                            return;
                        }

                        let method = parts[0];
                        let path = parts.get(1).copied().unwrap_or("/");

                        // Handle CORS Preflight
                        if method == "OPTIONS" {
                            let response = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\n\r\n";
                            let _ = socket.write_all(response.as_bytes()).await;
                            return;
                        }

                        // Direct Bridge Invoke API for Preload Scripts
                        if method == "POST" && path.starts_with("/api/invoke") {
                            let mut result = serde_json::Value::Null;

                            // Parse request JSON body
                            if let Some(body_start) = request_str.find("\r\n\r\n") {
                                let body_str = &request_str[body_start + 4..];
                                if let Ok(req) = serde_json::from_str::<InvokeRequest>(body_str.trim()) {
                                    match req.cmd.as_str() {
                                        "get_config" => {
                                            if let Some(state) = handle.try_state::<Arc<crate::AppState>>() {
                                                let cfg = state.config_manager.load();
                                                result = serde_json::to_value(cfg).unwrap_or(serde_json::Value::Null);
                                            }
                                        }
                                        "get_remote_info" => {
                                            let info = get_remote_info(port);
                                            result = serde_json::to_value(info).unwrap_or(serde_json::Value::Null);
                                        }
                                        "toggle_settings_window" => {
                                            if let Some(w) = handle.get_webview_window("settings") {
                                                if w.is_visible().unwrap_or(false) {
                                                    let _ = w.hide();
                                                } else {
                                                    let _ = w.show();
                                                    let _ = w.set_focus();
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        "toggle_mini_player" => {
                                            if let Some(w) = handle.get_webview_window("miniplayer") {
                                                if w.is_visible().unwrap_or(false) {
                                                    let _ = w.hide();
                                                } else {
                                                    let _ = w.show();
                                                    let _ = w.set_focus();
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        "toggle_local_library_window" => {
                                            if let Some(w) = handle.get_webview_window("local") {
                                                if w.is_visible().unwrap_or(false) {
                                                    let _ = w.hide();
                                                } else {
                                                    let _ = w.show();
                                                    let _ = w.set_focus();
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        "toggle_sync_window" => {
                                            if let Some(w) = handle.get_webview_window("sync") {
                                                if w.is_visible().unwrap_or(false) {
                                                    let _ = w.hide();
                                                } else {
                                                    let _ = w.show();
                                                    let _ = w.set_focus();
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        "update_track_info" => {
                                            if let Some(args_val) = req.args {
                                                if let Ok(wrapper) = serde_json::from_value::<UpdateTrackWrapper>(args_val) {
                                                    if let Some(state) = handle.try_state::<Arc<crate::AppState>>() {
                                                        let _ = crate::commands::update_track_info(
                                                            handle.clone(),
                                                            state,
                                                            wrapper.track,
                                                        );
                                                    }
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        "notify_track_change" => {
                                            if let Some(args_val) = req.args {
                                                #[derive(Deserialize)]
                                                struct NotifyArgs {
                                                    title: String,
                                                    artist: String,
                                                }
                                                if let Ok(p) = serde_json::from_value::<NotifyArgs>(args_val) {
                                                    if let Some(state) = handle.try_state::<Arc<crate::AppState>>() {
                                                        let _ = crate::commands::notify_track_change(
                                                            handle.clone(),
                                                            state,
                                                            p.title,
                                                            p.artist,
                                                        );
                                                    }
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        "fetch_lyrics" => {
                                            if let Some(args_val) = req.args {
                                                #[derive(Deserialize)]
                                                struct LyricsArgs {
                                                    artist: String,
                                                    title: String,
                                                    #[serde(rename = "albumName")]
                                                    album_name: Option<String>,
                                                    duration: Option<f64>,
                                                }
                                                if let Ok(lr) = serde_json::from_value::<LyricsArgs>(args_val) {
                                                    if let Ok(data) = crate::commands::fetch_lyrics(
                                                        lr.artist,
                                                        lr.title,
                                                        lr.album_name,
                                                        lr.duration,
                                                    )
                                                    .await
                                                    {
                                                        result = data;
                                                    }
                                                }
                                            }
                                        }
                                        "download_track" => {
                                            if let Some(args_val) = req.args {
                                                if let Ok(dr) = serde_json::from_value::<DownloadRequestWrapper>(args_val) {
                                                    if let Some(state) = handle.try_state::<Arc<crate::AppState>>() {
                                                        let _ = crate::commands::download_track(
                                                            handle.clone(),
                                                            state,
                                                            dr.request,
                                                        )
                                                        .await;
                                                    }
                                                }
                                            }
                                            result = serde_json::json!({ "success": true });
                                        }
                                        _ => {}
                                    }
                                }
                            }

                            let res_body = serde_json::json!({
                                "status": "ok",
                                "result": result
                            }).to_string();

                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: *\r\nAccess-Control-Allow-Methods: *\r\nContent-Length: {}\r\n\r\n{}",
                                res_body.len(),
                                res_body
                            );
                            let _ = socket.write_all(response.as_bytes()).await;
                            return;
                        }

                        if method == "POST" && path.starts_with("/api/command") {
                            let cmd = if let Some(q) = path.split('?').nth(1) {
                                q.split('=').nth(1).unwrap_or("play_pause")
                            } else {
                                "play_pause"
                            };

                            let _ = handle.emit("player-command", cmd.to_string());
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        } else if method == "POST" && path.starts_with("/api/volume") {
                            if let Some(q) = path.split('?').nth(1) {
                                if let Some(val_str) = q.split('=').nth(1) {
                                    if let Ok(vol) = val_str.parse::<f64>() {
                                        let _ = handle.emit("player-volume", vol);
                                    }
                                }
                            }
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        } else if method == "POST" && path.starts_with("/api/seek") {
                            if let Some(q) = path.split('?').nth(1) {
                                if let Some(val_str) = q.split('=').nth(1) {
                                    if let Ok(pos) = val_str.parse::<f64>() {
                                        let _ = handle.emit("player-seek", pos);
                                    }
                                }
                            }
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        } else {
                            // Serve Mobile Remote Web App
                            let html = get_mobile_html();
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                                html.len(),
                                html
                            );
                            let _ = socket.write_all(response.as_bytes()).await;
                        }
                    }
                });
            }
        }
    });
}

fn get_mobile_html() -> &'static str {
    r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>YTMD Web Remote</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      justify-content: space-between;
      padding: 24px;
      user-select: none;
    }
    .header { text-align: center; }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: #27272a;
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    .title { font-size: 20px; font-weight: 700; }
    .controls { display: flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 320px; margin: 0 auto; }
    .btn-row { display: flex; gap: 16px; justify-content: center; width: 100%; }
    .btn {
      background: #18181b;
      border: 1px solid #27272a;
      color: #fafafa;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
      text-align: center;
      cursor: pointer;
    }
    .btn-primary { background: #38bdf8; color: #09090b; border: none; font-size: 20px; }
    .slider-box { width: 100%; margin-top: 12px; }
    .slider-label { font-size: 12px; color: #a1a1aa; margin-bottom: 6px; display: block; }
    input[type=range] { width: 100%; accent-color: #38bdf8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">YTMD WI-FI REMOTE</div>
    <div class="title">Now Playing Controller</div>
  </div>
  <div class="controls">
    <div class="btn-row">
      <button class="btn" onclick="sendCmd('previous')">⏮ Prev</button>
      <button class="btn btn-primary" onclick="sendCmd('play_pause')">⏯ Play</button>
      <button class="btn" onclick="sendCmd('next')">⏭ Next</button>
    </div>
    <div class="btn-row">
      <button class="btn" onclick="sendCmd('like')">👍 Like</button>
      <button class="btn" onclick="sendCmd('dislike')">👎 Dislike</button>
      <button class="btn" onclick="sendCmd('mute')">🔇 Mute</button>
    </div>
    <div class="slider-box">
      <span class="slider-label">Volume</span>
      <input type="range" min="0" max="1" step="0.05" value="1" oninput="sendVol(this.value)">
    </div>
  </div>
  <div style="text-align: center; font-size: 12px; color: #52525b;">Connected via Local Area Network</div>
  <script>
    function sendCmd(cmd) { fetch('/api/command?cmd=' + cmd, { method: 'POST' }); }
    function sendVol(v) { fetch('/api/volume?v=' + v, { method: 'POST' }); }
  </script>
</body>
</html>"#
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_local_ip_returns_valid_ip() {
        let ip = get_local_ip();
        assert!(!ip.is_empty());
    }

    #[test]
    fn test_generate_qr_svg() {
        let svg = generate_qr_svg("http://192.168.1.100:9863");
        assert!(svg.contains("<svg"));
        assert!(svg.contains("</svg>"));
    }

    #[test]
    fn test_get_remote_info() {
        let info = get_remote_info(9863);
        assert_eq!(info.port, 9863);
        assert!(info.url.contains("9863"));
    }
}
