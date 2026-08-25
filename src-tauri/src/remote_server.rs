use local_ip_address::local_ip;
use qrcode::render::svg;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub ip: String,
    pub port: u16,
    pub url: String,
    pub qr_svg: String,
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
            .dark_color(svg::Color("#ffffff"))
            .light_color(svg::Color("#18181b"))
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
                    let mut buffer = [0u8; 4096];
                    if let Ok(n) = socket.read(&mut buffer).await {
                        if n == 0 {
                            return;
                        }
                        let request_str = String::from_utf8_lossy(&buffer[..n]);
                        let first_line = request_str.lines().next().unwrap_or("");
                        let parts: Vec<&str> = first_line.split_whitespace().collect();

                        if parts.len() < 2 {
                            return;
                        }

                        let method = parts[0];
                        let path = parts[1];

                        if method == "POST" && path.starts_with("/api/command") {
                            // Extract command from query or body
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
      padding: 24px 20px;
      user-select: none;
      -webkit-user-select: none;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      color: #22c55e;
      background: rgba(34, 197, 94, 0.15);
      padding: 4px 8px;
      border-radius: 4px;
    }
    .cover-container {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    .cover-art {
      width: 260px;
      height: 260px;
      border-radius: 12px;
      background: #18181b;
      box-shadow: 0 16px 32px rgba(0,0,0,0.6);
      object-fit: cover;
    }
    .track-details {
      text-align: center;
      margin-bottom: 20px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .artist {
      font-size: 15px;
      color: #a1a1aa;
    }
    .controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 24px;
      margin-bottom: 24px;
    }
    .btn {
      background: #18181b;
      border: 1px solid #27272a;
      color: #fafafa;
      border-radius: 50%;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
      transition: transform 0.1s ease, background 0.15s ease;
    }
    .btn:active { transform: scale(0.92); background: #27272a; }
    .btn-play {
      width: 72px;
      height: 72px;
      background: #dc2626;
      border: none;
      font-size: 24px;
    }
    .volume-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #18181b;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #27272a;
    }
    .volume-slider {
      flex: 1;
      accent-color: #dc2626;
      height: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span style="font-weight: 700; letter-spacing: 0.5px;">YTMD REMOTE</span>
    <span class="badge">Connected</span>
  </div>

  <div class="cover-container">
    <div class="cover-art" id="cover" style="display: flex; align-items: center; justify-content: center; font-size: 40px;">🎵</div>
  </div>

  <div class="track-details">
    <div class="title" id="track-title">YouTube Music Desktop</div>
    <div class="artist" id="track-artist">Control from your phone</div>
  </div>

  <div>
    <div class="controls">
      <button class="btn" onclick="sendCmd('previous')">⏮</button>
      <button class="btn btn-play" id="play-btn" onclick="sendCmd('play_pause')">⏯</button>
      <button class="btn" onclick="sendCmd('next')">⏭</button>
    </div>

    <div class="volume-row">
      <span>🔈</span>
      <input type="range" min="0" max="1" step="0.05" value="0.8" class="volume-slider" onchange="sendVol(this.value)">
      <span>🔊</span>
    </div>
  </div>

  <script>
    function sendCmd(cmd) {
      fetch('/api/command?cmd=' + cmd, { method: 'POST' });
    }
    function sendVol(val) {
      fetch('/api/volume?val=' + val, { method: 'POST' });
    }
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
        assert!(info.url.starts_with("http://"));
        assert!(!info.qr_svg.is_empty());
    }
}
