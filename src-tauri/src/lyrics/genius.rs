//! Genius: plain lyrics only, read from the song page's HTML (the lyrics
//! aren't in its public API).

use super::matching::{clean_track_name, encode, score_match, Candidate, MIN_MATCH_SCORE};
use super::{decode_entities, Lyrics, LyricsProvider, ProviderId, Query};
use futures_util::future::BoxFuture;
use serde_json::Value;
use std::time::Duration;

pub struct Genius {
    http: reqwest::Client,
}

impl Default for Genius {
    fn default() -> Self {
        Self::new()
    }
}

impl Genius {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
            .timeout(Duration::from_secs(6))
            .build()
            .unwrap_or_default();
        Self { http }
    }

    async fn lookup(&self, q: &Query) -> Result<Vec<Lyrics>, String> {
        let title = clean_track_name(&q.title);
        let url = format!(
            "https://genius.com/api/search/song?per_page=5&q={}",
            encode(&format!("{} {}", q.artist, title))
        );
        let res: Value = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;
        let Some(hit) = best_hit(&res, &title, &q.artist, &q.artist_aliases) else {
            return Ok(Vec::new());
        };
        let html = self
            .http
            .get(&hit.url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;
        let Some(plain) = extract_lyrics(&html) else {
            return Ok(Vec::new());
        };
        Ok(vec![Lyrics {
            provider: ProviderId::Genius,
            id: hit.id,
            title: hit.title,
            artist: hit.artist,
            synced: Vec::new(),
            plain: Some(plain),
            source_url: Some(hit.url),
        }])
    }
}

#[derive(Debug, PartialEq)]
pub struct Hit {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub url: String,
}

/// The best-matching song from `/api/search/song`.
pub fn best_hit(res: &Value, title: &str, artist: &str, aliases: &[String]) -> Option<Hit> {
    res.pointer("/response/sections/0/hits")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|h| {
            let r = h.get("result")?;
            let hit = Hit {
                id: r.get("id").map(Value::to_string)?,
                title: r.get("title").and_then(Value::as_str)?.to_string(),
                artist: r.pointer("/primary_artist/name").and_then(Value::as_str).unwrap_or("").to_string(),
                url: r.get("url").and_then(Value::as_str).filter(|u| u.starts_with("https://genius.com/"))?.to_string(),
            };
            let cand = Candidate { title: &hit.title, artist: &hit.artist, duration: None, has_synced: false };
            let score = score_match(&cand, title, artist, aliases, None);
            (score > MIN_MATCH_SCORE).then_some((score, hit))
        })
        .max_by(|a, b| a.0.total_cmp(&b.0))
        .map(|(_, hit)| hit)
}

/// The text of every `data-lyrics-container="true"` element: `<br>` is a
/// line break, other tags are dropped, and subtrees marked
/// `data-exclude-from-selection` (Genius's header and ad slots) are skipped.
pub fn extract_lyrics(html: &str) -> Option<String> {
    let mut out = String::new();
    let mut rest = html;
    // Depth inside the current container (0 = outside) and depth at which
    // an excluded subtree started.
    let mut depth = 0usize;
    let mut excluded_at: Option<usize> = None;

    while let Some(lt) = rest.find('<') {
        if depth > 0 && excluded_at.is_none() {
            out.push_str(&rest[..lt]);
        }
        let Some(gt) = rest[lt..].find('>') else { break };
        let tag = &rest[lt + 1..lt + gt];
        rest = &rest[lt + gt + 1..];

        let closing = tag.starts_with('/');
        let name: String = tag
            .trim_start_matches('/')
            .chars()
            .take_while(|c| c.is_ascii_alphanumeric())
            .collect::<String>()
            .to_ascii_lowercase();
        let self_closing = tag.ends_with('/') || matches!(name.as_str(), "br" | "img" | "hr" | "input" | "meta" | "link");

        if depth == 0 {
            if !closing && tag.contains("data-lyrics-container=\"true\"") {
                if !out.is_empty() {
                    out.push('\n');
                }
                depth = 1;
            }
            continue;
        }

        if name == "br" {
            if excluded_at.is_none() {
                out.push('\n');
            }
            continue;
        }
        if self_closing {
            continue;
        }
        if closing {
            depth -= 1;
            if excluded_at == Some(depth) {
                excluded_at = None;
            }
        } else {
            if excluded_at.is_none() && tag.contains("data-exclude-from-selection=\"true\"") {
                excluded_at = Some(depth);
            }
            depth += 1;
        }
    }

    let text = decode_entities(&out);
    let lines: Vec<&str> = text.lines().map(str::trim).collect();
    let mut cleaned = String::new();
    let mut blank = 0;
    for line in lines {
        if line.is_empty() {
            blank += 1;
            continue;
        }
        if !cleaned.is_empty() {
            cleaned.push_str(if blank > 0 { "\n\n" } else { "\n" });
        }
        blank = 0;
        cleaned.push_str(line);
    }
    (!cleaned.is_empty()).then_some(cleaned)
}

impl LyricsProvider for Genius {
    fn id(&self) -> ProviderId {
        ProviderId::Genius
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(self.lookup(q))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const PAGE: &str = r#"<html><body><div class="Header">Not lyrics</div>
<div data-lyrics-container="true" class="Lyrics__Container">
  <div data-exclude-from-selection="true"><span>12 Contributors</span><div>Maniac Lyrics</div></div>
  [Verse 1]<br/>I&#x27;m a <a href="/x"><span>maniac</span></a>, maniac<br>On the floor &amp; more<br/>
</div>
<div class="Ad">Buy stuff</div>
<div data-lyrics-container="true"><br/>[Chorus]<br/>Last line</div>
</body></html>"#;

    #[test]
    fn test_extract_lyrics_from_page() {
        assert_eq!(
            extract_lyrics(PAGE).unwrap(),
            "[Verse 1]\nI'm a maniac, maniac\nOn the floor & more\n\n[Chorus]\nLast line"
        );
    }

    #[test]
    fn test_page_without_container() {
        assert!(extract_lyrics("<html><div>nothing</div></html>").is_none());
    }

    #[test]
    fn test_best_hit_matches_title_and_rejects_foreign_urls() {
        let res = json!({ "response": { "sections": [{ "hits": [
            { "result": { "id": 1, "title": "Something Else", "primary_artist": { "name": "Carpenter Brut" }, "url": "https://genius.com/a" } },
            { "result": { "id": 2, "title": "Maniac", "primary_artist": { "name": "Carpenter Brut" }, "url": "https://genius.com/Carpenter-brut-maniac-lyrics" } },
            { "result": { "id": 3, "title": "Maniac", "primary_artist": { "name": "Carpenter Brut" }, "url": "https://evil.example/x" } }
        ]}]}});
        let hit = best_hit(&res, "Maniac", "Carpenter Brut", &[]).unwrap();
        assert_eq!(hit.id, "2");
        assert!(best_hit(&json!({}), "Maniac", "X", &[]).is_none());
    }
}
