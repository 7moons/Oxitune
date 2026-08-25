use parking_lot::Mutex;
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, WebviewWindow};

use crate::discord_rpc::TrackPayload;

pub struct MprisManager {
    controls: Arc<Mutex<Option<MediaControls>>>,
}

impl MprisManager {
    pub fn new(app_handle: AppHandle, main_window: &WebviewWindow) -> Self {
        #[cfg(target_os = "windows")]
        let hwnd = main_window.hwnd().ok().map(|h| h.0);
        #[cfg(not(target_os = "windows"))]
        let hwnd = {
            let _ = main_window;
            None
        };

        let config = PlatformConfig {
            dbus_name: "ytmd",
            display_name: "YouTube Music",
            hwnd,
        };

        let mut controls_opt = MediaControls::new(config).ok();

        if let Some(ref mut controls) = controls_opt {
            let app = app_handle.clone();
            let _ = controls.attach(move |event: MediaControlEvent| match event {
                MediaControlEvent::Play => {
                    let _ = app.emit("mpris-command", "play");
                }
                MediaControlEvent::Pause => {
                    let _ = app.emit("mpris-command", "pause");
                }
                MediaControlEvent::Toggle => {
                    let _ = app.emit("mpris-command", "play-pause");
                }
                MediaControlEvent::Next => {
                    let _ = app.emit("mpris-command", "next");
                }
                MediaControlEvent::Previous => {
                    let _ = app.emit("mpris-command", "previous");
                }
                MediaControlEvent::Stop => {
                    let _ = app.emit("mpris-command", "stop");
                }
                MediaControlEvent::SetPosition(pos) => {
                    let _ = app.emit("mpris-command-seek", pos.0.as_secs_f64());
                }
                _ => {}
            });
        }

        Self {
            controls: Arc::new(Mutex::new(controls_opt)),
        }
    }

    pub fn update_track(&self, track: &TrackPayload) {
        if let Some(ref mut controls) = *self.controls.lock() {
            let cover_url = track.cover_url.as_deref();
            let album = track.album.as_deref();

            let metadata = MediaMetadata {
                title: Some(&track.title),
                artist: Some(&track.artist),
                album,
                cover_url,
                duration: if track.duration_secs > 0 {
                    Some(Duration::from_secs(track.duration_secs))
                } else {
                    None
                },
            };

            let _ = controls.set_metadata(metadata);

            let playback = if track.is_playing {
                MediaPlayback::Playing {
                    progress: Some(souvlaki::MediaPosition(Duration::from_secs(track.current_time_secs))),
                }
            } else {
                MediaPlayback::Paused {
                    progress: Some(souvlaki::MediaPosition(Duration::from_secs(track.current_time_secs))),
                }
            };

            let _ = controls.set_playback(playback);
        }
    }
}
