//! Translation and romanization of the playing song's lyrics, line by line,
//! through Google Translate's public web endpoint (the one browser
//! extensions use; unofficial, so both are off until the user turns them
//! on, and a refusal is an ordinary error, never worked around).
//!
//! Lines go out joined by newlines, a few thousand characters at a time,
//! and the answer is split back on newlines; a chunk that comes back with
//! another number of lines is left untranslated rather than guessed at.

use parking_lot::Mutex;
use serde_json::Value;
use std::collections::HashMap;

const ENDPOINT: &str = "https://translate.googleapis.com/translate_a/single";
/// Encoded size of one request's text: well under the URL length the
/// endpoint accepts.
const MAX_CHUNK_ENCODED_BYTES: usize = 6000;
/// Songs whose translations are kept in memory.
const MAX_CACHED: usize = 64;

#[derive(Default)]
pub struct TranslationCache(Mutex<HashMap<String, Vec<Option<String>>>>);

impl TranslationCache {
    pub fn get(&self, key: &str) -> Option<Vec<Option<String>>> {
        self.0.lock().get(key).cloned()
    }

    pub fn put(&self, key: String, lines: Vec<Option<String>>) {
        let mut map = self.0.lock();
        if map.len() >= MAX_CACHED && !map.contains_key(&key) {
            map.clear();
        }
        map.insert(key, lines);
    }
}

/// A language tag the endpoint takes: `pl`, `zh-CN`, `sr-Latn`.
pub fn is_lang(tag: &str) -> bool {
    let mut parts = tag.split('-');
    let ok = |p: &str, min: usize, max: usize| (min..=max).contains(&p.len()) && p.bytes().all(|b| b.is_ascii_alphabetic());
    parts.next().is_some_and(|p| ok(p, 2, 3)) && parts.next().is_none_or(|p| ok(p, 2, 4)) && parts.next().is_none()
}

/// Whether a line is written in a script other than Latin (so that showing
/// how it is pronounced helps).
pub fn needs_romanization(text: &str) -> bool {
    text.chars().any(|c| {
        c.is_alphabetic()
            && !matches!(c,
                'A'..='Z' | 'a'..='z'
                | '\u{00C0}'..='\u{024F}'   // Latin-1 letters, Latin Extended-A/B
                | '\u{1E00}'..='\u{1EFF}'   // Latin Extended Additional
                | '\u{FF21}'..='\u{FF3A}' | '\u{FF41}'..='\u{FF5A}') // fullwidth Latin
    })
}

/// Splits the indices of the lines worth sending into requests.
pub fn chunks(lines: &[String], wanted: impl Fn(&str) -> bool) -> Vec<Vec<usize>> {
    let mut out: Vec<Vec<usize>> = Vec::new();
    let mut size = 0;
    for (i, line) in lines.iter().enumerate() {
        if line.trim().is_empty() || !wanted(line) {
            continue;
        }
        let encoded = super::matching::encode(line).len() + 3; // + the newline
        if out.is_empty() || size + encoded > MAX_CHUNK_ENCODED_BYTES {
            out.push(Vec::new());
            size = 0;
        }
        size += encoded;
        out.last_mut().expect("pushed above").push(i);
    }
    out
}

/// The translated text and the language the endpoint detected, from a
/// `dt=t` answer: `[[["Cześć\n","Hello\n",…],["świecie","world",…]],null,"en",…]`.
pub fn parse_translation(body: &Value) -> Option<(String, Option<String>)> {
    let segments = body.get(0)?.as_array()?;
    let text: String = segments.iter().filter_map(|s| s.get(0).and_then(Value::as_str)).collect();
    let detected = body.get(2).and_then(Value::as_str).map(str::to_string);
    (!text.is_empty()).then_some((text, detected))
}

/// The source text in Latin letters, from a `dt=rm` answer:
/// `[[[null,null,null,"Privet mir\nSpasibo"]],null,"ru",…]`.
pub fn parse_romanization(body: &Value) -> Option<String> {
    body.get(0)?
        .as_array()?
        .iter()
        .rev()
        .find_map(|s| s.get(3).and_then(Value::as_str))
        .filter(|s| !s.trim().is_empty())
        .map(str::to_string)
}

/// The answer's lines for the chunk's lines, or `None` when they don't line up.
fn split_back(answer: &str, expected: usize) -> Option<Vec<String>> {
    let lines: Vec<String> = answer.split('\n').map(|l| l.trim().to_string()).collect();
    (lines.len() == expected).then_some(lines)
}

fn same_text(a: &str, b: &str) -> bool {
    a.trim().to_lowercase() == b.trim().to_lowercase()
}

async fn ask(http: &reqwest::Client, params: &str, text: &str) -> Result<Value, String> {
    let url = format!("{ENDPOINT}?client=gtx&{params}&q={}", super::matching::encode(text));
    let res = http.get(url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("translation service: HTTP {}", res.status()));
    }
    // A refusal ("automated queries") comes back as an HTML page.
    res.json::<Value>().await.map_err(|_| "translation service refused the request".to_string())
}

/// Each line in `lang`; `None` for empty lines, lines already in that
/// language and lines the service didn't return one-to-one.
pub async fn translate(http: &reqwest::Client, lines: &[String], lang: &str) -> Result<Vec<Option<String>>, String> {
    if !is_lang(lang) {
        return Err("Invalid language".into());
    }
    let mut out = vec![None; lines.len()];
    for chunk in chunks(lines, |_| true) {
        let text = chunk.iter().map(|&i| lines[i].trim()).collect::<Vec<_>>().join("\n");
        let body = ask(http, &format!("sl=auto&tl={lang}&dt=t"), &text).await?;
        fill_translation(&mut out, lines, &chunk, &body, lang);
    }
    Ok(out)
}

fn fill_translation(out: &mut [Option<String>], lines: &[String], chunk: &[usize], body: &Value, lang: &str) {
    let Some((text, detected)) = parse_translation(body) else { return };
    let base = |tag: &str| tag.split('-').next().unwrap_or("").to_lowercase();
    if detected.is_some_and(|d| base(&d) == base(lang)) {
        return;
    }
    let Some(translated) = split_back(&text, chunk.len()) else { return };
    for (&i, line) in chunk.iter().zip(translated) {
        if !line.is_empty() && !same_text(&line, &lines[i]) {
            out[i] = Some(line);
        }
    }
}

/// Each line written in Latin letters; `None` for lines that already are.
pub async fn romanize(http: &reqwest::Client, lines: &[String]) -> Result<Vec<Option<String>>, String> {
    let mut out = vec![None; lines.len()];
    for chunk in chunks(lines, needs_romanization) {
        let text = chunk.iter().map(|&i| lines[i].trim()).collect::<Vec<_>>().join("\n");
        let body = ask(http, "sl=auto&tl=en&dt=rm", &text).await?;
        fill_romanization(&mut out, lines, &chunk, &body);
    }
    Ok(out)
}

fn fill_romanization(out: &mut [Option<String>], lines: &[String], chunk: &[usize], body: &Value) {
    let Some(romanized) = parse_romanization(body).and_then(|text| split_back(&text, chunk.len())) else {
        return;
    };
    for (&i, line) in chunk.iter().zip(romanized) {
        if !line.is_empty() && !same_text(&line, &lines[i]) {
            out[i] = Some(line);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn lines(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn test_language_tags() {
        for ok in ["pl", "en", "zh-CN", "sr-Latn", "fil"] {
            assert!(is_lang(ok), "{ok}");
        }
        for bad in ["", "p", "polish", "en-", "en-US-x", "e1", "en&tl=x", "../x", "en US"] {
            assert!(!is_lang(bad), "{bad}");
        }
    }

    #[test]
    fn test_only_other_scripts_need_romanization() {
        for latin in ["Hello world", "Zażółć gęślą jaźń", "Ça va, über", "Tiếng Việt", "123 !?", ""] {
            assert!(!needs_romanization(latin), "{latin}");
        }
        for other in ["こんにちは", "Привет", "안녕하세요", "你好", "مرحبا", "Hello 世界"] {
            assert!(needs_romanization(other), "{other}");
        }
    }

    #[test]
    fn test_chunks_skip_empty_lines_and_stay_under_the_limit() {
        let l = lines(&["one", "", "  ", "two"]);
        assert_eq!(chunks(&l, |_| true), [vec![0, 3]]);
        assert_eq!(chunks(&l, |s| s == "two"), [vec![3]]);
        assert!(chunks(&lines(&["", " "]), |_| true).is_empty());

        // 9 encoded bytes per character: 100 lines of 50 don't fit one request.
        let long: Vec<String> = (0..100).map(|_| "世".repeat(50)).collect();
        let split = chunks(&long, |_| true);
        assert!(split.len() > 1);
        assert_eq!(split.iter().map(Vec::len).sum::<usize>(), 100);
        for chunk in &split {
            let bytes: usize = chunk.iter().map(|&i| crate::lyrics::matching::encode(&long[i]).len() + 3).sum();
            assert!(bytes <= MAX_CHUNK_ENCODED_BYTES);
        }
    }

    #[test]
    fn test_translation_fills_lines_one_to_one() {
        let l = lines(&["Hello world", "", "How are you", "OK"]);
        let chunk = vec![0, 2, 3];
        let body = json!([[["Witaj świecie\n", "Hello world\n", null, null, 10], ["Jak się masz\n", "How are you\n"], ["OK", "OK"]], null, "en"]);
        let mut out = vec![None; l.len()];
        fill_translation(&mut out, &l, &chunk, &body, "pl");
        assert_eq!(out, [Some("Witaj świecie".to_string()), None, Some("Jak się masz".to_string()), None], "unchanged lines stay empty");
    }

    #[test]
    fn test_translation_is_skipped_for_the_same_language_or_a_mismatch() {
        let l = lines(&["Cześć", "Świecie"]);
        let mut out = vec![None; 2];
        let same = json!([[["Cześć!\n", "Cześć\n"], ["Świecie!", "Świecie"]], null, "pl"]);
        fill_translation(&mut out, &l, &[0, 1], &same, "pl");
        assert_eq!(out, [None, None], "already in the wanted language");

        let merged = json!([[["Hello world", "Cześć\nŚwiecie"]], null, "pl"]);
        fill_translation(&mut out, &l, &[0, 1], &merged, "en");
        assert_eq!(out, [None, None], "one line back for two: not guessed at");

        fill_translation(&mut out, &l, &[0, 1], &json!("<html>Sorry</html>"), "en");
        fill_translation(&mut out, &l, &[0, 1], &json!([]), "en");
        assert_eq!(out, [None, None]);
    }

    #[test]
    fn test_romanization_reads_the_source_transliteration() {
        let l = lines(&["Привет мир", "Hello", "Спасибо"]);
        let body = json!([[[null, null, null, "Privet mir\nSpasibo"]], null, "ru"]);
        assert_eq!(parse_romanization(&body).as_deref(), Some("Privet mir\nSpasibo"));
        let mut out = vec![None; 3];
        fill_romanization(&mut out, &l, &chunks(&l, needs_romanization)[0], &body);
        assert_eq!(out, [Some("Privet mir".to_string()), None, Some("Spasibo".to_string())]);

        // With the translation alongside (dt=t&dt=rm) it is the last entry.
        let both = json!([[["Hello world", "Привет мир", null, null, 3], [null, null, null, "Privet mir"]], null, "ru"]);
        assert_eq!(parse_romanization(&both).as_deref(), Some("Privet mir"));
        assert_eq!(parse_romanization(&json!([[["Hello", "Hello"]], null, "en"])), None);
    }

    #[test]
    fn test_cache_is_bounded() {
        let cache = TranslationCache::default();
        for i in 0..MAX_CACHED {
            cache.put(format!("k{i}"), vec![None]);
        }
        assert!(cache.get("k0").is_some());
        cache.put("one more".into(), vec![Some("x".into())]);
        assert!(cache.get("k0").is_none());
        assert_eq!(cache.get("one more"), Some(vec![Some("x".to_string())]));
    }

    #[tokio::test]
    async fn test_invalid_language_never_reaches_the_network() {
        let err = translate(&reqwest::Client::new(), &lines(&["x"]), "en&q=evil").await.unwrap_err();
        assert_eq!(err, "Invalid language");
    }

    #[tokio::test]
    #[ignore = "network"]
    async fn test_live_translate_and_romanize() {
        let http = reqwest::Client::builder().user_agent("Oxitune-tests").build().unwrap();
        let translated = translate(&http, &lines(&["Hello world", "How are you"]), "pl").await.unwrap();
        assert!(translated.iter().all(Option::is_some), "{translated:?}");
        let romanized = romanize(&http, &lines(&["Привет мир", "Hello"])).await.unwrap();
        assert!(romanized[0].is_some() && romanized[1].is_none(), "{romanized:?}");
    }
}
