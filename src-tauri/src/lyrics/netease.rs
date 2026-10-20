//! NetEase Cloud Music through its unofficial web API. Off by default: not
//! a public API and may be against its terms. Good coverage of synced
//! lyrics, including many songs LRCLIB lacks.

use super::lrc::parse_lrc;
use super::matching::{clean_track_name, encode, score_match, synced_length_fits, Candidate, MIN_MATCH_SCORE};
use super::{Lyrics, LyricsProvider, ProviderId, Query};
use futures_util::future::BoxFuture;
use serde_json::Value;
use std::time::Duration;

/// How many matching songs get their lyrics fetched.
const MAX_CANDIDATES: usize = 3;

pub struct Netease {
    http: reqwest::Client,
}

impl Default for Netease {
    fn default() -> Self {
        Self::new()
    }
}

impl Netease {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
            .timeout(Duration::from_secs(6))
            .build()
            .unwrap_or_default();
        Self { http }
    }

    async fn get(&self, url: &str) -> Result<Value, String> {
        self.http
            .get(url)
            .header("Referer", "https://music.163.com/")
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<Value>()
            .await
            .map_err(|e| e.to_string())
    }

    async fn lookup(&self, q: &Query) -> Result<Vec<Lyrics>, String> {
        let title = clean_track_name(&q.title);
        let url = format!(
            "https://music.163.com/api/search/get?s={}&type=1&limit=10&offset=0",
            encode(&format!("{} {}", q.artist, title))
        );
        let songs = parse_search(&self.get(&url).await?);
        let mut out = Vec::new();
        for song in rank_songs(songs, &title, &q.artist, &q.artist_aliases, q.duration).into_iter().take(MAX_CANDIDATES) {
            let url = format!("https://music.163.com/api/song/lyric?id={}&lv=1&kv=1&tv=-1", song.id);
            if let Ok(res) = self.get(&url).await {
                if let Some(mut l) = lyrics_from_response(&res, &song) {
                    if !synced_length_fits(song.duration, q.duration) {
                        l.demote_to_plain(); // timed for another version
                    }
                    out.push(l);
                }
            }
        }
        Ok(out)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Song {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub duration: Option<f64>,
}

pub fn parse_search(res: &Value) -> Vec<Song> {
    res.pointer("/result/songs")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|s| {
            let artist = s
                .get("artists")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(|x| x.get("name").and_then(Value::as_str)).collect::<Vec<_>>().join(", "))
                .unwrap_or_default();
            Some(Song {
                id: s.get("id").and_then(Value::as_i64)?,
                title: s.get("name").and_then(Value::as_str)?.to_string(),
                artist,
                duration: s.get("duration").and_then(Value::as_f64).map(|ms| ms / 1000.0),
            })
        })
        .collect()
}

pub fn rank_songs(songs: Vec<Song>, title: &str, artist: &str, aliases: &[String], duration: Option<f64>) -> Vec<Song> {
    let mut scored: Vec<(f64, Song)> = songs
        .into_iter()
        .map(|s| {
            let cand = Candidate {
                title: &s.title,
                artist: &s.artist,
                duration: s.duration,
                has_synced: false,
            };
            (score_match(&cand, title, artist, aliases, duration), s)
        })
        .filter(|(score, _)| *score > MIN_MATCH_SCORE)
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));
    scored.into_iter().map(|(_, s)| s).collect()
}

/// Credit lines NetEase puts at the top of its LRC ("作词 : …").
fn is_credit(text: &str) -> bool {
    const CREDITS: [&str; 9] = ["作词", "作曲", "编曲", "制作人", "混音", "母带", "和声", "吉他", "录音"];
    let head = text.split([':', '：']).next().unwrap_or("").trim();
    text.contains([':', '：']) && CREDITS.iter().any(|c| head.starts_with(c))
}

pub fn lyrics_from_response(res: &Value, song: &Song) -> Option<Lyrics> {
    if res.get("nolyric").and_then(Value::as_bool) == Some(true) || res.get("pureMusic").and_then(Value::as_bool) == Some(true) {
        return None;
    }
    let lrc = res.pointer("/lrc/lyric").and_then(Value::as_str)?;
    let synced: Vec<_> = parse_lrc(lrc).into_iter().filter(|l| !is_credit(&l.text)).collect();
    let plain = (!synced.is_empty()).then(|| synced.iter().map(|l| l.text.as_str()).collect::<Vec<_>>().join("\n"));
    let lyrics = Lyrics {
        provider: ProviderId::Netease,
        id: song.id.to_string(),
        title: song.title.clone(),
        artist: song.artist.clone(),
        synced,
        plain,
        source_url: Some(format!("https://music.163.com/#/song?id={}", song.id)),
    };
    lyrics.has_text().then_some(lyrics)
}

impl LyricsProvider for Netease {
    fn id(&self) -> ProviderId {
        ProviderId::Netease
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(self.lookup(q))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn search_fixture() -> Value {
        json!({ "result": { "songs": [
            { "id": 1, "name": "Other Song", "artists": [{ "name": "Night Drive" }], "duration": 300000 },
            { "id": 2, "name": "Neon Runner", "artists": [{ "name": "Night Drive" }, { "name": "Feat" }], "duration": 301000 },
            { "name": "no id" }
        ]}, "code": 200 })
    }

    #[test]
    fn test_parse_and_rank_search() {
        let songs = parse_search(&search_fixture());
        assert_eq!(songs.len(), 2);
        assert_eq!(songs[1].artist, "Night Drive, Feat");
        assert_eq!(songs[1].duration, Some(301.0));
        let ranked = rank_songs(songs, "Neon Runner", "Night Drive", &[], Some(300.0));
        assert_eq!(ranked.iter().map(|s| s.id).collect::<Vec<_>>(), [2]);
    }

    #[test]
    fn test_lyrics_drop_credit_lines() {
        let song = Song { id: 2, title: "Neon Runner".into(), artist: "Night Drive".into(), duration: None };
        let res = json!({ "lrc": { "lyric": "[00:00.00] 作词 : Someone\n[00:00.50] 作曲 : Someone\n[00:10.00]First line\n[00:12.00]Time: 12" } });
        let l = lyrics_from_response(&res, &song).unwrap();
        assert_eq!(l.synced.iter().map(|x| x.text.as_str()).collect::<Vec<_>>(), ["First line", "Time: 12"]);
        assert_eq!(l.source_url.as_deref(), Some("https://music.163.com/#/song?id=2"));
    }

    #[test]
    fn test_instrumental_and_missing() {
        let song = Song { id: 2, title: "Neon Runner".into(), artist: "X".into(), duration: None };
        assert!(lyrics_from_response(&json!({ "pureMusic": true, "lrc": { "lyric": "[00:01.00]x" } }), &song).is_none());
        assert!(lyrics_from_response(&json!({ "nolyric": true }), &song).is_none());
        assert!(lyrics_from_response(&json!({ "lrc": { "lyric": "" } }), &song).is_none());
    }
}
