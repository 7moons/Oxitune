//! Texts the backend shows itself (tray menu, notifications, the crash
//! dialog), in Polish or English like the rest of YTMD. The language comes
//! from the system locale; the windows pick theirs in `src/ui/i18n.ts`.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    En,
    Pl,
}

/// Language from a locale name like `pl_PL.UTF-8`, `pl-PL` or `en_US`.
pub fn lang_from_locale(locale: &str) -> Lang {
    let l = locale.trim().to_ascii_lowercase();
    if l == "pl" || l.starts_with("pl_") || l.starts_with("pl-") || l.starts_with("pl.") {
        Lang::Pl
    } else {
        Lang::En
    }
}

#[cfg(windows)]
fn system_locale() -> Option<String> {
    use windows::Win32::Globalization::GetUserDefaultLocaleName;
    let mut buf = [0u16; 85];
    // SAFETY: the buffer is LOCALE_NAME_MAX_LENGTH (85) wide chars, as the
    // API requires; it writes a NUL-terminated name and returns its length.
    let len = unsafe { GetUserDefaultLocaleName(&mut buf) };
    (len > 1).then(|| String::from_utf16_lossy(&buf[..(len as usize - 1)]))
}

#[cfg(not(windows))]
fn system_locale() -> Option<String> {
    ["LC_ALL", "LC_MESSAGES", "LANG"]
        .iter()
        .filter_map(|k| std::env::var(k).ok())
        .find(|v| !v.is_empty() && v != "C" && v != "POSIX")
}

pub fn lang() -> Lang {
    static LANG: std::sync::OnceLock<Lang> = std::sync::OnceLock::new();
    *LANG.get_or_init(|| system_locale().map(|l| lang_from_locale(&l)).unwrap_or(Lang::En))
}

#[derive(Debug, Clone, Copy)]
pub enum Text {
    TrayPlayPause,
    TrayNext,
    TrayPrevious,
    TrayMiniPlayer,
    TraySettings,
    TrayShowHide,
    TrayQuit,
    UpdateTitle,
    NowPlaying,
    CrashTitle,
    CrashBody,
    CrashOpenLogs,
    Close,
}

pub fn t(text: Text) -> &'static str {
    tr(lang(), text)
}

pub fn tr(lang: Lang, text: Text) -> &'static str {
    use Text::*;
    match (lang, text) {
        (Lang::En, TrayPlayPause) => "Play/Pause",
        (Lang::Pl, TrayPlayPause) => "Odtwórz/Wstrzymaj",
        (Lang::En, TrayNext) => "Next",
        (Lang::Pl, TrayNext) => "Następny",
        (Lang::En, TrayPrevious) => "Previous",
        (Lang::Pl, TrayPrevious) => "Poprzedni",
        (Lang::En, TrayMiniPlayer) => "Mini player",
        (Lang::Pl, TrayMiniPlayer) => "Miniodtwarzacz",
        (Lang::En, TraySettings) => "Settings",
        (Lang::Pl, TraySettings) => "Ustawienia",
        (Lang::En, TrayShowHide) => "Show/Hide YTMD",
        (Lang::Pl, TrayShowHide) => "Pokaż/ukryj YTMD",
        (Lang::En, TrayQuit) => "Quit",
        (Lang::Pl, TrayQuit) => "Zakończ",
        (Lang::En, UpdateTitle) => "YTMD update available",
        (Lang::Pl, UpdateTitle) => "Dostępna aktualizacja YTMD",
        (Lang::En, NowPlaying) => "Now playing",
        (Lang::Pl, NowPlaying) => "Teraz gra",
        (Lang::En, CrashTitle) => "YTMD closed unexpectedly",
        (Lang::Pl, CrashTitle) => "YTMD zamknął się niespodziewanie",
        (Lang::En, CrashBody) => {
            "YTMD crashed last time. A crash report was saved in the logs folder; attaching it to a bug report helps fix the problem."
        }
        (Lang::Pl, CrashBody) => {
            "Ostatnio YTMD uległ awarii. Raport został zapisany w folderze logów; dołączenie go do zgłoszenia błędu pomoże go naprawić."
        }
        (Lang::En, CrashOpenLogs) => "Open logs folder",
        (Lang::Pl, CrashOpenLogs) => "Otwórz folder logów",
        (Lang::En, Close) => "Close",
        (Lang::Pl, Close) => "Zamknij",
    }
}

/// "Version X is ready to install from Settings."
pub fn update_body(version: &str) -> String {
    match lang() {
        Lang::En => format!("Version {version} is ready to install from Settings."),
        Lang::Pl => format!("Wersję {version} można zainstalować w Ustawieniach."),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_locale_names() {
        for pl in ["pl", "pl_PL.UTF-8", "pl-PL", "PL_pl"] {
            assert_eq!(lang_from_locale(pl), Lang::Pl, "{pl}");
        }
        for en in ["en_US.UTF-8", "de-DE", "", "plk", "C"] {
            assert_eq!(lang_from_locale(en), Lang::En, "{en}");
        }
    }

    #[test]
    fn test_every_text_has_both_languages() {
        use Text::*;
        for text in [TrayPlayPause, TrayNext, TrayPrevious, TrayMiniPlayer, TraySettings, TrayShowHide, TrayQuit, UpdateTitle, NowPlaying, CrashTitle, CrashBody, CrashOpenLogs, Close] {
            assert!(!tr(Lang::En, text).is_empty());
            assert!(!tr(Lang::Pl, text).is_empty());
        }
    }
}
