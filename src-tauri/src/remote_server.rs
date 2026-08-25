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

/// Random URL-safe pairing token generated once per app run. Every request
/// to the LAN remote-control server (which must bind 0.0.0.0 so phones on
/// the same Wi-Fi can reach it) must present this token via `?t=`. Without
/// it, any website open in the user's regular browser could blind-POST to
/// this server (classic local-network CSRF / DNS-rebinding) and trigger
/// playback control, arbitrary file writes via download_track, or config
/// reads — none of which requires the response to be readable, so CORS
/// headers alone can never prevent it. Only a secret the attacker can't
/// guess does.
pub fn generate_token() -> String {
    use rand::Rng;
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::rng();
    (0..32)
        .map(|_| {
            let idx = rng.random_range(0..CHARS.len());
            CHARS[idx] as char
        })
        .collect()
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    let (a, b) = (a.as_bytes(), b.as_bytes());
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

fn query_param(path: &str, key: &str) -> Option<String> {
    let query = path.split('?').nth(1)?;
    url::form_urlencoded::parse(query.as_bytes())
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}

fn token_ok(path: &str, expected: &str) -> bool {
    query_param(path, "t")
        .map(|v| constant_time_eq(&v, expected))
        .unwrap_or(false)
}

async fn write_forbidden(socket: &mut tokio::net::TcpStream) {
    let body = "Forbidden: missing or invalid pairing token";
    let response = format!(
        "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nContent-Length: {}\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = socket.write_all(response.as_bytes()).await;
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

pub fn get_remote_info(port: u16, token: &str) -> RemoteInfo {
    let ip = get_local_ip();
    let url = format!("http://{}:{}/?t={}", ip, port, token);
    let qr_svg = generate_qr_svg(&url);

    RemoteInfo {
        ip,
        port,
        url,
        qr_svg,
    }
}

pub fn start_remote_server(app_handle: AppHandle, port: u16, token: String) {
    let token: Arc<str> = Arc::from(token);

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
                let token = token.clone();
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

                        if !token_ok(path, &token) {
                            write_forbidden(&mut socket).await;
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
                                            let info = get_remote_info(port, &token);
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
                                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                                res_body.len(),
                                res_body
                            );
                            let _ = socket.write_all(response.as_bytes()).await;
                            return;
                        }

                        if method == "POST" && path.starts_with("/api/command") {
                            let cmd = query_param(path, "cmd").unwrap_or_else(|| "play_pause".to_string());
                            let _ = handle.emit("player-command", cmd);
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        } else if method == "POST" && path.starts_with("/api/volume") {
                            if let Some(val_str) = query_param(path, "v") {
                                if let Ok(vol) = val_str.parse::<f64>() {
                                    let _ = handle.emit("player-volume", vol);
                                }
                            }
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        } else if method == "POST" && path.starts_with("/api/seek") {
                            if let Some(val_str) = query_param(path, "s") {
                                if let Ok(pos) = val_str.parse::<f64>() {
                                    let _ = handle.emit("player-seek", pos);
                                }
                            }
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        } else {
                            // Serve Mobile Remote Web App
                            let html = get_mobile_html(&token);
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
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

fn get_mobile_html(token: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>YTMD Web Remote</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      justify-content: space-between;
      padding: 24px;
      user-select: none;
    }}
    .header {{ text-align: center; }}
    .badge {{
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: #27272a;
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }}
    .title {{ font-size: 20px; font-weight: 700; }}
    .controls {{ display: flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 320px; margin: 0 auto; }}
    .btn-row {{ display: flex; gap: 16px; justify-content: center; width: 100%; }}
    .btn {{
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
    }}
    .btn-primary {{ background: #38bdf8; color: #09090b; border: none; font-size: 20px; }}
    .slider-box {{ width: 100%; margin-top: 12px; }}
    .slider-label {{ font-size: 12px; color: #a1a1aa; margin-bottom: 6px; display: block; }}
    input[type=range] {{ width: 100%; accent-color: #38bdf8; }}
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">YTMD WI-FI REMOTE</div>
    <div class="title">Now Playing Controller</div>
  </div>
  <div class="controls">
    <div class="btn-row">
      <button class="btn" onclick="sendCmd('previous')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg> Prev
      </button>
      <button class="btn btn-primary" onclick="sendCmd('play_pause')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Play / Pause
      </button>
      <button class="btn" onclick="sendCmd('next')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg> Next
      </button>
    </div>
    <div class="btn-row">
      <button class="btn" onclick="sendCmd('like')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> Like
      </button>
      <button class="btn" onclick="sendCmd('dislike')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg> Dislike
      </button>
      <button class="btn" onclick="sendCmd('mute')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Mute
      </button>
    </div>
    <div class="slider-box">
      <span class="slider-label">Volume</span>
      <input type="range" min="0" max="1" step="0.05" value="1" oninput="sendVol(this.value)">
    </div>
  </div>
  <div style="text-align: center; font-size: 12px; color: #52525b;">Connected via Local Area Network</div>
  <script>
    const TOKEN = "{token}";
    function sendCmd(cmd) {{ fetch('/api/command?cmd=' + encodeURIComponent(cmd) + '&t=' + TOKEN, {{ method: 'POST' }}); }}
    function sendVol(v) {{ fetch('/api/volume?v=' + encodeURIComponent(v) + '&t=' + TOKEN, {{ method: 'POST' }}); }}
  </script>
</body>
</html>"#,
        token = token
    )
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
        let info = get_remote_info(9863, "test-token");
        assert_eq!(info.port, 9863);
        assert!(info.url.contains("9863"));
        assert!(info.url.contains("t=test-token"));
    }

    #[test]
    fn test_generate_token_is_random_and_long_enough() {
        let a = generate_token();
        let b = generate_token();
        assert_eq!(a.len(), 32);
        assert_eq!(b.len(), 32);
        assert_ne!(a, b, "two generated tokens collided — RNG is broken");
        assert!(a.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_constant_time_eq() {
        assert!(constant_time_eq("abc123", "abc123"));
        assert!(!constant_time_eq("abc123", "abc124"));
        assert!(!constant_time_eq("abc123", "abc12"));
        assert!(!constant_time_eq("", "a"));
        assert!(constant_time_eq("", ""));
    }

    #[test]
    fn test_query_param_extracts_value() {
        assert_eq!(
            query_param("/api/command?cmd=next&t=abc", "cmd"),
            Some("next".to_string())
        );
        assert_eq!(
            query_param("/api/command?cmd=next&t=abc", "t"),
            Some("abc".to_string())
        );
        assert_eq!(query_param("/api/command?cmd=next", "t"), None);
        assert_eq!(query_param("/", "t"), None);
    }

    #[test]
    fn test_token_ok_rejects_missing_or_wrong_token() {
        let expected = "secret-token";
        assert!(token_ok("/?t=secret-token", expected));
        assert!(!token_ok("/?t=wrong-token", expected));
        assert!(!token_ok("/", expected));
        assert!(!token_ok("/api/invoke", expected));
    }

    #[test]
    fn test_mobile_html_embeds_token_for_same_origin_fetches() {
        let html = get_mobile_html("secret-token");
        assert!(html.contains("const TOKEN = \"secret-token\";"));
        assert!(!html.contains("Access-Control-Allow-Origin"));
    }
}
