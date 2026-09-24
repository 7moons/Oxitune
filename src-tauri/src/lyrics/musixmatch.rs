//! Musixmatch through the unofficial desktop-app API (`apic-desktop`).
//! Off by default: it is not a public API, may break without notice and
//! may be against Musixmatch's terms. Gives synced lyrics and, for many
//! songs, word-by-word timing ("richsync").

use super::matching::{clean_track_name, encode, score_match, Candidate, MIN_MATCH_SCORE};
use super::{Line, Lyrics, LyricsProvider, ProviderId, Query, Word};
use futures_util::future::BoxFuture;
use parking_lot::Mutex;
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;

const BASE: &str = "https://apic-desktop.musixmatch.com/ws/1.1/";
const APP_ID: &str = "web-desktop-app-v1.0";
/// What the API hands out instead of a token while it is rate limiting.
const THROTTLED_TOKEN: &str = "UpgradeOnlyUpgradeOnlyUpgradeOnlyUpgradeOnly";

/// The anonymous user token, shared across lookups; dropped on a 401.
#[derive(Default)]
pub struct TokenCache {
    token: Mutex<Option<String>>,
}

pub struct Musixmatch {
    http: reqwest::Client,
    tokens: Arc<TokenCache>,
}

impl Musixmatch {
    pub fn new(tokens: Arc<TokenCache>) -> Self {
        let http = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Musixmatch/0.19.4 Chrome/58.0.3029.110 Electron/1.7.6 Safari/537.36")
            .timeout(Duration::from_secs(6))
            .build()
            .unwrap_or_default();
        Self { http, tokens }
    }

    async fn call(&self, method: &str, params: &str) -> Result<Value, String> {
        let url = format!("{BASE}{method}?format=json&app_id={APP_ID}&{params}");
        self.http
            .get(url)
            .header("authority", "apic-desktop.musixmatch.com")
            .header("cookie", "AWSELBCORS=0; AWSELB=0")
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<Value>()
            .await
            .map_err(|e| e.to_string())
    }

    async fn token(&self) -> Result<String, String> {
        if let Some(t) = self.tokens.token.lock().clone() {
            return Ok(t);
        }
        let res = self.call("token.get", "user_language=en").await?;
        let token = parse_token(&res)?;
        *self.tokens.token.lock() = Some(token.clone());
        Ok(token)
    }

    async fn lookup(&self, q: &Query) -> Result<Vec<Lyrics>, String> {
        let token = self.token().await?;
        let title = clean_track_name(&q.title);
        let duration = q.duration.map(|d| d.round() as i64).unwrap_or(0);
        let params = format!(
            "namespace=lyrics_richsynched&subtitle_format=mxm&q_track={}&q_artist={}&q_artists={}&q_album={}&q_duration={}&f_subtitle_length={}&usertoken={}",
            encode(&title),
            encode(&q.artist),
            encode(&q.artist),
            encode(q.album.as_deref().unwrap_or("")),
            duration,
            duration,
            encode(&token)
        );
        let res = self.call("macro.subtitles.get", &params).await?;
        if status(&res) == Some(401) {
            self.tokens.token.lock().take();
            return Err("token expired".into());
        }
        let Some(mut found) = parse_macro(&res) else {
            return Ok(Vec::new());
        };
        let cand = Candidate {
            title: &found.lyrics.title,
            artist: &found.lyrics.artist,
            duration: found.duration,
            has_synced: found.lyrics.is_synced(),
        };
        if score_match(&cand, &title, &q.artist, q.duration) <= MIN_MATCH_SCORE {
            return Ok(Vec::new());
        }

        if found.has_richsync {
            let params = format!("commontrack_id={}&usertoken={}", found.commontrack_id, encode(&token));
            if let Ok(res) = self.call("track.richsync.get", &params).await {
                if let Some(lines) = res
                    .pointer("/message/body/richsync/richsync_body")
                    .and_then(Value::as_str)
                    .and_then(parse_richsync)
                {
                    found.lyrics.synced = lines;
                }
            }
        }
        Ok(found.lyrics.has_text().then_some(found.lyrics).into_iter().collect())
    }
}

fn status(v: &Value) -> Option<i64> {
    v.pointer("/message/header/status_code").and_then(Value::as_i64)
}

pub fn parse_token(res: &Value) -> Result<String, String> {
    match res.pointer("/message/body/user_token").and_then(Value::as_str) {
        Some(THROTTLED_TOKEN) => Err("Musixmatch is rate limiting".into()),
        Some(t) if !t.is_empty() => Ok(t.to_string()),
        _ => Err(format!("no token (status {:?})", status(res))),
    }
}

pub struct MacroResult {
    pub lyrics: Lyrics,
    pub commontrack_id: i64,
    pub has_richsync: bool,
    pub duration: Option<f64>,
}

/// Reads `macro.subtitles.get`: the matched track, its line-synced
/// subtitle and its plain lyrics.
pub fn parse_macro(res: &Value) -> Option<MacroResult> {
    let calls = res.pointer("/message/body/macro_calls")?;
    let call = |name: &str| calls.get(name).filter(|c| status(c) == Some(200));

    let track = call("matcher.track.get")?.pointer("/message/body/track")?;
    if track.get("instrumental").and_then(Value::as_i64) == Some(1) {
        return None;
    }

    let synced = call("track.subtitles.get")
        .and_then(|c| c.pointer("/message/body/subtitle_list/0/subtitle/subtitle_body"))
        .and_then(Value::as_str)
        .and_then(parse_subtitle_body)
        .unwrap_or_default();

    let plain = call("track.lyrics.get")
        .and_then(|c| c.pointer("/message/body/lyrics"))
        .filter(|l| l.get("restricted").and_then(Value::as_i64) != Some(1))
        .and_then(|l| l.get("lyrics_body"))
        .and_then(Value::as_str)
        .map(strip_disclaimer)
        .filter(|p| !p.is_empty());

    let text = |k: &str| track.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    Some(MacroResult {
        lyrics: Lyrics {
            provider: ProviderId::Musixmatch,
            id: track.get("commontrack_id").map(Value::to_string).unwrap_or_default(),
            title: text("track_name"),
            artist: text("artist_name"),
            synced,
            plain,
            source_url: track
                .get("track_share_url")
                .and_then(Value::as_str)
                .map(|u| u.split('?').next().unwrap_or(u).to_string()),
        },
        commontrack_id: track.get("commontrack_id").and_then(Value::as_i64).unwrap_or(0),
        has_richsync: track.get("has_richsync").and_then(Value::as_i64) == Some(1),
        duration: track.get("track_length").and_then(Value::as_f64),
    })
}

/// Musixmatch's free plain lyrics end with a disclaimer line and an id.
fn strip_disclaimer(body: &str) -> String {
    let cut = body.find("*******").unwrap_or(body.len());
    body[..cut].trim().to_string()
}

/// `subtitle_body`: a JSON string of `[{ text, time: { total } }]`.
pub fn parse_subtitle_body(body: &str) -> Option<Vec<Line>> {
    let items: Vec<Value> = serde_json::from_str(body).ok()?;
    let lines: Vec<Line> = items
        .iter()
        .filter_map(|i| {
            let t = i.pointer("/time/total").and_then(Value::as_f64)?;
            let text = i.get("text").and_then(Value::as_str)?.trim().to_string();
            (!text.is_empty()).then_some(Line { t, text, words: None })
        })
        .collect();
    (!lines.is_empty()).then_some(lines)
}

/// `richsync_body`: a JSON string of `[{ ts, x, l: [{ c, o }] }]`, where
/// `ts` is the line start, `x` its text and each `c` a word or a space
/// starting `o` seconds into the line. Spaces are kept on the word before
/// them so the words concatenate back to the line.
pub fn parse_richsync(body: &str) -> Option<Vec<Line>> {
    let items: Vec<Value> = serde_json::from_str(body).ok()?;
    let lines: Vec<Line> = items
        .iter()
        .filter_map(|i| {
            let ts = i.get("ts").and_then(Value::as_f64)?;
            let text = i.get("x").and_then(Value::as_str)?.trim().to_string();
            if text.is_empty() {
                return None;
            }
            let mut words: Vec<Word> = Vec::new();
            for part in i.get("l").and_then(Value::as_array).into_iter().flatten() {
                let c = part.get("c").and_then(Value::as_str).unwrap_or("");
                let o = part.get("o").and_then(Value::as_f64).unwrap_or(0.0);
                match words.last_mut() {
                    Some(last) if c.trim().is_empty() => last.text.push_str(c),
                    _ if c.is_empty() => {}
                    _ => words.push(Word { t: ts + o, text: c.to_string() }),
                }
            }
            Some(Line {
                t: ts,
                text,
                words: (!words.is_empty()).then_some(words),
            })
        })
        .collect();
    (!lines.is_empty()).then_some(lines)
}

impl LyricsProvider for Musixmatch {
    fn id(&self) -> ProviderId {
        ProviderId::Musixmatch
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(self.lookup(q))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn ok(body: Value) -> Value {
        json!({ "message": { "header": { "status_code": 200 }, "body": body } })
    }

    #[test]
    fn test_parse_token() {
        assert_eq!(parse_token(&ok(json!({ "user_token": "abc" }))).unwrap(), "abc");
        assert!(parse_token(&ok(json!({ "user_token": THROTTLED_TOKEN }))).is_err());
        assert!(parse_token(&json!({ "message": { "header": { "status_code": 401 }, "body": "" } })).is_err());
    }

    #[test]
    fn test_parse_macro_fixture() {
        let subtitle = json!([
            { "text": "First", "time": { "total": 1.5, "minutes": 0, "seconds": 1, "hundredths": 50 } },
            { "text": "", "time": { "total": 3.0 } },
            { "text": "Second", "time": { "total": 4.25 } }
        ])
        .to_string();
        let res = ok(json!({ "macro_calls": {
            "matcher.track.get": ok(json!({ "track": {
                "commontrack_id": 777, "track_name": "Maniac", "artist_name": "Carpenter Brut",
                "track_length": 300, "has_richsync": 1, "instrumental": 0,
                "track_share_url": "https://www.musixmatch.com/lyrics/Carpenter-Brut/Maniac?utm_source=x"
            }})),
            "track.subtitles.get": ok(json!({ "subtitle_list": [{ "subtitle": { "subtitle_body": subtitle } }] })),
            "track.lyrics.get": ok(json!({ "lyrics": { "lyrics_body": "First\nSecond\n\n******* This Lyrics is NOT for Commercial use *******\n(1409)", "restricted": 0 } }))
        }}));

        let found = parse_macro(&res).unwrap();
        assert_eq!((found.commontrack_id, found.has_richsync, found.duration), (777, true, Some(300.0)));
        let l = found.lyrics;
        assert_eq!(l.synced.iter().map(|x| (x.t, x.text.as_str())).collect::<Vec<_>>(), [(1.5, "First"), (4.25, "Second")]);
        assert_eq!(l.plain.as_deref(), Some("First\nSecond"));
        assert_eq!(l.source_url.as_deref(), Some("https://www.musixmatch.com/lyrics/Carpenter-Brut/Maniac"));
        assert_eq!(l.id, "777");
    }

    #[test]
    fn test_parse_macro_skips_instrumental_and_restricted() {
        let instrumental = ok(json!({ "macro_calls": {
            "matcher.track.get": ok(json!({ "track": { "commontrack_id": 1, "instrumental": 1 } }))
        }}));
        assert!(parse_macro(&instrumental).is_none());

        let restricted = ok(json!({ "macro_calls": {
            "matcher.track.get": ok(json!({ "track": { "commontrack_id": 1, "track_name": "A", "artist_name": "B" } })),
            "track.lyrics.get": ok(json!({ "lyrics": { "lyrics_body": "", "restricted": 1 } })),
            "track.subtitles.get": json!({ "message": { "header": { "status_code": 404 }, "body": "" } })
        }}));
        let found = parse_macro(&restricted).unwrap();
        assert!(!found.lyrics.has_text());
    }

    #[test]
    fn test_parse_richsync_words() {
        let body = json!([
            { "ts": 10.0, "te": 12.0, "x": "Hello world", "l": [
                { "c": "Hello", "o": 0.0 }, { "c": " ", "o": 0.4 }, { "c": "world", "o": 0.5 }
            ]},
            { "ts": 13.0, "te": 14.0, "x": "", "l": [] }
        ])
        .to_string();
        let lines = parse_richsync(&body).unwrap();
        assert_eq!(lines.len(), 1);
        let words = lines[0].words.as_ref().unwrap();
        assert_eq!(words.iter().map(|w| (w.t, w.text.as_str())).collect::<Vec<_>>(), [(10.0, "Hello "), (10.5, "world")]);
        assert!(parse_richsync("not json").is_none());
    }
}
