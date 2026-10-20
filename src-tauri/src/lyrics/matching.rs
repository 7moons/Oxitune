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
/// YouTube: "GlasshouseVEVO" is still Glasshouse); the best of them counts.
pub fn score_match(cand: &Candidate<'_>, title: &str, artist: &str, aliases: &[String], duration: Option<f64>) -> f64 {
    let title_sim = token_similarity(cand.title, title);
    let artist_sim = artist_similarity(cand.artist, artist, aliases);

    // Someone else's song with a similar title ("Big Girl" by Sips & The
    // Yogscast for "BIG BIG GIRL" by fawn i francis) is never the song.
    if !artist_matches(cand.artist, artist, aliases) {
        return 0.0;
    }

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

/// Below this the result is by another artist, whatever its title.
pub const MIN_ARTIST_SIMILARITY: f64 = 0.5;

/// What Oxitune reports when YouTube Music names no artist.
const UNKNOWN_ARTIST: &str = "Unknown Artist";

/// The artists in a credit: "fawn i francis", "A & B", "A feat. B".
fn artist_names(credit: &str) -> Vec<String> {
    const SEPARATORS: [&str; 14] = [
        ",", "&", ";", "/", " x ", " × ", " feat. ", " feat ", " ft. ", " ft ", " featuring ", " and ", " i ", " oraz ",
    ];
    let mut names = vec![credit.to_lowercase()];
    for sep in SEPARATORS {
        names = names.iter().flat_map(|n| n.split(sep).map(str::to_string).collect::<Vec<_>>()).collect();
    }
    names.into_iter().map(|n| n.trim().to_string()).filter(|n| !n.is_empty()).collect()
}

/// How alike two credits are: the whole of each, or any artist of one
/// against any of the other, and the song's other names (`aliases`).
pub fn artist_similarity(found: &str, artist: &str, aliases: &[String]) -> f64 {
    let found_names = artist_names(found);
    std::iter::once(artist)
        .chain(aliases.iter().map(String::as_str))
        .flat_map(|wanted| {
            let whole = token_similarity(found, wanted);
            let parts = artist_names(wanted)
                .iter()
                .flat_map(|w| found_names.iter().map(move |f| token_similarity(f, w)))
                .fold(0.0, f64::max);
            [whole, parts]
        })
        .fold(0.0, f64::max)
}

/// Whether a result is by the song's artist. Unknown on either side can't
/// be judged and passes.
pub fn artist_matches(found: &str, artist: &str, aliases: &[String]) -> bool {
    let artist = artist.trim();
    if found.trim().is_empty() || artist.is_empty() || artist == UNKNOWN_ARTIST {
        return true;
    }
    artist_similarity(found, artist, aliases) >= MIN_ARTIST_SIMILARITY
}

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

/// Fits synced lines timed for a `found`-long recording to a `song`-long
/// song; `false` means their timing can't be used. Lengths that fit pass as
/// they are. A longer recording is taken to be the song with more after it
/// (an album outro, or a closing part the video doesn't have: "Ebe ebe" is
/// 207 s on the album and 157 s on YouTube, which ends where the album's
/// first part does): the lines that start within the song keep their
/// timing, the rest are dropped, as long as most of the lyrics remain. If
/// the two differ at the start instead, the lines are off by a constant
/// the listener can correct with the timing offset, which plain text
/// (no highlight at all) never allowed. A shorter recording stays unfit.
pub fn fit_synced_to_song(lines: &mut Vec<super::Line>, found: Option<f64>, song: Option<f64>) -> bool {
    if synced_length_fits(found, song) {
        return true;
    }
    let (Some(found), Some(song)) = (found, song) else { return true };
    if found < song {
        return false;
    }
    let within = lines.iter().filter(|l| l.t < song).count();
    if within == 0 || within * 2 < lines.len() {
        return false;
    }
    lines.retain(|l| l.t < song);
    true
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
        assert_eq!(clean_track_name("Paper Moths - Take A Turn [Official Audio]"), "Take A Turn");
        assert_eq!(
            clean_track_name("Kaz Bałagane - ale to MOCNA VIXA (Oficjalny teledysk)"),
            "ale to MOCNA VIXA"
        );
        assert_eq!(clean_track_name("Artist – Song"), "Song");
    }

    #[test]
    fn test_token_similarity_matches_relevant_titles() {
        assert!(token_similarity("Take A Turn", "take a turn") >= 0.9);
        assert!(token_similarity("Fading Lights", "Save Your Tears") < 0.3);
    }

    #[test]
    fn test_synced_length_fits_within_15_s_or_unknown() {
        assert!(synced_length_fits(Some(236.0), Some(237.0)));
        assert!(synced_length_fits(Some(222.0), Some(237.0)));
        assert!(!synced_length_fits(Some(200.0), Some(237.0)), "an edit of the song");
        assert!(synced_length_fits(None, Some(237.0)));
        assert!(synced_length_fits(Some(236.0), None));
    }

    // Regressions from the log: a similar title by someone else won.
    #[test]
    fn test_another_artists_song_is_never_a_match() {
        let cand = |title, artist| Candidate { title, artist, duration: Some(139.0), has_synced: true };
        let none: &[String] = &[];
        assert_eq!(score_match(&cand("Big Girl", "Sips & The Yogscast"), "BIG BIG GIRL", "fawn i francis", none, Some(139.0)), 0.0);
        assert_eq!(score_match(&cand("One Dance", "One Dance"), "DANCE DANCE", "fawn i Flory", none, Some(182.0)), 0.0);
        assert_eq!(score_match(&cand("Big Girl", "Sips"), "BIG BIG GIRL", "fawn i francis", &["fawn".into()], None), 0.0);
    }

    #[test]
    fn test_one_of_several_credited_artists_is_enough() {
        assert!(artist_matches("fawn", "fawn i francis", &[]));
        assert!(artist_matches("Francis", "fawn i francis", &[]));
        assert!(artist_matches("Night Drive & Kavinsky", "Night Drive", &[]));
        assert!(artist_matches("Drake", "Drake feat. Wizkid", &[]));
        assert!(artist_matches("Glasshouse", "GlasshouseVEVO", &[]), "a channel name containing the artist");
        assert!(artist_matches("Glasshouse", "Glasshouse Official", &["Glasshouse".into()]));
        assert!(!artist_matches("Sips & The Yogscast", "fawn i francis", &[]));
    }

    #[test]
    fn test_an_unknown_artist_cannot_be_judged() {
        assert!(artist_matches("Anyone", "Unknown Artist", &[]));
        assert!(artist_matches("Anyone", "", &[]));
        assert!(artist_matches("", "fawn", &[]));
    }

    #[test]
    fn test_an_alias_can_match_the_artist() {
        let cand = Candidate { title: "Paper Lanterns", artist: "Glasshouse", duration: None, has_synced: true };
        let plain = score_match(&cand, "Paper Lanterns", "GlasshouseVEVO", &[], None);
        let aliased = score_match(&cand, "Paper Lanterns", "GlasshouseVEVO", &["Glasshouse".into()], None);
        assert!(aliased > plain, "{aliased} > {plain}");
    }

    #[test]
    fn test_score_rejects_unrelated_songs_even_with_matching_duration() {
        let cand = |title| Candidate { title, artist: "Paper Moths", duration: Some(210.0), has_synced: true };
        let wrong = score_match(&cand("Different Song"), "Take A Turn", "Paper Moths", &[], Some(210.0));
        let right = score_match(&cand("Take A Turn"), "Take A Turn", "Paper Moths", &[], Some(212.0));
        assert!(wrong < MIN_MATCH_SCORE, "{wrong}");
        assert!(right > MIN_MATCH_SCORE);
    }
}
