//! Picking the right song among a provider's search results.

fn normalize_for_comparison(s: &str) -> String {
    let mut clean = s.to_lowercase();
    // Strip parenthetical/bracketed content
    while let Some(start) = clean.find('(') {
        if let Some(end) = clean[start..].find(')') {
            clean.replace_range(start..=start + end, " ");
        } else {
            break;
        }
    }
    while let Some(start) = clean.find('[') {
        if let Some(end) = clean[start..].find(']') {
            clean.replace_range(start..=start + end, " ");
        } else {
            break;
        }
    }
    clean = clean.replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), " ");
    clean.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn token_similarity(a: &str, b: &str) -> f64 {
    let norm_a = normalize_for_comparison(a);
    let norm_b = normalize_for_comparison(b);

    if norm_a.is_empty() || norm_b.is_empty() {
        return 0.0;
    }
    if norm_a == norm_b {
        return 1.0;
    }
    if norm_a.contains(&norm_b) || norm_b.contains(&norm_a) {
        return 0.85;
    }

    let tokens_a: std::collections::HashSet<&str> = norm_a.split_whitespace().collect();
    let tokens_b: std::collections::HashSet<&str> = norm_b.split_whitespace().collect();

    if tokens_a.is_empty() || tokens_b.is_empty() {
        return 0.0;
    }

    let intersection = tokens_a.intersection(&tokens_b).count();
    let union = tokens_a.union(&tokens_b).count();

    if union == 0 {
        0.0
    } else {
        intersection as f64 / union as f64
    }
}

/// The song name without "Artist - " prefixes and video noise such as
/// "(Official Music Video)".
pub fn clean_track_name(title: &str) -> String {
    let mut cleaned = title.to_string();

    // If title is formatted as "Artist - Title", extract the Title portion
    if let Some(idx) = cleaned.find(" - ") {
        cleaned = cleaned[idx + 3..].to_string();
    } else if let Some(idx) = cleaned.find(" – ") {
        cleaned = cleaned[idx + " – ".len()..].to_string();
    }

    let mut noise_patterns = [
        "official music video",
        "official visualizer",
        "oficjalny teledysk",
        "official video",
        "official audio",
        "lyrics video",
        "lyric video",
        "music video",
        "clip officiel",
        "visualizer",
        "remastered",
        "teledysk",
        "official",
        "prod by",
        "prod.",
        "lyrics",
        "audio",
        "video",
        "4k",
        "hd",
        "hq",
    ];
    noise_patterns.sort_by_key(|b| std::cmp::Reverse(b.len()));

    for pat in &noise_patterns {
        let mut start = 0;
        while let Some(pos) = cleaned[start..].to_lowercase().find(pat) {
            let abs_pos = start + pos;
            let end_pos = abs_pos + pat.len();
            let mut rem_start = abs_pos;
            let mut rem_end = end_pos;

            if rem_start > 0 && (cleaned.as_bytes()[rem_start - 1] == b'(' || cleaned.as_bytes()[rem_start - 1] == b'[') {
                rem_start -= 1;
            }
            if rem_end < cleaned.len() && (cleaned.as_bytes()[rem_end] == b')' || cleaned.as_bytes()[rem_end] == b']') {
                rem_end += 1;
            }

            cleaned.replace_range(rem_start..rem_end, " ");
            start = rem_start;
        }
    }

    let result = cleaned.trim().to_string();
    if result.is_empty() {
        title.to_string()
    } else {
        result
    }
}

/// How well one search result matches the song: 0 means unrelated. Title
/// counts most, then artist, then how close the length is; synced lyrics
/// get a bonus. Results under `MIN_MATCH_SCORE` are never used.
/// `aliases` are other names the song's artist goes by (the song's tags on
/// YouTube: "KornVEVO" is still Korn); the best of them counts.
pub fn score_match(cand: &Candidate<'_>, title: &str, artist: &str, aliases: &[String], duration: Option<f64>) -> f64 {
    let title_sim = token_similarity(cand.title, title);
    let artist_sim = aliases
        .iter()
        .map(|a| token_similarity(cand.artist, a))
        .fold(token_similarity(cand.artist, artist), f64::max);

    // Reject candidates that have no title resemblance whatsoever
    if title_sim < 0.25 && !cand.title.to_lowercase().contains(&title.to_lowercase()) {
        return 0.0;
    }

    let mut score = title_sim * 50.0 + artist_sim * 25.0;
    if cand.has_synced {
        score += 20.0;
    }
    if let (Some(target), Some(found)) = (duration, cand.duration) {
        let diff = (found - target).abs();
        if diff <= 2.0 {
            score += 25.0;
        } else if diff <= 5.0 {
            score += 15.0;
        } else if diff <= 10.0 {
            score += 5.0;
        } else if diff > 30.0 {
            score -= 20.0;
        }
    }
    score
}

/// One search result as `score_match` sees it.
pub struct Candidate<'a> {
    pub title: &'a str,
    pub artist: &'a str,
    pub duration: Option<f64>,
    pub has_synced: bool,
}

pub const MIN_MATCH_SCORE: f64 = 35.0;

/// Synced lyrics timed for a recording this much longer or shorter than the
/// song belong to another version (an edit, a live cut, a video with an
/// intro): their lines would light up at the wrong moments.
pub const MAX_SYNCED_LENGTH_DIFF_SECS: f64 = 15.0;

/// Whether synced lyrics timed for a `found`-long recording can follow a
/// `song`-long one. Unknown lengths can't be judged and pass.
pub fn synced_length_fits(found: Option<f64>, song: Option<f64>) -> bool {
    match (found, song) {
        (Some(f), Some(s)) if f > 0.0 && s > 0.0 => (f - s).abs() <= MAX_SYNCED_LENGTH_DIFF_SECS,
        _ => true,
    }
}

pub fn encode(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_track_name_removes_video_noise_and_artist_prefix() {
        assert_eq!(clean_track_name("bbno$ - check (Official Music Video)"), "check");
        assert_eq!(clean_track_name("Glass Animals - Take A Slice [Official Audio]"), "Take A Slice");
        assert_eq!(
            clean_track_name("Kaz Bałagane - ale to MOCNA VIXA (Oficjalny teledysk)"),
            "ale to MOCNA VIXA"
        );
        assert_eq!(clean_track_name("Artist – Song"), "Song");
    }

    #[test]
    fn test_token_similarity_matches_relevant_titles() {
        assert!(token_similarity("Take A Slice", "take a slice") >= 0.9);
        assert!(token_similarity("Blinding Lights", "Save Your Tears") < 0.3);
    }

    #[test]
    fn test_synced_length_fits_within_15_s_or_unknown() {
        assert!(synced_length_fits(Some(236.0), Some(237.0)));
        assert!(synced_length_fits(Some(222.0), Some(237.0)));
        assert!(!synced_length_fits(Some(200.0), Some(237.0)), "an edit of the song");
        assert!(synced_length_fits(None, Some(237.0)));
        assert!(synced_length_fits(Some(236.0), None));
    }

    #[test]
    fn test_an_alias_can_match_the_artist() {
        let cand = Candidate { title: "Freak On a Leash", artist: "Korn", duration: None, has_synced: true };
        let plain = score_match(&cand, "Freak On a Leash", "KornVEVO", &[], None);
        let aliased = score_match(&cand, "Freak On a Leash", "KornVEVO", &["Korn".into()], None);
        assert!(aliased > plain, "{aliased} > {plain}");
    }

    #[test]
    fn test_score_rejects_unrelated_songs_even_with_matching_duration() {
        let cand = |title| Candidate { title, artist: "Glass Animals", duration: Some(210.0), has_synced: true };
        let wrong = score_match(&cand("Different Song"), "Take A Slice", "Glass Animals", &[], Some(210.0));
        let right = score_match(&cand("Take A Slice"), "Take A Slice", "Glass Animals", &[], Some(212.0));
        assert!(wrong < MIN_MATCH_SCORE, "{wrong}");
        assert!(right > MIN_MATCH_SCORE);
    }
}
