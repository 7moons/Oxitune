//! Unison (unison.betterlyrics.org): Better Lyrics' community lyrics, kept
//! per YouTube video, as LRC or TTML. Anyone can submit, so what comes
//! back is checked against the song before it is used.

use super::lrc::parse_lrc;
use super::matching::{artist_matches, clean_track_name, encode, token_similarity};
use super::ttml::parse_ttml;
use super::{Lyrics, LyricsProvider, ProviderId, Query};
use futures_util::future::BoxFuture;
use serde_json::Value;

const LYRICS_URL: &str = "https://unison.betterlyrics.org/lyrics";

pub struct Unison {
    http: reqwest::Client,
}

impl Unison {
    pub fn new(http: reqwest::Client) -> Self {
        Self { http }
    }
}

fn str_field<'a>(item: &'a Value, key: &str) -> &'a str {
    item.get(key).and_then(Value::as_str).unwrap_or("")
}

/// Whether a submission is about this song. Entries are keyed by video,
/// but a video's entry can be a test or another song's lyrics.
fn fits(data: &Value, q: &Query) -> bool {
    let (song, artist) = (str_field(data, "song").trim(), str_field(data, "artist"));
    if !artist_matches(artist, &q.artist, &q.artist_aliases) {
        return false;
    }
    let wanted = clean_track_name(&q.title);
    if song.is_empty() || wanted.trim().is_empty() {
        return true;
    }
    let (s, w) = (song.to_lowercase(), wanted.to_lowercase());
    token_similarity(song, &wanted) >= 0.25 || s.contains(&w) || w.contains(&s)
}

/// The `data` of a Unison answer as lyrics; `None` when it is hidden, about
/// another song or empty.
pub fn from_data(data: &Value, q: &Query) -> Option<Lyrics> {
    if data.get("hidden").and_then(Value::as_bool) == Some(true) || !fits(data, q) {
        return None;
    }
    let body = str_field(data, "lyrics").trim();
    let (synced, plain) = if body.starts_with('<') {
        let ttml = parse_ttml(body)?;
        (ttml.synced, ttml.plain)
    } else {
        let synced = parse_lrc(body);
        let plain = synced.is_empty().then(|| body.to_string());
        (synced, plain)
    };
    let lyrics = Lyrics {
        provider: ProviderId::Unison,
        id: data.get("id").map(|v| v.to_string()).unwrap_or_default(),
        title: str_field(data, "song").to_string(),
        artist: str_field(data, "artist").to_string(),
        synced,
        plain,
        source_url: None,
    };
    lyrics.has_text().then_some(lyrics)
}

impl LyricsProvider for Unison {
    fn id(&self) -> ProviderId {
        ProviderId::Unison
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(async move {
            let Some(video_id) = q.video_id.as_deref() else {
                return Ok(Vec::new());
            };
            let mut url = format!(
                "{LYRICS_URL}?v={}&song={}&artist={}",
                encode(video_id),
                encode(&clean_track_name(&q.title)),
                encode(q.artist.trim())
            );
            if let Some(d) = q.duration {
                url.push_str(&format!("&duration={}", d.round() as i64));
            }
            if let Some(album) = q.album.as_deref() {
                url.push_str(&format!("&album={}", encode(album)));
            }
            let res = self.http.get(url).send().await.map_err(|e| e.to_string())?;
            let status = res.status();
            let body: Value = res.json().await.map_err(|e| format!("unison: HTTP {status}: {e}"))?;
            if body.get("success").and_then(Value::as_bool) == Some(true) {
                return Ok(body.get("data").and_then(|d| from_data(d, q)).into_iter().collect());
            }
            match str_field(&body, "code") {
                "NOT_FOUND" => Ok(Vec::new()),
                code => Err(format!("unison: HTTP {status} {code}")),
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn query() -> Query {
        Query { video_id: Some("aaaaaaaaaaa".into()), title: "Neon Runner".into(), artist: "Night Drive".into(), ..Default::default() }
    }

    fn data(lyrics: &str) -> Value {
        json!({ "id": 12, "song": "Neon Runner", "artist": "Night Drive", "lyrics": lyrics, "format": "lrc", "hidden": false })
    }

    #[test]
    fn test_lrc_ttml_and_plain_bodies() {
        let lrc = from_data(&data("[00:01.00] One\n[00:05.00] Two"), &query()).unwrap();
        assert_eq!((lrc.id.as_str(), lrc.synced.len(), lrc.plain.is_none()), ("12", 2, true));

        let ttml = from_data(
            &data(r#"<tt xmlns="http://www.w3.org/ns/ttml"><body><div><p begin="1.0"><span begin="1.0" end="2.0">One</span></p></div></body></tt>"#),
            &query(),
        )
        .unwrap();
        assert!(ttml.synced[0].words.is_some());

        let plain = from_data(&data("One\nTwo"), &query()).unwrap();
        assert!(plain.synced.is_empty());
        assert_eq!(plain.plain.as_deref(), Some("One\nTwo"));
        assert!(from_data(&data("  "), &query()).is_none());
    }

    // A real answer for a well-known video was someone's "Test Song" by
    // "Test Artist": never the song's lyrics.
    #[test]
    fn test_submissions_about_another_song_are_dropped() {
        let mut test_entry = data("[00:01.00] Test line");
        test_entry["song"] = json!("Test Song");
        test_entry["artist"] = json!("Test Artist");
        assert!(from_data(&test_entry, &query()).is_none());

        let mut other_title = data("[00:01.00] Line");
        other_title["song"] = json!("Chrome Heart");
        assert!(from_data(&other_title, &query()).is_none());

        let mut hidden = data("[00:01.00] Line");
        hidden["hidden"] = json!(true);
        assert!(from_data(&hidden, &query()).is_none());

        let mut video_title = query();
        video_title.title = "Night Drive - Neon Runner (Official Video)".into();
        assert!(from_data(&data("[00:01.00] Line"), &video_title).is_some());
    }
}
