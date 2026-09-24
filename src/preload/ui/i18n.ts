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
  pluginSwitchedOff: (name: string) => `“${name}” kept failing and was switched off. You can turn it back on in Settings > Plugins.`,
  menuMiniPlayer: 'Mini player',
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
  syncListenerOnly: 'Only DJs can control playback in this session',
  syncKicked: 'The host removed you from the session',
  syncLost: 'Lost connection to the listening session',
  syncRoleModerator: 'Your role: moderator',
  syncRoleDj: 'Your role: DJ. You can control playback',
  syncRoleListener: 'Your role: listener',
  syncVotedSkip: 'You voted to skip this song',
  syncVoteProgress: (name: string, have: number, need: number) => `${name} votes to skip (${have}/${need})`,
  syncVoteSkipped: 'The room voted to skip the song',
  syncFromQueue: (title: string, name: string) => `From the shared queue: ${title} · ${name}`,
  syncReconnecting: 'Reconnecting to the listening session…',
  syncNewHost: (name: string) => `${name} is hosting the session now`,
  syncYouHost: 'You’re hosting the session now',
  syncQueueTab: 'Queue',
  syncQueueTitle: 'Shared queue',
  syncQueueNowPlaying: 'Now playing',
  syncQueueEmpty: 'Nothing queued yet. Pick “Add to queue” or “Play next” from any song’s ⋮ menu.',
  syncQueueListenerHint: 'DJs add songs here. You can vote to skip with the next button.',
  syncQueueFrom: (name: string) => `from ${name}`,
  syncQueuePlayNow: (title: string) => `Play “${title}” now`,
  syncQueueRemove: (title: string) => `Remove “${title}” from the queue`,
  syncQueueDrag: (title: string) => `Move “${title}”: drag, or use the arrow keys`,
  syncQueued: 'Added to the shared queue',
  syncQueuedNext: 'Plays next in the shared queue',
  syncQueueSongsOnly: 'Only single songs go into the shared queue',
  syncQueueListenerNo: 'Listeners can’t add songs to the shared queue',
  pipButton: 'Picture-in-picture',
  close: 'Close',
  lyricsLoading: 'Loading lyrics…',
  lyricsNone: 'Lyrics aren’t available for this song',
  lyricsSource: (name: string) => `Source: ${name}`,
  lyricsLocalFiles: 'Local files',
  lyricsWrong: 'Wrong lyrics?',
  lyricsPickTitle: 'Choose lyrics',
  lyricsPickLoading: 'Looking for other versions…',
  lyricsPickNone: 'No other versions found',
  lyricsPickFailed: 'Couldn’t switch the lyrics',
  lyricsTimed: 'Timed',
  lyricsTextOnly: 'Text only',
  lyricsCurrent: 'Current',
  lyricsOffset: 'Timing',
  lyricsEarlier: 'Show lyrics earlier',
  lyricsLater: 'Show lyrics later',
  lyricsReset: 'Reset',
  actionFailed: 'Something went wrong. Try again.',
  volumeLevel: (percent: number) => `Volume: ${percent}%`
};

type Strings = typeof en;

const pl: Strings = {
  menuLabel: 'YTMD',
  menuSettings: 'Ustawienia i korektor',
  menuLocal: 'Muzyka lokalna',
  menuSync: 'Słuchaj razem',
  menuRemote: 'Pilot w telefonie',
  pluginSwitchedOff: (name: string) => `Wtyczka „${name}” ciągle zgłaszała błędy i została wyłączona. Możesz ją włączyć ponownie w Ustawieniach > Wtyczki.`,
  menuMiniPlayer: 'Miniodtwarzacz',
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
  syncListenerOnly: 'W tej sesji odtwarzaniem sterują tylko DJ-e',
  syncKicked: 'Gospodarz usunął Cię z sesji',
  syncLost: 'Utracono połączenie ze wspólnym słuchaniem',
  syncRoleModerator: 'Twoja rola: moderator',
  syncRoleDj: 'Twoja rola: DJ. Możesz sterować odtwarzaniem',
  syncRoleListener: 'Twoja rola: słuchacz',
  syncVotedSkip: 'Twój głos za pominięciem utworu został oddany',
  syncVoteProgress: (name: string, have: number, need: number) => `${name} głosuje za pominięciem (${have}/${need})`,
  syncVoteSkipped: 'Słuchacze przegłosowali pominięcie utworu',
  syncFromQueue: (title: string, name: string) => `Ze wspólnej kolejki: ${title} · ${name}`,
  syncReconnecting: 'Łączenie ponownie ze wspólnym słuchaniem…',
  syncNewHost: (name: string) => `${name} prowadzi teraz sesję`,
  syncYouHost: 'Teraz Ty prowadzisz sesję',
  syncQueueTab: 'Kolejka',
  syncQueueTitle: 'Wspólna kolejka',
  syncQueueNowPlaying: 'Teraz gra',
  syncQueueEmpty: 'Kolejka jest pusta. Wybierz „Dodaj do kolejki” lub „Odtwórz jako następny” z menu ⋮ dowolnego utworu.',
  syncQueueListenerHint: 'Utwory dodają tu DJ-e. Ty możesz głosować za pominięciem przyciskiem „następny”.',
  syncQueueFrom: (name: string) => `od: ${name}`,
  syncQueuePlayNow: (title: string) => `Zagraj teraz: „${title}”`,
  syncQueueRemove: (title: string) => `Usuń z kolejki: „${title}”`,
  syncQueueDrag: (title: string) => `Przesuń „${title}”: przeciągnij albo użyj strzałek`,
  syncQueued: 'Dodano do wspólnej kolejki',
  syncQueuedNext: 'Zagra jako następny we wspólnej kolejce',
  syncQueueSongsOnly: 'Do wspólnej kolejki trafiają tylko pojedyncze utwory',
  syncQueueListenerNo: 'Słuchacze nie dodają utworów do wspólnej kolejki',
  pipButton: 'Obraz w obrazie',
  close: 'Zamknij',
  lyricsLoading: 'Wczytywanie tekstu…',
  lyricsNone: 'Tekst tego utworu jest niedostępny',
  lyricsSource: (name: string) => `Źródło: ${name}`,
  lyricsLocalFiles: 'Pliki lokalne',
  lyricsWrong: 'Zły tekst?',
  lyricsPickTitle: 'Wybierz tekst',
  lyricsPickLoading: 'Szukanie innych wersji…',
  lyricsPickNone: 'Nie znaleziono innych wersji',
  lyricsPickFailed: 'Nie udało się zmienić tekstu',
  lyricsTimed: 'Z synchronizacją',
  lyricsTextOnly: 'Sam tekst',
  lyricsCurrent: 'Obecny',
  lyricsOffset: 'Synchronizacja',
  lyricsEarlier: 'Pokazuj tekst wcześniej',
  lyricsLater: 'Pokazuj tekst później',
  lyricsReset: 'Resetuj',
  actionFailed: 'Coś poszło nie tak. Spróbuj ponownie.',
  volumeLevel: (percent: number) => `Głośność: ${percent}%`
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
