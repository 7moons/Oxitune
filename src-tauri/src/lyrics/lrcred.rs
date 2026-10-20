//! lrc.red: lyrics timed word by word (TTML), with duet voices and
//! background vocals. A search returns matching recordings; each one's
//! lyrics are a separate TTML document.

use super::matching::{clean_track_name, encode, fit_synced_to_song, score_match, Candidate, MIN_MATCH_SCORE};
use super::ttml::{parse_ttml, MAX_TTML_BYTES};
use super::{Lyrics, LyricsProvider, ProviderId, Query};
use futures_util::future::BoxFuture;
use serde_json::Value;

const SEARCH_URL: &str = "https://lrc.red/api/v1";
const SITE_URL: &str = "https://lrc.red/";
/// Lyrics documents fetched per lookup: the best match, and one more for
/// "Wrong lyrics?".
const MAX_DOCUMENTS: usize = 2;

pub struct LrcRed {
    http: reqwest::Client,
}

impl LrcRed {
    pub fn new(http: reqwest::Client) -> Self {
        Self { http }
    }
}

fn str_field<'a>(item: &'a Value, key: &str) -> &'a str {
    item.get(key).and_then(Value::as_str).unwrap_or("")
}

fn is_timed(item: &Value) -> bool {
    matches!(str_field(item, "timing_type"), "word" | "line" | "syllable")
}

/// The result's lyrics document, only when it is on lrc.red itself: the
/// address comes from a response and must not send the app elsewhere.
pub fn document_url(item: &Value) -> Option<url::Url> {
    let url = url::Url::parse(str_field(item, "lyricsUrl")).ok()?;
    (url.scheme() == "https" && url.host_str() == Some("lrc.red") && url.path().ends_with(".ttml")).then_some(url)
}

/// Search results that match the song and have a lyrics document, best first.
pub fn rank_results<'a>(results: &'a [Value], q: &Query) -> Vec<&'a Value> {
    let title = clean_track_name(&q.title);
    let mut scored: Vec<(f64, &Value)> = results
        .iter()
        .filter(|item| document_url(item).is_some())
        .map(|item| {
            let cand = Candidate {
                title: str_field(item, "track_name"),
                artist: str_field(item, "artist_name"),
                duration: item.get("duration").and_then(Value::as_f64),
                has_synced: is_timed(item),
            };
            (score_match(&cand, &title, q.artist.trim(), &q.artist_aliases, q.duration), item)
        })
        .filter(|(score, _)| *score > MIN_MATCH_SCORE)
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));
    scored.into_iter().map(|(_, item)| item).collect()
}

/// A search result and its TTML document as lyrics for a `song`-long song.
pub fn from_document(item: &Value, ttml: &str, song: Option<f64>) -> Option<Lyrics> {
    let parsed = parse_ttml(ttml)?;
    let mut lyrics = Lyrics {
        provider: ProviderId::Lrcred,
        id: str_field(item, "id").to_string(),
        title: str_field(item, "track_name").to_string(),
        artist: str_field(item, "artist_name").to_string(),
        synced: parsed.synced,
        plain: parsed.plain,
        source_url: Some(SITE_URL.to_string()),
    };
    // Timed for a recording of another length: only its words are used.
    let found = item.get("duration").and_then(Value::as_f64);
    if lyrics.is_synced() && !fit_synced_to_song(&mut lyrics.synced, found, song) {
        lyrics.demote_to_plain();
    }
    lyrics.has_text().then_some(lyrics)
}

async fn search(http: &reqwest::Client, query: &str) -> Result<Vec<Value>, String> {
    let res = http.get(format!("{SEARCH_URL}?{query}")).send().await.map_err(|e| e.to_string())?;
    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(Vec::new());
    }
    if !res.status().is_success() {
        return Err(format!("lrc.red search: HTTP {}", res.status()));
    }
    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(body.get("results").and_then(Value::as_array).cloned().unwrap_or_default())
}

async fn document(http: &reqwest::Client, url: url::Url) -> Option<String> {
    let res = http.get(url).send().await.ok()?;
    if !res.status().is_success() || res.content_length().is_some_and(|len| len > MAX_TTML_BYTES as u64) {
        return None;
    }
    res.text().await.ok()
}

impl LyricsProvider for LrcRed {
    fn id(&self) -> ProviderId {
        ProviderId::Lrcred
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(async move {
            let title = clean_track_name(&q.title);
            let artist = q.artist.trim();
            if title.trim().is_empty() {
                return Ok(Vec::new());
            }
            let mut by_fields = format!("track={}&artist={}", encode(&title), encode(artist));
            if let Some(d) = q.duration {
                by_fields.push_str(&format!("&duration={}", d.round() as i64));
            }
            let mut results = search(&self.http, &by_fields).await?;
            if rank_results(&results, q).is_empty() {
                // Several artists in one string ("A, B & C") rarely match as a field.
                results = search(&self.http, &format!("q={}", encode(&format!("{artist} {title}")))).await?;
            }

            let mut found = Vec::new();
            for item in rank_results(&results, q).into_iter().take(MAX_DOCUMENTS) {
                let Some(url) = document_url(item) else { continue };
                if let Some(lyrics) = document(&self.http, url).await.and_then(|ttml| from_document(item, &ttml, q.duration)) {
                    found.push(lyrics);
                }
            }
            Ok(found)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn result(id: &str, title: &str, artist: &str, duration: f64, timing: &str) -> Value {
        json!({ "id": id, "isrc": id, "track_name": title, "artist_name": artist, "album_name": "Album",
            "duration": duration, "timing_type": timing, "lyricsUrl": format!("https://lrc.red/s/{id}.ttml") })
    }

    fn query() -> Query {
        Query { title: "Take A Turn".into(), artist: "Paper Moths".into(), duration: Some(210.0), ..Default::default() }
    }

    const TTML: &str = r#"<tt xmlns="http://www.w3.org/ns/ttml"><body><div>
        <p begin="10.000" end="12.000"><span begin="10.000" end="11.000">Made</span> <span begin="11.000" end="12.000">up</span></p>
    </div></body></tt>"#;

    #[test]
    fn test_rank_prefers_the_right_song_timed_and_of_the_right_length() {
        let results = vec![
            result("A", "Different Song", "Paper Moths", 210.0, "word"),
            result("B", "Take A Turn", "Paper Moths", 190.0, "word"),
            result("C", "Take A Turn", "Paper Moths", 211.0, "none"),
            result("D", "Take A Turn", "Paper Moths", 211.0, "word"),
            result("E", "Take A Turn", "Someone Else", 210.0, "word"),
        ];
        let ranked: Vec<&str> = rank_results(&results, &query()).into_iter().map(|r| r["id"].as_str().unwrap()).collect();
        assert_eq!(ranked, ["D", "C", "B"]);
    }

    #[test]
    fn test_document_must_be_on_lrc_red() {
        let ok = result("X", "T", "A", 1.0, "word");
        assert_eq!(document_url(&ok).unwrap().as_str(), "https://lrc.red/s/X.ttml");
        for bad in [
            "http://lrc.red/s/X.ttml",
            "https://evil.example/s/X.ttml",
            "https://lrc.red.evil.example/s/X.ttml",
            "https://lrc.red/s/X.exe",
            "file:///etc/passwd",
            "",
        ] {
            let mut item = ok.clone();
            item["lyricsUrl"] = json!(bad);
            assert!(document_url(&item).is_none(), "{bad}");
            assert!(rank_results(&[item], &query()).is_empty());
        }
    }

    #[test]
    fn test_document_becomes_word_timed_lyrics() {
        let item = result("D", "Take A Turn", "Paper Moths", 211.0, "word");
        let l = from_document(&item, TTML, Some(210.0)).unwrap();
        assert_eq!((l.provider, l.id.as_str(), l.title.as_str()), (ProviderId::Lrcred, "D", "Take A Turn"));
        assert_eq!(l.synced[0].words.as_ref().unwrap().len(), 2);
        assert_eq!(l.synced[0].text, "Made up");
    }

    #[test]
    fn test_lyrics_of_another_length_keep_only_their_words() {
        let item = result("B", "Take A Turn", "Paper Moths", 150.0, "word");
        let l = from_document(&item, TTML, Some(210.0)).unwrap();
        assert!(l.synced.is_empty());
        assert_eq!(l.plain.as_deref(), Some("Made up"));
        assert!(from_document(&item, "<html>Sorry</html>", Some(210.0)).is_none());
    }

    // Regression: "Ebe ebe" is 207 s on the album and 157 s on YouTube (the
    // video ends where the album's first part does). Its lyrics were shown
    // as plain text, with nothing highlighted.
    #[test]
    fn test_a_longer_recording_keeps_the_timing_of_the_lines_within_the_song() {
        let album = result("L", "Take A Turn", "Paper Moths", 207.0, "line");
        let ttml = r#"<tt xmlns="http://www.w3.org/ns/ttml"><body>
            <div><p begin="19.0" end="21.0">First</p><p begin="100.0" end="103.0">Second</p><p begin="150.0" end="156.0">Third</p></div>
            <div><p begin="166.0" end="170.0">Only on the album</p><p begin="190.0" end="195.0">Also</p></div>
        </body></tt>"#;
        let l = from_document(&album, ttml, Some(157.0)).unwrap();
        assert_eq!(l.synced.iter().map(|x| x.text.as_str()).collect::<Vec<_>>(), ["First", "Second", "Third"]);
        // Most of the lyrics would be gone: another version, text only.
        let short = from_document(&album, ttml, Some(60.0)).unwrap();
        assert!(short.synced.is_empty() && short.plain.is_some());
    }

    #[tokio::test]
    #[ignore = "network"]
    async fn test_live_lrcred() {
        let http = reqwest::Client::builder().user_agent("Oxitune-tests").build().unwrap();
        let q = Query { title: "Always Coming Back Around".into(), artist: "Rob Ashby".into(), duration: Some(213.0), ..Default::default() };
        let found = LrcRed::new(http).search(&q).await.unwrap();
        assert!(found.first().is_some_and(|l| l.synced.iter().any(|line| line.words.is_some())));
    }
}
