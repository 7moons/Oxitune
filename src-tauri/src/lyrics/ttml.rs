//! TTML lyrics, the timed-text format lrc.red and Unison serve: one `<p>`
//! per line, a `<span begin end>` per word (or syllable), background vocals
//! in a `<span ttm:role="x-bg">`, and the singer in `ttm:agent`.

use super::{Background, Line, Word};
use roxmltree::{Document, Node};
use std::collections::HashMap;

/// Larger documents are not lyrics.
pub const MAX_TTML_BYTES: usize = 1024 * 1024;

#[derive(Debug, Default, PartialEq)]
pub struct Ttml {
    /// Timed lines, sorted by time; empty when the document has no timing.
    pub synced: Vec<Line>,
    /// Every line's text, for documents without timing.
    pub plain: Option<String>,
}

/// Seconds for a TTML clock value: `18.834`, `3:33.107`, `1:02:03.5`,
/// `12.5s` or `500ms`.
pub fn parse_time(value: &str) -> Option<f64> {
    let v = value.trim();
    let secs = if let Some(ms) = v.strip_suffix("ms") {
        ms.trim().parse::<f64>().ok()? / 1000.0
    } else {
        let v = v.strip_suffix('s').unwrap_or(v);
        let mut total = 0.0;
        for part in v.split(':') {
            total = total * 60.0 + part.trim().parse::<f64>().ok()?;
        }
        total
    };
    (secs.is_finite() && secs >= 0.0).then_some(secs)
}

/// An attribute by its local name, whatever prefix the document gave its
/// namespace (`ttm:agent`, `itunes:key`).
fn attr<'a>(node: Node<'a, '_>, name: &str) -> Option<&'a str> {
    node.attributes().find(|a| a.name() == name).map(|a| a.value())
}

/// One voice of a line: its text and, when the line is timed by word, the words.
#[derive(Default)]
struct Part {
    text: String,
    words: Vec<Word>,
}

impl Part {
    /// Text outside a word span: whitespace stays on the word before it, so
    /// the words concatenate back to the line.
    fn push_text(&mut self, raw: &str) {
        let collapsed = raw.split_whitespace().collect::<Vec<_>>().join(" ");
        let space_before = raw.starts_with(char::is_whitespace) && !self.text.is_empty() && !self.text.ends_with(' ');
        let space_after = raw.ends_with(char::is_whitespace) && !collapsed.is_empty();
        let mut piece = String::new();
        if space_before {
            piece.push(' ');
        }
        piece.push_str(&collapsed);
        if space_after {
            piece.push(' ');
        }
        if piece.is_empty() {
            return;
        }
        self.text.push_str(&piece);
        if let Some(last) = self.words.last_mut() {
            last.text.push_str(&piece);
        }
    }

    fn push_word(&mut self, node: Node<'_, '_>, t: f64) {
        let text: String = node.descendants().filter(|n| n.is_text()).filter_map(|n| n.text()).collect();
        let text = text.split_whitespace().collect::<Vec<_>>().join(" ");
        if text.is_empty() {
            return;
        }
        self.text.push_str(&text);
        let end = attr(node, "end").and_then(parse_time).filter(|e| *e >= t);
        self.words.push(Word { t, text, end });
    }

    fn finish(mut self) -> Option<(String, Option<Vec<Word>>)> {
        let text = self.text.trim().to_string();
        if text.is_empty() {
            return None;
        }
        if let Some(last) = self.words.last_mut() {
            last.text.truncate(last.text.trim_end().len());
        }
        Some((text, (!self.words.is_empty()).then_some(self.words)))
    }
}

/// Walks a `<p>` (or a span inside it), sorting its content into the main
/// voice and the background vocals.
fn collect(node: Node<'_, '_>, main: &mut Part, bg: &mut Part, in_bg: bool) {
    for child in node.children() {
        let target = if in_bg { &mut *bg } else { &mut *main };
        if child.is_text() {
            target.push_text(child.text().unwrap_or(""));
            continue;
        }
        if !child.is_element() || child.tag_name().name() != "span" {
            continue;
        }
        match attr(child, "role") {
            Some("x-bg") => collect(child, main, bg, true),
            // Translations and transliterations some documents carry inline.
            Some(_) => {}
            None => match attr(child, "begin").and_then(parse_time) {
                Some(t) => target.push_word(child, t),
                None => collect(child, main, bg, in_bg),
            },
        }
    }
}

/// `xml:id` → `type` of the `<ttm:agent>`s in the head ("person", "group").
fn agent_types<'a>(doc: &'a Document<'_>) -> HashMap<&'a str, &'a str> {
    doc.descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "agent")
        .filter_map(|n| Some((attr(n, "id")?, attr(n, "type").unwrap_or("person"))))
        .collect()
}

pub fn parse_ttml(xml: &str) -> Option<Ttml> {
    if xml.len() > MAX_TTML_BYTES {
        return None;
    }
    let doc = Document::parse(xml).ok()?;
    let agents = agent_types(&doc);
    // Everyone singing together is nobody's "other side".
    let is_person = |agent: &str| agents.get(agent).is_none_or(|t| *t == "person");

    let mut synced: Vec<Line> = Vec::new();
    let mut texts: Vec<String> = Vec::new();
    let mut untimed = false;
    let mut lead: Option<&str> = None;

    for p in doc.descendants().filter(|n| n.is_element() && n.tag_name().name() == "p") {
        let (mut main, mut bg) = (Part::default(), Part::default());
        collect(p, &mut main, &mut bg, false);
        // A line that is background vocals only is just a line.
        let (main, bg) = match (main.finish(), bg.finish()) {
            (Some(m), b) => (m, b),
            (None, Some(b)) => (b, None),
            (None, None) => continue,
        };
        texts.push(main.0.clone());

        let Some(t) = attr(p, "begin").and_then(parse_time) else {
            untimed = true;
            continue;
        };
        let agent = attr(p, "agent").filter(|a| is_person(a));
        if lead.is_none() {
            lead = agent;
        }
        synced.push(Line {
            t,
            text: main.0,
            words: main.1,
            end: attr(p, "end").and_then(parse_time).filter(|e| *e >= t),
            alt: agent.is_some() && agent != lead,
            bg: bg.map(|(text, words)| Background { text, words }),
        });
    }

    if texts.is_empty() {
        return None;
    }
    if untimed {
        return Some(Ttml { synced: Vec::new(), plain: Some(texts.join("\n")) });
    }
    synced.sort_by(|a, b| a.t.total_cmp(&b.t));
    Some(Ttml { synced, plain: None })
}

#[cfg(test)]
mod tests {
    use super::*;

    const WORD_TIMED: &str = r#"<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en">
      <head><metadata>
        <ttm:agent type="person" xml:id="v1"/><ttm:agent type="person" xml:id="v2"/><ttm:agent type="group" xml:id="v1000"/>
      </metadata></head>
      <body dur="1:00.000"><div begin="1.000" end="20.000">
        <p begin="1.000" end="3.500" ttm:agent="v1"><span begin="1.000" end="1.400">One</span> <span begin="1.400" end="2.000">morn</span><span begin="2.000" end="3.500">ing</span></p>
        <p begin="4.000" end="6.000" ttm:agent="v2"><span begin="4.000" end="5.000">Second</span> <span begin="5.000" end="6.000">voice</span><span ttm:role="x-bg"><span begin="5.200" end="5.600">(oh</span> <span begin="5.600" end="6.000">yeah)</span></span></p>
        <p begin="1:07.250" end="1:09.000" ttm:agent="v1000"><span begin="1:07.250" end="1:09.000">Everyone</span></p>
      </div></body></tt>"#;

    #[test]
    fn test_parse_time_forms() {
        assert_eq!(parse_time("18.834"), Some(18.834));
        assert_eq!(parse_time("3:33.107"), Some(213.107));
        assert_eq!(parse_time("1:02:03.5"), Some(3723.5));
        assert_eq!(parse_time("12.5s"), Some(12.5));
        assert_eq!(parse_time("500ms"), Some(0.5));
        for bad in ["", "abc", "1:xx", "-3", "NaN", "inf"] {
            assert_eq!(parse_time(bad), None, "{bad}");
        }
    }

    #[test]
    fn test_words_concatenate_back_to_the_line() {
        let ttml = parse_ttml(WORD_TIMED).unwrap();
        let first = &ttml.synced[0];
        assert_eq!((first.t, first.end, first.text.as_str()), (1.0, Some(3.5), "One morning"));
        let words = first.words.as_ref().unwrap();
        // The space stays on "One"; a word split into syllables has none.
        assert_eq!(words.iter().map(|w| w.text.as_str()).collect::<Vec<_>>(), ["One ", "morn", "ing"]);
        assert_eq!(words.iter().map(|w| w.text.as_str()).collect::<String>(), first.text);
        assert_eq!((words[1].t, words[1].end), (1.4, Some(2.0)));
    }

    #[test]
    fn test_second_voice_and_background_vocals() {
        let ttml = parse_ttml(WORD_TIMED).unwrap();
        assert_eq!(ttml.synced.iter().map(|l| l.alt).collect::<Vec<_>>(), [false, true, false], "a group is not the other side");
        let duet = &ttml.synced[1];
        assert_eq!(duet.text, "Second voice", "background vocals are not part of the line");
        let bg = duet.bg.as_ref().unwrap();
        assert_eq!(bg.text, "(oh yeah)");
        assert_eq!(bg.words.as_ref().unwrap().iter().map(|w| w.t).collect::<Vec<_>>(), [5.2, 5.6]);
        assert!(ttml.synced[0].bg.is_none());
        assert_eq!(ttml.synced[2].t, 67.25);
        assert!(ttml.plain.is_none());
    }

    #[test]
    fn test_line_timed_document_has_no_words() {
        let xml = r#"<tt xmlns="http://www.w3.org/ns/ttml"><body><div>
            <p begin="12.000" end="15.000">
               Later   line
            </p>
            <p begin="5.000" end="9.000">Earlier line</p>
            <p begin="20.000"></p>
        </div></body></tt>"#;
        let ttml = parse_ttml(xml).unwrap();
        assert_eq!(ttml.synced.iter().map(|l| l.text.as_str()).collect::<Vec<_>>(), ["Earlier line", "Later line"]);
        assert!(ttml.synced.iter().all(|l| l.words.is_none() && !l.alt));
    }

    #[test]
    fn test_untimed_document_is_plain_text() {
        let xml = r#"<tt xmlns="http://www.w3.org/ns/ttml"><body><div><p>First</p><p>Second</p></div></body></tt>"#;
        let ttml = parse_ttml(xml).unwrap();
        assert!(ttml.synced.is_empty());
        assert_eq!(ttml.plain.as_deref(), Some("First\nSecond"));
    }

    #[test]
    fn test_a_line_of_background_vocals_only_is_a_line() {
        let xml = r#"<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata"><body><div>
            <p begin="2.0" end="3.0"><span ttm:role="x-bg"><span begin="2.0" end="3.0">(ah)</span></span></p>
            <p begin="4.0" end="5.0"><span begin="4.0" end="5.0">Sung</span><span ttm:role="x-translation" xml:lang="pl">Zaśpiewane</span></p>
        </div></body></tt>"#;
        let ttml = parse_ttml(xml).unwrap();
        assert_eq!((ttml.synced[0].text.as_str(), ttml.synced[0].bg.is_none()), ("(ah)", true));
        assert_eq!(ttml.synced[1].text, "Sung", "inline translations are left out");
    }

    #[test]
    fn test_not_ttml() {
        assert!(parse_ttml("").is_none());
        assert!(parse_ttml("<html><body>Sorry</body></html>").is_none());
        assert!(parse_ttml("<tt><body><div><p begin=\"1.0\">   </p></div></body></tt>").is_none());
        assert!(parse_ttml(&"x".repeat(MAX_TTML_BYTES + 1)).is_none());
    }
}
