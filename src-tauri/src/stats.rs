//! Listening statistics, kept on this computer only
//! (`~/.oxitune/stats.json`): how long each song was listened to and how
//! often, and the time listened per day. Fed by the same track updates as
//! Discord and MPRIS; nothing here is ever sent anywhere.

use crate::discord_rpc::TrackPayload;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

/// The page reports at least every 15s while a song plays. A longer silence
/// means the computer slept or the page hung, not that music played.
pub const MAX_GAP_MS: u64 = 20_000;
/// Listening this long (or half of a shorter song) counts as one play.
pub const PLAY_AFTER_MS: u64 = 30_000;
/// At most one write per this interval; a counted play writes at once.
pub const SAVE_INTERVAL_MS: u64 = 60_000;
/// Songs kept; the ones not played for the longest go first.
pub const MAX_TRACKS: usize = 20_000;
/// Days of per-day totals kept.
pub const MAX_DAYS: usize = 730;
const MS_PER_DAY: u64 = 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct TrackStat {
    pub title: String,
    pub artist: String,
    pub plays: u32,
    pub listened_ms: u64,
    pub last_played_ms: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct StatsData {
    /// When counting began (Unix ms); 0 until the first song.
    #[serde(default)]
    pub since_ms: u64,
    /// By song id.
    #[serde(default)]
    pub tracks: BTreeMap<String, TrackStat>,
    /// Listening time by day (days since the Unix epoch, UTC).
    #[serde(default)]
    pub days: BTreeMap<u64, u64>,
}

/// The song being listened to between two updates.
#[derive(Debug, Clone, PartialEq)]
struct Live {
    video_id: String,
    playing: bool,
    at_ms: u64,
    /// Listened to in this run of the song (it restarts on a new song).
    run_ms: u64,
    counted: bool,
}

/// What an update did to the statistics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Recorded {
    Nothing,
    Time,
    Play,
}

#[derive(Debug, Default)]
pub struct Tracker {
    pub data: StatsData,
    live: Option<Live>,
}

fn play_threshold_ms(duration_secs: u64) -> u64 {
    if duration_secs == 0 {
        PLAY_AFTER_MS
    } else {
        PLAY_AFTER_MS.min(duration_secs * 1000 / 2)
    }
}

impl Tracker {
    pub fn new(data: StatsData) -> Self {
        Self { data, live: None }
    }

    /// Takes one track update at `now_ms`: the time since the previous
    /// update is credited to the song that was playing then.
    pub fn observe(&mut self, track: &TrackPayload, now_ms: u64) -> Recorded {
        let mut recorded = Recorded::Nothing;
        let video_id = track.video_id.as_deref().map(str::trim).filter(|v| !v.is_empty());

        let mut carried: Option<(u64, bool)> = None;
        if let Some(prev) = self.live.take() {
            let mut run_ms = prev.run_ms;
            let mut counted = prev.counted;
            if prev.playing {
                let elapsed = now_ms.saturating_sub(prev.at_ms).min(MAX_GAP_MS);
                if elapsed > 0 {
                    run_ms += elapsed;
                    if self.data.since_ms == 0 {
                        self.data.since_ms = prev.at_ms;
                    }
                    *self.data.days.entry(prev.at_ms / MS_PER_DAY).or_insert(0) += elapsed;
                    let stat = self.data.tracks.entry(prev.video_id.clone()).or_default();
                    stat.listened_ms += elapsed;
                    stat.last_played_ms = now_ms;
                    recorded = Recorded::Time;
                    let same_song = video_id == Some(prev.video_id.as_str());
                    let duration = if same_song { track.duration_secs } else { 0 };
                    if !counted && run_ms >= play_threshold_ms(duration) {
                        stat.plays += 1;
                        counted = true;
                        recorded = Recorded::Play;
                    }
                }
            }
            if video_id == Some(prev.video_id.as_str()) {
                carried = Some((run_ms, counted));
            }
        }

        if let Some(id) = video_id {
            // The newest title and artist win: the first report of a song
            // can still carry rough details.
            if let Some(stat) = self.data.tracks.get_mut(id) {
                stat.title = track.title.clone();
                stat.artist = track.artist.clone();
            } else if track.is_playing {
                self.data.tracks.insert(
                    id.to_string(),
                    TrackStat { title: track.title.clone(), artist: track.artist.clone(), ..TrackStat::default() },
                );
            }
            let (run_ms, counted) = carried.unwrap_or((0, false));
            self.live = Some(Live { video_id: id.to_string(), playing: track.is_playing, at_ms: now_ms, run_ms, counted });
        }
        self.trim();
        recorded
    }

    /// Keeps the file bounded: drops songs never listened to, then the ones
    /// played longest ago, and days beyond `MAX_DAYS`.
    fn trim(&mut self) {
        while self.data.days.len() > MAX_DAYS {
            self.data.days.pop_first();
        }
        if self.data.tracks.len() <= MAX_TRACKS {
            return;
        }
        let live = self.live.as_ref().map(|l| l.video_id.clone());
        let mut by_age: Vec<(u64, String)> = self
            .data
            .tracks
            .iter()
            .filter(|(id, _)| Some(*id) != live.as_ref())
            .map(|(id, s)| (s.last_played_ms, id.clone()))
            .collect();
        by_age.sort();
        let excess = self.data.tracks.len() - MAX_TRACKS;
        for (_, id) in by_age.into_iter().take(excess) {
            self.data.tracks.remove(&id);
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TopTrack {
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub plays: u32,
    pub listened_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TopArtist {
    pub artist: String,
    pub plays: u32,
    pub listened_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct DayTotal {
    /// Days since the Unix epoch (UTC).
    pub day: u64,
    pub listened_ms: u64,
}

/// What the Settings window shows.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Summary {
    pub since_ms: u64,
    pub total_ms: u64,
    pub total_plays: u64,
    pub songs: usize,
    pub artists: usize,
    pub top_tracks: Vec<TopTrack>,
    pub top_artists: Vec<TopArtist>,
    /// The last `days` days, oldest first, days without music included.
    pub days: Vec<DayTotal>,
}

pub fn summarize(data: &StatsData, now_ms: u64, top: usize, days: u64) -> Summary {
    let listened = || data.tracks.iter().filter(|(_, s)| s.listened_ms > 0);

    let mut top_tracks: Vec<TopTrack> = listened()
        .map(|(id, s)| TopTrack {
            video_id: id.clone(),
            title: s.title.clone(),
            artist: s.artist.clone(),
            plays: s.plays,
            listened_ms: s.listened_ms,
        })
        .collect();
    top_tracks.sort_by(|a, b| b.listened_ms.cmp(&a.listened_ms).then_with(|| a.video_id.cmp(&b.video_id)));
    top_tracks.truncate(top);

    let mut by_artist: BTreeMap<&str, (u32, u64)> = BTreeMap::new();
    for (_, s) in listened() {
        let entry = by_artist.entry(s.artist.as_str()).or_insert((0, 0));
        entry.0 += s.plays;
        entry.1 += s.listened_ms;
    }
    let artists = by_artist.len();
    let mut top_artists: Vec<TopArtist> = by_artist
        .into_iter()
        .map(|(artist, (plays, listened_ms))| TopArtist { artist: artist.to_string(), plays, listened_ms })
        .collect();
    top_artists.sort_by(|a, b| b.listened_ms.cmp(&a.listened_ms).then_with(|| a.artist.cmp(&b.artist)));
    top_artists.truncate(top);

    let today = now_ms / MS_PER_DAY;
    let first = today.saturating_sub(days.saturating_sub(1));
    Summary {
        since_ms: data.since_ms,
        total_ms: data.tracks.values().map(|s| s.listened_ms).sum(),
        total_plays: data.tracks.values().map(|s| u64::from(s.plays)).sum(),
        songs: listened().count(),
        artists,
        top_tracks,
        top_artists,
        days: (first..=today)
            .map(|day| DayTotal { day, listened_ms: data.days.get(&day).copied().unwrap_or(0) })
            .collect(),
    }
}

pub struct StatsStore {
    path: PathBuf,
    tracker: Mutex<Tracker>,
    /// (dirty, last write in Unix ms)
    saved: Mutex<(bool, u64)>,
}

impl StatsStore {
    pub fn new(path: PathBuf) -> Self {
        let data = std::fs::read(&path)
            .ok()
            .and_then(|raw| serde_json::from_slice::<StatsData>(&raw).ok())
            .unwrap_or_default();
        Self { path, tracker: Mutex::new(Tracker::new(data)), saved: Mutex::new((false, 0)) }
    }

    /// One track update. With `enabled` off nothing is counted, and the song
    /// in progress is forgotten so switching it back on starts clean.
    pub fn record(&self, track: &TrackPayload, enabled: bool) {
        let now = crate::session::now_ms();
        let recorded = {
            let mut tracker = self.tracker.lock();
            if !enabled {
                tracker.live = None;
                return;
            }
            tracker.observe(track, now)
        };
        if recorded == Recorded::Nothing {
            return;
        }
        let write = {
            let mut saved = self.saved.lock();
            saved.0 = true;
            recorded == Recorded::Play || now.saturating_sub(saved.1) >= SAVE_INTERVAL_MS
        };
        if write {
            self.flush();
        }
    }

    /// Writes what changed since the last write (also called on exit).
    pub fn flush(&self) {
        let mut saved = self.saved.lock();
        if !saved.0 {
            return;
        }
        let json = serde_json::to_vec(&self.tracker.lock().data);
        match json.map_err(|e| e.to_string()).and_then(|j| crate::secure_fs::write_private(&self.path, &j).map_err(|e| e.to_string())) {
            Ok(()) => *saved = (false, crate::session::now_ms()),
            Err(e) => log::warn!("couldn't save listening stats: {e}"),
        }
    }

    pub fn summary(&self, top: usize, days: u64) -> Summary {
        summarize(&self.tracker.lock().data, crate::session::now_ms(), top, days)
    }

    pub fn export_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(&self.tracker.lock().data).map_err(|e| e.to_string())
    }

    pub fn clear(&self) {
        *self.tracker.lock() = Tracker::default();
        *self.saved.lock() = (false, crate::session::now_ms());
        let _ = std::fs::remove_file(&self.path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(id: &str, playing: bool, duration: u64) -> TrackPayload {
        serde_json::from_value(serde_json::json!({
            "title": format!("Song {id}"),
            "artist": format!("Artist {}", &id[..1]),
            "duration_secs": duration,
            "current_time_secs": 0,
            "is_playing": playing,
            "video_id": id,
        }))
        .unwrap()
    }

    const T0: u64 = 1_700_000_000_000;

    #[test]
    fn test_time_goes_to_the_song_that_was_playing() {
        let mut t = Tracker::default();
        assert_eq!(t.observe(&track("a1", true, 200), T0), Recorded::Nothing);
        assert_eq!(t.observe(&track("a1", true, 200), T0 + 15_000), Recorded::Time);
        assert_eq!(t.observe(&track("b1", true, 200), T0 + 20_000), Recorded::Time);
        assert_eq!(t.data.tracks["a1"].listened_ms, 20_000);
        assert_eq!(t.data.tracks["b1"].listened_ms, 0);
        assert_eq!(t.data.since_ms, T0);
        assert_eq!(t.data.days[&(T0 / MS_PER_DAY)], 20_000);
    }

    #[test]
    fn test_a_play_counts_once_after_thirty_seconds() {
        let mut t = Tracker::default();
        t.observe(&track("a1", true, 200), T0);
        assert_eq!(t.observe(&track("a1", true, 200), T0 + 15_000), Recorded::Time);
        assert_eq!(t.observe(&track("a1", true, 200), T0 + 30_000), Recorded::Play);
        assert_eq!(t.observe(&track("a1", true, 200), T0 + 45_000), Recorded::Time);
        assert_eq!(t.data.tracks["a1"].plays, 1);
        // Another song, then the first one again: a second play.
        t.observe(&track("b1", true, 200), T0 + 46_000);
        t.observe(&track("a1", true, 200), T0 + 47_000);
        t.observe(&track("a1", true, 200), T0 + 62_000);
        t.observe(&track("a1", true, 200), T0 + 77_000);
        assert_eq!(t.data.tracks["a1"].plays, 2);
        assert_eq!(t.data.tracks["b1"].plays, 0, "a second of a skipped song is no play");
    }

    #[test]
    fn test_a_short_song_counts_at_half_its_length() {
        let mut t = Tracker::default();
        t.observe(&track("a1", true, 20), T0);
        assert_eq!(t.observe(&track("a1", true, 20), T0 + 10_000), Recorded::Play);
    }

    #[test]
    fn test_paused_time_and_sleep_are_not_listening() {
        let mut t = Tracker::default();
        t.observe(&track("a1", true, 200), T0);
        t.observe(&track("a1", false, 200), T0 + 5_000);
        // Paused for an hour.
        t.observe(&track("a1", true, 200), T0 + 3_605_000);
        assert_eq!(t.data.tracks["a1"].listened_ms, 5_000);
        // The computer slept for eight hours mid-song: one gap's worth at most.
        t.observe(&track("a1", true, 200), T0 + 3_605_000 + 8 * 3_600_000);
        assert_eq!(t.data.tracks["a1"].listened_ms, 5_000 + MAX_GAP_MS);
    }

    #[test]
    fn test_updates_without_a_song_id_are_ignored() {
        let mut t = Tracker::default();
        let mut ad = track("a1", true, 30);
        ad.video_id = None;
        t.observe(&ad, T0);
        t.observe(&ad, T0 + 15_000);
        assert!(t.data.tracks.is_empty());
        assert_eq!(t.data.since_ms, 0);
    }

    #[test]
    fn test_the_newest_title_wins() {
        let mut t = Tracker::default();
        t.observe(&track("a1", true, 200), T0);
        let mut better = track("a1", true, 200);
        better.title = "Real title".into();
        t.observe(&better, T0 + 1_000);
        assert_eq!(t.data.tracks["a1"].title, "Real title");
    }

    #[test]
    fn test_summary_ranks_by_time_and_fills_empty_days() {
        let mut t = Tracker::default();
        t.observe(&track("a1", true, 200), T0);
        t.observe(&track("a2", true, 200), T0 + 20_000);
        t.observe(&track("b1", true, 200), T0 + 60_000);
        t.observe(&track("b1", false, 200), T0 + 70_000);
        let s = summarize(&t.data, T0 + MS_PER_DAY, 10, 3);
        assert_eq!(s.total_ms, 20_000 + 20_000 + 10_000);
        assert_eq!(s.songs, 3);
        assert_eq!(s.artists, 2);
        assert_eq!(s.top_tracks.iter().map(|x| x.video_id.as_str()).collect::<Vec<_>>(), ["a1", "a2", "b1"]);
        assert_eq!(s.top_artists[0].artist, "Artist a");
        assert_eq!(s.top_artists[0].listened_ms, 40_000);
        assert_eq!(s.days.len(), 3);
        assert_eq!(s.days.iter().map(|d| d.listened_ms).collect::<Vec<_>>(), [0, 50_000, 0]);
        assert_eq!(summarize(&t.data, T0, 1, 1).top_tracks.len(), 1);
    }

    #[test]
    fn test_store_survives_restart_and_clears() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("stats.json");
        let store = StatsStore::new(path.clone());
        {
            let mut tracker = store.tracker.lock();
            tracker.observe(&track("a1", true, 200), T0);
            tracker.observe(&track("a1", true, 200), T0 + 15_000);
        }
        store.saved.lock().0 = true;
        store.flush();
        let reopened = StatsStore::new(path.clone());
        assert_eq!(reopened.tracker.lock().data.tracks["a1"].listened_ms, 15_000);
        reopened.clear();
        assert!(!path.exists());
        assert_eq!(reopened.summary(10, 7).total_ms, 0);
    }

    #[test]
    fn test_disabled_counts_nothing() {
        let dir = tempfile::tempdir().unwrap();
        let store = StatsStore::new(dir.path().join("stats.json"));
        store.record(&track("a1", true, 200), false);
        store.record(&track("a1", true, 200), false);
        assert_eq!(store.summary(10, 7).songs, 0);
    }

    #[test]
    fn test_a_corrupt_file_starts_empty() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("stats.json");
        std::fs::write(&path, b"{not json").unwrap();
        assert_eq!(StatsStore::new(path).summary(10, 7).total_ms, 0);
    }
}
