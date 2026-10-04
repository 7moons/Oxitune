//! LRC parsing: `[mm:ss.xx]` line tags (several per line allowed), the
//! `[offset:±ms]` header, and enhanced-LRC `<mm:ss.xx>` word tags.

use super::{Line, Word};

/// Seconds for a `mm:ss`, `mm:ss.x`, `mm:ss.xx`, `mm:ss.xxx` (or `mm:ss:xx`) tag body.
fn parse_timestamp(tag: &str) -> Option<f64> {
    let (mins, rest) = tag.split_once(':')?;
    let mins: u32 = mins.trim().parse().ok()?;
    let (secs, frac) = match rest.find(['.', ':']) {
        Some(i) => (&rest[..i], Some(&rest[i + 1..])),
        None => (rest, None),
    };
    if secs.len() != 2 || !secs.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let secs: u32 = secs.parse().ok()?;
    let millis = match frac {
        Some(f) if !f.is_empty() && f.len() <= 3 && f.bytes().all(|b| b.is_ascii_digit()) => {
            // "5" = 500 ms, "05" = 50 ms, "005" = 5 ms
            format!("{f:0<3}").parse::<u32>().ok()?
        }
        Some(_) => return None,
        None => 0,
    };
    Some(f64::from(mins) * 60.0 + f64::from(secs) + f64::from(millis) / 1000.0)
}

/// Enhanced-LRC words (`<00:01.00>Hello <00:01.50>world`). `None` when the
/// text carries no word tags.
fn parse_words(text: &str, shift: f64) -> Option<(String, Vec<Word>)> {
    if !text.contains('<') {
        return None;
    }
    let mut words: Vec<Word> = Vec::new();
    let mut plain = String::new();
    let mut rest = text;
    let mut pending: Option<f64> = None;
    while !rest.is_empty() {
        if let Some(stripped) = rest.strip_prefix('<') {
            if let Some(end) = stripped.find('>') {
                if let Some(t) = parse_timestamp(&stripped[..end]) {
                    pending = Some((t - shift).max(0.0));
                    rest = &stripped[end + 1..];
                    continue;
                }
            }
        }
        let next = rest[1..].find('<').map(|i| i + 1).unwrap_or(rest.len());
        let chunk = &rest[..next];
        plain.push_str(chunk);
        match (pending.take(), words.last_mut()) {
            (Some(t), _) => words.push(Word { t, text: chunk.to_string(), end: None }),
            (None, Some(last)) => last.text.push_str(chunk),
            (None, None) => {}
        }
        rest = &rest[next..];
    }
    let plain = plain.trim().to_string();
    words.retain(|w| !w.text.is_empty());
    if words.is_empty() {
        None
    } else {
        Some((plain, words))
    }
}

/// Timed lines, sorted by time. Lines without text are dropped, metadata
/// tags (`[ar:…]`) are ignored and `[offset:+500]` shifts every line 0.5 s
/// earlier, as the LRC format defines.
pub fn parse_lrc(content: &str) -> Vec<Line> {
    let mut shift = 0.0;
    let mut lines = Vec::new();

    for raw in content.lines() {
        let mut rest = raw.trim();
        if let Some(ms) = rest
            .strip_prefix("[offset:")
            .and_then(|r| r.strip_suffix(']'))
            .and_then(|v| v.trim().parse::<i64>().ok())
        {
            shift = ms as f64 / 1000.0;
            continue;
        }

        let mut times = Vec::new();
        while let Some(stripped) = rest.strip_prefix('[') {
            let Some(end) = stripped.find(']') else { break };
            match parse_timestamp(&stripped[..end]) {
                Some(t) => times.push(t),
                None => break,
            }
            rest = &stripped[end + 1..];
        }
        if times.is_empty() {
            continue;
        }

        let (text, words) = match parse_words(rest, shift) {
            Some((plain, words)) => (plain, Some(words)),
            None => (rest.trim().to_string(), None),
        };
        if text.is_empty() {
            continue;
        }
        for t in times {
            lines.push(Line {
                t: (t - shift).max(0.0),
                text: text.clone(),
                words: words.clone(),
                ..Default::default()
            });
        }
    }

    lines.sort_by(|a, b| a.t.total_cmp(&b.t));
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    fn times(lines: &[Line]) -> Vec<f64> {
        lines.iter().map(|l| l.t).collect()
    }

    #[test]
    fn test_parses_standard_timestamps_in_order() {
        let lines = parse_lrc("[00:12.50]First line\n[00:05.00]Second line appears first\n[01:02.345]Third");
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0].text, "Second line appears first");
        assert_eq!(times(&lines)[..2], [5.0, 12.5]);
        assert!((lines[2].t - 62.345).abs() < 1e-9);
    }

    #[test]
    fn test_drops_empty_lines_and_metadata() {
        let lines = parse_lrc("[ar:Some Artist]\n[00:01.00]\n[00:02.00]Real lyric\nno tag at all");
        assert_eq!(lines.len(), 1);
        assert_eq!((lines[0].t, lines[0].text.as_str()), (2.0, "Real lyric"));
    }

    #[test]
    fn test_global_offset_shifts_lines_earlier() {
        assert_eq!(times(&parse_lrc("[offset:500]\n[00:10.00]First\n[00:20.00]Second")), [9.5, 19.5]);
        assert_eq!(times(&parse_lrc("[offset:-1000]\n[00:10.00]First")), [11.0]);
    }

    #[test]
    fn test_repeated_timestamps_on_one_line() {
        let lines = parse_lrc("[00:10.00][00:30.00]Chorus\n[00:20.00]Verse");
        assert_eq!(times(&lines), [10.0, 20.0, 30.0]);
        assert_eq!(lines[2].text, "Chorus");
    }

    #[test]
    fn test_fraction_widths() {
        assert_eq!(times(&parse_lrc("[00:01.5]a\n[00:02.05]b\n[00:03.005]c\n[00:04]d\n[00:05:10]e")), [1.5, 2.05, 3.005, 4.0, 5.1]);
    }

    #[test]
    fn test_enhanced_lrc_words() {
        let lines = parse_lrc("[00:01.00]<00:01.00>Hello <00:01.50>big <00:02.00>world");
        assert_eq!(lines[0].text, "Hello big world");
        let words = lines[0].words.as_ref().unwrap();
        assert_eq!(words.iter().map(|w| w.t).collect::<Vec<_>>(), [1.0, 1.5, 2.0]);
        assert_eq!(words.iter().map(|w| w.text.as_str()).collect::<String>(), "Hello big world");
    }

    #[test]
    fn test_plain_text_with_angle_brackets_is_not_words() {
        let lines = parse_lrc("[00:01.00]a <b> c");
        assert_eq!(lines[0].text, "a <b> c");
        assert!(lines[0].words.is_none());
    }
}
