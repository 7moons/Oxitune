//! Strings the backend shows by itself (system notifications, the tray menu),
//! in the system's language like the companion windows (`src/ui/i18n.ts`
//! picks from `navigator.language`): Polish or English.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    En,
    Pl,
}

/// `pl-PL` / `pl_PL.UTF-8` → Polish, anything else → English.
pub fn lang_from_locale(locale: Option<&str>) -> Lang {
    match locale.map(|l| l.to_ascii_lowercase()) {
        Some(l) if l == "pl" || l.starts_with("pl-") || l.starts_with("pl_") || l.starts_with("pl.") => Lang::Pl,
        _ => Lang::En,
    }
}

pub fn current() -> Lang {
    lang_from_locale(sys_locale::get_locale().as_deref())
}

pub struct Strings {
    pub update_available_title: &'static str,
    pub update_available_body: fn(&str) -> String,
    pub now_playing: fn(&str) -> String,
    pub tray_play_pause: &'static str,
    pub tray_next: &'static str,
    pub tray_previous: &'static str,
    pub tray_mini_player: &'static str,
    pub tray_settings: &'static str,
    pub tray_show_hide: &'static str,
    pub tray_quit: &'static str,
}

const EN: Strings = Strings {
    update_available_title: "YTMD update available",
    update_available_body: |version| format!("Version {version} is ready to install from Settings."),
    now_playing: |artist| format!("Now playing: {artist}"),
    tray_play_pause: "Play / Pause",
    tray_next: "Next track",
    tray_previous: "Previous track",
    tray_mini_player: "Mini player",
    tray_settings: "Settings",
    tray_show_hide: "Show / Hide",
    tray_quit: "Quit",
};

const PL: Strings = Strings {
    update_available_title: "Dostępna aktualizacja YTMD",
    update_available_body: |version| format!("Wersja {version} jest gotowa do zainstalowania w Ustawieniach."),
    now_playing: |artist| format!("Teraz odtwarzane: {artist}"),
    tray_play_pause: "Odtwórz / Wstrzymaj",
    tray_next: "Następny utwór",
    tray_previous: "Poprzedni utwór",
    tray_mini_player: "Miniodtwarzacz",
    tray_settings: "Ustawienia",
    tray_show_hide: "Pokaż / Ukryj",
    tray_quit: "Zakończ",
};

pub fn strings_for(lang: Lang) -> &'static Strings {
    match lang {
        Lang::En => &EN,
        Lang::Pl => &PL,
    }
}

/// Strings in the system's language.
pub fn t() -> &'static Strings {
    strings_for(current())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn polish_locales_in_every_os_spelling_pick_polish() {
        for locale in ["pl", "pl-PL", "PL-pl", "pl_PL", "pl_PL.UTF-8"] {
            assert_eq!(lang_from_locale(Some(locale)), Lang::Pl, "{locale}");
        }
    }

    #[test]
    fn anything_else_or_nothing_is_english() {
        for locale in [Some("en-US"), Some("de-DE"), Some("plk"), Some(""), None] {
            assert_eq!(lang_from_locale(locale), Lang::En, "{locale:?}");
        }
    }

    #[test]
    fn update_notification_is_translated() {
        assert_eq!(strings_for(Lang::Pl).update_available_title, "Dostępna aktualizacja YTMD");
        assert_eq!(
            (strings_for(Lang::Pl).update_available_body)("0.3.0"),
            "Wersja 0.3.0 jest gotowa do zainstalowania w Ustawieniach."
        );
        assert_eq!((strings_for(Lang::En).update_available_body)("0.3.0"), "Version 0.3.0 is ready to install from Settings.");
    }
}
