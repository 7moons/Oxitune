/**
 * Strings for every piece of UI YTMD injects into YouTube Music. Picked to
 * match the language YTM itself is rendered in (`<html lang>`), so our
 * controls never read as a foreign add-on next to YTM's own labels.
 */
const en = {
  menuLabel: 'YTMD',
  menuSettings: 'Settings & equalizer',
  menuLocal: 'Local music',
  menuSync: 'Listen together',
  menuRemote: 'Phone remote',
  menuMiniPlayer: 'Mini player',
  menuDownload: 'Download song',
  syncInRoom: 'Listening together',
  syncListeners: (n: number) => (n === 1 ? '1 listener' : `${n} listeners`),
  syncJoined: (name: string) => `${name} joined`,
  syncLeft: (name: string) => `${name} left`,
  syncRoomClosed: 'Listening session ended',
  syncConnected: 'Connected to the listening session',
  syncGuestNext: (name: string) => `${name} skipped to the next song`,
  syncGuestPrevious: (name: string) => `${name} went back a song`,
  syncGuestPaused: (name: string) => `${name} paused`,
  syncGuestResumed: (name: string) => `${name} resumed playback`,
  syncGuestPicked: (name: string) => `${name} picked a song`,
  downloadNoTrack: 'Play a song first to download it',
  downloadStarted: (title: string) => `Downloading “${title}”`,
  downloadDone: (title: string) => `Downloaded “${title}”`,
  downloadFailed: (reason: string) => `Download failed: ${reason}`,
  downloadInProgress: 'Download in progress',
  downloadButton: 'Download',
  pipButton: 'Picture-in-picture',
  remoteTitle: 'Phone remote',
  remoteBody: 'Scan with your phone’s camera. Your phone must be on the same Wi-Fi.',
  remoteLoading: 'Starting remote…',
  remoteUnavailable: 'The remote isn’t available right now',
  close: 'Close',
  lyricsLoading: 'Loading lyrics…',
  lyricsNone: 'Lyrics aren’t available for this song',
  lyricsSource: 'Source: LRCLIB',
  lyricsOffset: 'Timing',
  lyricsEarlier: 'Show lyrics earlier',
  lyricsLater: 'Show lyrics later',
  lyricsReset: 'Reset',
  actionFailed: 'Something went wrong. Try again.'
};

type Strings = typeof en;

const pl: Strings = {
  menuLabel: 'YTMD',
  menuSettings: 'Ustawienia i korektor',
  menuLocal: 'Muzyka lokalna',
  menuSync: 'Słuchaj razem',
  menuRemote: 'Pilot w telefonie',
  menuMiniPlayer: 'Miniodtwarzacz',
  menuDownload: 'Pobierz utwór',
  syncInRoom: 'Słuchacie razem',
  syncListeners: (n: number) => {
    if (n === 1) return '1 słuchacz';
    const lastTwo = n % 100;
    const last = n % 10;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? `${n} słuchacze` : `${n} słuchaczy`;
  },
  syncJoined: (name: string) => `${name} dołącza do słuchania`,
  syncLeft: (name: string) => `${name} opuszcza słuchanie`,
  syncRoomClosed: 'Wspólne słuchanie zakończone',
  syncConnected: 'Połączono ze wspólnym słuchaniem',
  syncGuestNext: (name: string) => `${name} przełącza na następny utwór`,
  syncGuestPrevious: (name: string) => `${name} wraca do poprzedniego utworu`,
  syncGuestPaused: (name: string) => `${name} wstrzymuje odtwarzanie`,
  syncGuestResumed: (name: string) => `${name} wznawia odtwarzanie`,
  syncGuestPicked: (name: string) => `${name} włącza inny utwór`,
  downloadNoTrack: 'Najpierw włącz utwór, żeby go pobrać',
  downloadStarted: (title: string) => `Pobieranie: „${title}”`,
  downloadDone: (title: string) => `Pobrano: „${title}”`,
  downloadFailed: (reason: string) => `Nie udało się pobrać: ${reason}`,
  downloadInProgress: 'Trwa pobieranie',
  downloadButton: 'Pobierz',
  pipButton: 'Obraz w obrazie',
  remoteTitle: 'Pilot w telefonie',
  remoteBody: 'Zeskanuj aparatem w telefonie. Telefon musi być w tej samej sieci Wi-Fi.',
  remoteLoading: 'Uruchamianie pilota…',
  remoteUnavailable: 'Pilot jest teraz niedostępny',
  close: 'Zamknij',
  lyricsLoading: 'Wczytywanie tekstu…',
  lyricsNone: 'Tekst tego utworu jest niedostępny',
  lyricsSource: 'Źródło: LRCLIB',
  lyricsOffset: 'Synchronizacja',
  lyricsEarlier: 'Pokazuj tekst wcześniej',
  lyricsLater: 'Pokazuj tekst później',
  lyricsReset: 'Resetuj',
  actionFailed: 'Coś poszło nie tak. Spróbuj ponownie.'
};

const LOCALES: Record<string, Strings> = { en, pl };

/** `pl-PL` → Polish, anything unknown → English. */
export function pickLocale(lang: string | null | undefined): Strings {
  const base = (lang || '').toLowerCase().split(/[-_]/)[0];
  return LOCALES[base] ?? en;
}

let cached: Strings | null = null;

/** Strings for the language YTM is currently rendered in. */
export function t(): Strings {
  if (!cached) {
    const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
    cached = pickLocale(lang || (typeof navigator !== 'undefined' ? navigator.language : 'en'));
  }
  return cached;
}
