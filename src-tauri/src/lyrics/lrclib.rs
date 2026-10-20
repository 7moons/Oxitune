//! LRCLIB (lrclib.net): open database with synced and plain lyrics.

use super::lrc::parse_lrc;
use super::matching::{clean_track_name, encode, fit_synced_to_song, score_match, Candidate, MIN_MATCH_SCORE};
use super::{Lyrics, LyricsProvider, ProviderId, Query};
use futures_util::future::BoxFuture;
use serde_json::Value;

pub struct Lrclib {
    http: reqwest::Client,
}

impl Lrclib {
    pub fn new(http: reqwest::Client) -> Self {
        Self { http }
    }
}

fn str_field<'a>(item: &'a Value, key: &str) -> &'a str {
    item.get(key).and_then(Value::as_str).unwrap_or("")
}

fn has_synced(item: &Value) -> bool {
    !str_field(item, "syncedLyrics").trim().is_empty()
}

/// Search results that match the song, best first.
pub fn rank_items(items: &[Value], title: &str, artist: &str, aliases: &[String], duration: Option<f64>) -> Vec<Value> {
    let mut scored: Vec<(f64, &Value)> = items
        .iter()
        .map(|item| {
            let cand = Candidate {
                title: str_field(item, "trackName"),
                artist: str_field(item, "artistName"),
                duration: item.get("duration").and_then(Value::as_f64),
                has_synced: has_synced(item),
            };
            (score_match(&cand, title, artist, aliases, duration), item)
        })
        .filter(|(score, _)| *score > MIN_MATCH_SCORE)
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));
    scored.into_iter().map(|(_, item)| item.clone()).collect()
}

/// One LRCLIB record as `Lyrics`; `None` when it has no text (instrumental).
pub fn from_item(item: &Value) -> Option<Lyrics> {
    let synced = parse_lrc(str_field(item, "syncedLyrics"));
    let plain = Some(str_field(item, "plainLyrics").trim().to_string()).filter(|p| !p.is_empty());
    let lyrics = Lyrics {
        provider: ProviderId::Lrclib,
        id: item.get("id").map(|v| v.to_string()).unwrap_or_default(),
        title: str_field(item, "trackName").to_string(),
        artist: str_field(item, "artistName").to_string(),
        synced,
        plain,
        source_url: None,
    };
    lyrics.has_text().then_some(lyrics)
}

/// A record as lyrics for a `song`-long song: timed for a recording of
/// another length, only its words are used.
pub fn fitted(item: &Value, song: Option<f64>) -> Option<Lyrics> {
    let mut lyrics = from_item(item)?;
    let found = item.get("duration").and_then(Value::as_f64);
    if lyrics.is_synced() && !fit_synced_to_song(&mut lyrics.synced, found, song) {
        log::info!(
            "[Oxitune Lyrics] lrclib \"{}\" is {:.0} s, song is {:.0} s: using it as plain text",
            lyrics.title,
            found.unwrap_or_default(),
            song.unwrap_or_default()
        );
        lyrics.demote_to_plain();
    }
    Some(lyrics)
}

async fn get_json(http: &reqwest::Client, url: &str) -> Option<Value> {
    let res = http.get(url).send().await.ok()?;
    if !res.status().is_success() {
        return None;
    }
    res.json::<Value>().await.ok()
}

/// Raw LRCLIB records for the song, best first: the exact-match endpoint,
/// then structured search, then free-text searches.
pub async fn lookup(
    http: &reqwest::Client,
    artist: &str,
    title: &str,
    aliases: &[String],
    album: Option<&str>,
    duration: Option<f64>,
) -> Vec<Value> {
    let clean_title = clean_track_name(title);
    let clean_artist = artist.trim();

    let mut get_url = format!(
        "https://lrclib.net/api/get?artist_name={}&track_name={}",
        encode(clean_artist),
        encode(&clean_title)
    );
    if let Some(album) = album.filter(|a| !a.is_empty()) {
        get_url.push_str(&format!("&album_name={}", encode(album)));
    }
    if let Some(d) = duration {
        get_url.push_str(&format!("&duration={}", d.round() as i64));
    }
    if let Some(val) = get_json(http, &get_url).await {
        if val.get("syncedLyrics").is_some() || val.get("plainLyrics").is_some() {
            return vec![val];
        }
    }

    let searches = [
        format!(
            "https://lrclib.net/api/search?track_name={}&artist_name={}",
            encode(&clean_title),
            encode(clean_artist)
        ),
        format!("https://lrclib.net/api/search?q={}+{}", encode(clean_artist), encode(&clean_title)),
        format!("https://lrclib.net/api/search?q={}", encode(title)),
    ];
    for url in searches {
        if let Some(Value::Array(items)) = get_json(http, &url).await {
            let ranked = rank_items(&items, &clean_title, clean_artist, aliases, duration);
            if !ranked.is_empty() {
                return ranked;
            }
        }
    }
    Vec::new()
}

impl LyricsProvider for Lrclib {
    fn id(&self) -> ProviderId {
        ProviderId::Lrclib
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(async move {
            let items = lookup(&self.http, &q.artist, &q.title, &q.artist_aliases, q.album.as_deref(), q.duration).await;
            Ok(items.iter().filter_map(|item| fitted(item, q.duration)).collect())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_synced_lyrics_of_another_length_become_plain() {
        let item = json!({ "id": 7, "trackName": "Lantern", "artistName": "Ironvine", "duration": 150.0,
            "syncedLyrics": "[00:10.00]The quiet part of me", "plainLyrics": "The quiet part of me" });
        let far = fitted(&item, Some(187.0)).unwrap();
        assert!(far.synced.is_empty() && far.plain.is_some(), "37 s shorter: words only");
        assert!(fitted(&item, Some(155.0)).unwrap().is_synced(), "5 s off: kept synced");
        assert!(fitted(&item, None).unwrap().is_synced(), "unknown length: kept");
        // Longer than the song, and its line (10 s) is sung within it: the
        // song with more after it.
        assert!(fitted(&item, Some(120.0)).unwrap().is_synced());
        assert!(fitted(&item, Some(9.0)).unwrap().synced.is_empty());
    }

    #[test]
    fn test_rank_items_rejects_unrelated_songs_even_with_matching_duration() {
        let items = vec![
            json!({ "id": 1, "trackName": "Different Song", "artistName": "Paper Moths", "duration": 210.0, "syncedLyrics": "[00:10.00]Wrong" }),
            json!({ "id": 2, "trackName": "Take A Turn", "artistName": "Paper Moths", "duration": 212.0, "syncedLyrics": "[00:10.00]Right" }),
        ];
        let ranked = rank_items(&items, "Take A Turn", "Paper Moths", &[], Some(210.0));
        assert_eq!(ranked.len(), 1);
        assert_eq!(ranked[0]["trackName"], "Take A Turn");
    }

    #[test]
    fn test_from_item_parses_synced_and_plain() {
        let item = json!({
            "id": 42, "trackName": "Neon Runner", "artistName": "Night Drive",
            "syncedLyrics": "[00:01.00]One\n[00:02.00]Two", "plainLyrics": "One\nTwo", "instrumental": false
        });
        let l = from_item(&item).unwrap();
        assert_eq!((l.id.as_str(), l.synced.len(), l.plain.as_deref()), ("42", 2, Some("One\nTwo")));
        assert_eq!(l.synced[1].text, "Two");
    }

    #[test]
    fn test_instrumental_record_is_not_lyrics() {
        let item = json!({ "id": 1, "trackName": "Intro", "artistName": "X", "syncedLyrics": null, "plainLyrics": null, "instrumental": true });
        assert!(from_item(&item).is_none());
    }

    #[tokio::test]
    #[ignore = "network"]
    async fn test_live_lrclib() {
        let found = Lrclib::new(reqwest::Client::new())
            .search(&Query { title: "Take A Turn".into(), artist: "Paper Moths".into(), ..Default::default() })
            .await
            .unwrap();
        assert!(!found.is_empty());
    }
}
