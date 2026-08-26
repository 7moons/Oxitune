use parking_lot::Mutex;
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig, SeekDirection,
};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, WebviewWindow};

use crate::discord_rpc::TrackPayload;

/// Computes the absolute position a relative MPRIS seek lands on.
///
/// souvlaki's Linux/MPRIS backend maps the spec's `Seek(Offset)` D-Bus
/// method — the one GNOME's and KDE's media-control widgets send for their
/// seek-forward/back buttons, and what `playerctl position 10+`/`10-` use —
/// to `MediaControlEvent::SeekBy(direction, amount)`, never to an absolute
/// `SetPosition` (see souvlaki's `platform/mpris/zbus.rs::seek`). There is
/// no absolute-seek IPC path for this in isolation, so this reconstructs
/// one from the last known position/duration and reuses the existing
/// `mpris-command-seek` event the frontend already listens for.
fn compute_seek_target(current: Duration, total: Duration, direction: SeekDirection, amount: Duration) -> Duration {
    let target = match direction {
        SeekDirection::Forward => current.saturating_add(amount),
        SeekDirection::Backward => current.saturating_sub(amount),
    };
    if total > Duration::ZERO {
        target.min(total)
    } else {
        target
    }
}

pub struct MprisManager {
    controls: Arc<Mutex<Option<MediaControls>>>,
    last_position: Arc<Mutex<Duration>>,
    last_duration: Arc<Mutex<Duration>>,
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

        let last_position = Arc::new(Mutex::new(Duration::ZERO));
        let last_duration = Arc::new(Mutex::new(Duration::ZERO));

        if let Some(ref mut controls) = controls_opt {
            let app = app_handle.clone();
            let position_for_seek = last_position.clone();
            let duration_for_seek = last_duration.clone();
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
                MediaControlEvent::SeekBy(direction, amount) => {
                    let current = *position_for_seek.lock();
                    let total = *duration_for_seek.lock();
                    let target = compute_seek_target(current, total, direction, amount);
                    let _ = app.emit("mpris-command-seek", target.as_secs_f64());
                }
                _ => {}
            });
        }

        Self {
            controls: Arc::new(Mutex::new(controls_opt)),
            last_position,
            last_duration,
        }
    }

    pub fn update_track(&self, track: &TrackPayload) {
        *self.last_position.lock() = Duration::from_secs(track.current_time_secs);
        *self.last_duration.lock() = Duration::from_secs(track.duration_secs);

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seek_forward_advances_and_clamps_to_duration() {
        let target = compute_seek_target(
            Duration::from_secs(100),
            Duration::from_secs(120),
            SeekDirection::Forward,
            Duration::from_secs(30),
        );
        // 100 + 30 = 130, clamped to the 120s track duration.
        assert_eq!(target, Duration::from_secs(120));
    }

    #[test]
    fn test_seek_forward_within_bounds() {
        let target = compute_seek_target(
            Duration::from_secs(10),
            Duration::from_secs(200),
            SeekDirection::Forward,
            Duration::from_secs(15),
        );
        assert_eq!(target, Duration::from_secs(25));
    }

    #[test]
    fn test_seek_backward_saturates_at_zero() {
        let target = compute_seek_target(
            Duration::from_secs(5),
            Duration::from_secs(200),
            SeekDirection::Backward,
            Duration::from_secs(30),
        );
        // Must saturate, not panic on underflow or wrap around.
        assert_eq!(target, Duration::ZERO);
    }

    #[test]
    fn test_seek_backward_within_bounds() {
        let target = compute_seek_target(
            Duration::from_secs(50),
            Duration::from_secs(200),
            SeekDirection::Backward,
            Duration::from_secs(20),
        );
        assert_eq!(target, Duration::from_secs(30));
    }

    #[test]
    fn test_seek_with_unknown_duration_is_not_clamped() {
        // duration == 0 means "unknown" (e.g. a live stream); don't clamp
        // a forward seek to zero in that case.
        let target = compute_seek_target(
            Duration::from_secs(50),
            Duration::ZERO,
            SeekDirection::Forward,
            Duration::from_secs(20),
        );
        assert_eq!(target, Duration::from_secs(70));
    }
}
