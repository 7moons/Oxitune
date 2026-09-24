/**
 * Phone remote strings. Markup carries English defaults plus `data-i18n`
 * (text) / `data-i18n-label` (aria-label) / `data-i18n-placeholder` keys;
 * src/tests/remote.test.ts fails on untagged text or a key a locale lacks.
 * The locale follows the phone's language.
 */

const en = {
  'app.title': 'Oscilla remote',
  'tab.player': 'Now playing',
  'tab.lyrics': 'Lyrics',
  'tab.queue': 'Up next',
  'tab.search': 'Search',
  'tab.room': 'Listen together',

  'status.offline': 'Not connected to Oscilla. Reconnecting…',
  'status.nothing': 'Nothing is playing',

  'player.play': 'Play',
  'player.pause': 'Pause',
  'player.previous': 'Previous',
  'player.next': 'Next',
  'player.like': 'Like',
  'player.dislike': 'Dislike',
  'player.shuffle': 'Shuffle',
  'player.repeat': 'Repeat',
  'player.repeatOne': 'Repeat one',
  'player.mute': 'Mute',
  'player.volume': 'Volume',
  'player.seek': 'Seek',

  'lyrics.none': 'No lyrics for this song',
  'lyrics.source': 'Lyrics from {provider}',

  'queue.empty': 'The queue is empty',
  'queue.shared': 'Shared queue of your Listen Together session',
  'queue.remove': 'Remove from queue',
  'queue.drag': 'Drag to reorder',
  'queue.playing': 'Now playing',

  'search.placeholder': 'Search songs',
  'search.empty': 'No songs found',
  'search.play': 'Play',
  'search.next': 'Play next',
  'search.add': 'Add to queue',
  'search.added': 'Added to queue',

  'room.none': "You're not in a Listen Together session. Start or join one in Oscilla.",
  'room.members': '{count} listening',
  'room.host': 'Host',
  'room.moderator': 'Moderator',
  'room.dj': 'DJ',
  'room.listener': 'Listener',
  'room.you': '(you)',
  'room.voteSkip': 'Vote to skip',
  'room.votes': '{votes} of {needed} votes to skip',
  'room.react': 'Send a reaction',
  'room.listenerNote': 'As a listener you can react and vote to skip.',

  'error.failed': "Couldn't do that. Try again.",
  'error.timeout': "Oscilla didn't answer. Is YouTube Music open?",
  'error.noRoom': "You're not in a Listen Together session",
  'error.noQueue': 'Open the player in YouTube Music first',
  'error.gone': 'That song is no longer in the queue',
  'error.unsupported': "YouTube Music doesn't allow that here",
  'error.invalid': "That didn't look right"
};

export type RemoteKey = keyof typeof en;

const pl: Record<RemoteKey, string> = {
  'app.title': 'Pilot Oscilla',
  'tab.player': 'Odtwarzane',
  'tab.lyrics': 'Tekst',
  'tab.queue': 'Następne',
  'tab.search': 'Szukaj',
  'tab.room': 'Wspólne słuchanie',

  'status.offline': 'Brak połączenia z Oscillą. Łączenie ponownie…',
  'status.nothing': 'Nic nie jest odtwarzane',

  'player.play': 'Odtwórz',
  'player.pause': 'Wstrzymaj',
  'player.previous': 'Poprzedni',
  'player.next': 'Następny',
  'player.like': 'Podoba mi się',
  'player.dislike': 'Nie podoba mi się',
  'player.shuffle': 'Losowo',
  'player.repeat': 'Powtarzaj',
  'player.repeatOne': 'Powtarzaj jeden',
  'player.mute': 'Wycisz',
  'player.volume': 'Głośność',
  'player.seek': 'Przewiń',

  'lyrics.none': 'Brak tekstu do tego utworu',
  'lyrics.source': 'Tekst: {provider}',

  'queue.empty': 'Kolejka jest pusta',
  'queue.shared': 'Wspólna kolejka sesji wspólnego słuchania',
  'queue.remove': 'Usuń z kolejki',
  'queue.drag': 'Przeciągnij, aby zmienić kolejność',
  'queue.playing': 'Teraz odtwarzane',

  'search.placeholder': 'Szukaj utworów',
  'search.empty': 'Nie znaleziono utworów',
  'search.play': 'Odtwórz',
  'search.next': 'Odtwórz jako następny',
  'search.add': 'Dodaj do kolejki',
  'search.added': 'Dodano do kolejki',

  'room.none': 'Nie jesteś w sesji wspólnego słuchania. Rozpocznij ją lub dołącz w Oscilli.',
  'room.members': 'Słucha: {count}',
  'room.host': 'Gospodarz',
  'room.moderator': 'Moderator',
  'room.dj': 'DJ',
  'room.listener': 'Słuchacz',
  'room.you': '(ty)',
  'room.voteSkip': 'Głosuj za pominięciem',
  'room.votes': 'Głosy za pominięciem: {votes} z {needed}',
  'room.react': 'Wyślij reakcję',
  'room.listenerNote': 'Jako słuchacz możesz reagować i głosować za pominięciem.',

  'error.failed': 'Nie udało się. Spróbuj ponownie.',
  'error.timeout': 'Oscilla nie odpowiada. Czy YouTube Music jest otwarte?',
  'error.noRoom': 'Nie jesteś w sesji wspólnego słuchania',
  'error.noQueue': 'Najpierw otwórz odtwarzacz w YouTube Music',
  'error.gone': 'Tego utworu nie ma już w kolejce',
  'error.unsupported': 'YouTube Music na to tutaj nie pozwala',
  'error.invalid': 'Coś tu się nie zgadza'
};

export const REMOTE_LOCALES: Record<string, Record<RemoteKey, string>> = { en, pl };

let active: Record<RemoteKey, string> = en;

export function resolveRemoteLocale(lang: string | null | undefined): string {
  const base = (lang ?? '').toLowerCase().split('-')[0];
  return base in REMOTE_LOCALES ? base : 'en';
}

export function setRemoteLocale(lang: string): void {
  active = REMOTE_LOCALES[resolveRemoteLocale(lang)];
}

export function rt(key: RemoteKey, vars?: Record<string, string | number>): string {
  const template = active[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (vars && name in vars ? String(vars[name]) : m));
}

const isKey = (key: string | undefined): key is RemoteKey => !!key && key in en;

/** Server errors are `remote.error.<name>` keys (see remote_server.rs). */
export function errorText(error: string | undefined): string {
  const key = `error.${(error ?? '').replace(/^remote\.error\./, '')}`;
  return isKey(key) ? rt(key) : rt('error.failed');
}

export function applyRemoteI18n(root: Document): void {
  root.documentElement.lang = active === pl ? 'pl' : 'en';
  root.title = rt('app.title');
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    if (isKey(el.dataset.i18n)) el.textContent = rt(el.dataset.i18n);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
    if (isKey(el.dataset.i18nLabel)) el.setAttribute('aria-label', rt(el.dataset.i18nLabel));
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    if (isKey(el.dataset.i18nPlaceholder)) el.placeholder = rt(el.dataset.i18nPlaceholder);
  });
}
