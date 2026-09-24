# AUDIT.md — YTMD przed wydaniem publicznym

> **24.09.2026: projekt nazywa się teraz Oscilla** (§10). Poniższy tekst to zapis audytu i
> zostawia nazwę YTMD tam, gdzie opisuje stan z tamtej chwili.

Dokument prowadzony w trakcie prac. Sekcje: stan wyjściowy → rozbieżności README/kod →
problemy z priorytetami → poprawki (z commitami) → pomiary → nowe funkcje → zależności →
decyzje do zatwierdzenia → rzeczy niezrobione.

Punkt wyjścia: commit `c4a9297` (gałąź `claude/bold-newton-78msu6`), wersja 0.2.0.
Stan bazowy: `tsc --noEmit` OK, `bun test` 219/219, `cargo test` 219 pass / 3 ignored,
`cargo clippy --all-targets -D warnings` czysto (Linux).

---

## 1. Stan wyjściowy

### 1.1 Wersje kluczowych zależności (Cargo.lock / bun.lock)

| Crate / pakiet | Wersja | Uwagi |
|---|---|---|
| tauri / tauri-build / wry | 2.11.5 / 2.6.3 / 0.55.1 | aktualne |
| tauri-plugin-shell | 2.3.5 | używane tylko `shell:default` (open) |
| tauri-plugin-updater | 2.10.1 | podpis minisign, klucz `A721E1BF70C34591` (bez zmian) |
| tauri-plugin-log / single-instance / deep-link | 2.9.2 / 2.4.5 / 2.4.10 | |
| tauri-plugin-dialog / opener / store / notification / global-shortcut | 2.7.3 / 2.5.5 / 2.4.4 / 2.3.3 / 2.3.2 | `store` nieużywany w Rust ani w UI |
| ring / rustls | 0.17.14 / 0.23.43 | AES-GCM, PBKDF2, SHA-256 |
| rumqttc | 0.25.1 | MQTT po TLS do publicznych brokerów |
| axum / tower-http | 0.8.9 / 0.6.11 | pilot w telefonie |
| tokio / reqwest | 1.53.1 / 0.12.28 | reqwest z feature `blocking` |
| souvlaki | 0.7.3 | MPRIS (Linux) **i SMTC (Windows)**; README tego nie mówi |
| lofty / id3 / image / zbus / rust-embed | 0.25.1 / 1.17.1 / 0.25.10 / 5.19.0 / 8.12.0 | |
| @tauri-apps/api / cli | 2.11.1 / 2.11.4 | |
| vite / typescript | 6.4.3 / 5.9.3 | |

### 1.2 Okna i capabilities (przed zmianami)

Jedna capability `default` dla **`"windows": ["*"]`** z `remote.urls`:
`https://music.youtube.com/*`, `http://localhost:*`, `http://127.0.0.1:*`.
Uprawnienia: `core:default`, `core:window:*` (show/hide/close/minimize/maximize/drag/always-on-top),
`core:webview:default`, `core:event:default`, `core:app:default`, `core:path:default`,
`core:tray:default`, `core:menu:default`, `core:image:default`, `core:resources:default`,
`global-shortcut:default`, `notification:default`, `shell:default`.

Skutek: strona `music.youtube.com` (w tym każdy skrypt Google/reklam wykonujący się w top-frame)
dostaje **te same** uprawnienia co lokalne okna ustawień: może emitować i nasłuchiwać
dowolnych zdarzeń Tauri (np. `player-command`, `sync-*`, `remote-action`, `config-updated`),
tworzyć menu/tray, otwierać URL-e przez shell. `withGlobalTauri: true` wystawia `window.__TAURI__`.
CSP lokalnych okien: `null` (brak). Asset protocol włączony, scope pusty (otwierany w runtime
na katalog biblioteki).

Okna: `main` (tworzone w `lib.rs`, URL zewnętrzny), `miniplayer`, `settings`, `local`, `sync`
(z `tauri.conf.json`, tworzone przy starcie i ukrywane — nie leniwie).

### 1.3 Komendy IPC i kto je może wywołać

`#[tauri::command]` (invoke_handler, lokalne okna — brak app-manifestu ACL, więc **każde**
lokalne okno może wywołać **każdą** komendę): `get_config`, `save_config`, `update_track_info`,
`get_current_track`, `toggle_*` (4), `send_player_command`, `send_seek_command`,
`send_volume_command`, 6× lyrics, `notify_track_change`, `download_track`, `scan_local_music`,
22× sync (`create/join/leave/end`, role, kick, ban, approval, discord invite, queue, test),
`set_shortcut`, `reset_shortcuts`, `open_logs_folder`, `export_settings`, `import_settings`,
`broadcast_sync_state`, `get_remote_info`, `regenerate_remote_token`, `set_inhibit_sleep`,
okna (3), `get_app_version`, `check_for_updates`, `install_update`.

Strona YTM (origin zdalny) nie może wywołać komend bezpośrednio (Tauri odrzuca app-komendy
dla originów zdalnych bez ACL), więc używa **mostu zdarzeniowego**: `emit('ytmd-invoke',
{id, cmd, args})` → `bridge.rs::dispatch` → `emit('ytmd-response-{id}')`. Tabela
`bridge_commands!` (31 poz.) zawierała m.in.: `get_config` (cały config, w tym ścieżki),
`save_config` (**zapis całej konfiguracji** — w tym `custom_css`, `download_dir`,
`local_music_dir`, `remote_port`), `get_remote_info` (**zwraca token pilota**),
`download_track` (uruchamia `yt-dlp` i zapisuje pliki na dysk), `get_sync_room_state`
(**zwraca kod pokoju = klucz szyfrujący**), komendy kolejki/reakcji/sterowania pokojem.
Ponieważ odpowiedź idzie zdarzeniem rozgłoszeniowym, **każdy** słuchacz (także inne okna)
widzi odpowiedzi, a każdy kod na stronie może podsłuchać `ytmd-response-*`.

### 1.4 Jak działają obecne pluginy

`src/plugins/*` to singletony `YTMDPlugin` wkompilowane w `preload.js` (IIFE), rejestrowane
w `src/preload/index.ts` przez `PluginRegistry` (izolacja błędów przez try/catch per hook,
brak auto-wyłączania). Lista: adblock, sponsorblock, lyrics, volume, notifications,
visualizer, audio-dsp, ambient, themes, pip, downloader, local-files, sync-room, power, remote.
Kontekst `PluginContext` daje każdemu pluginowi pełny `invoke` (cały most) — brak uprawnień.

### 1.5 Rozbieżności README ↔ kod (stan wyjściowy)

| README | Kod |
|---|---|
| „<100MB RAM” | brak pomiaru; WebKitGTK z YTM zwykle >300 MB (patrz sekcja pomiarów) |
| kody `YTMD-XXXX` | kody `YTMD-` + 10 znaków (~50 bitów) |
| „E2E, brokery i LAN widzą tylko nieprzezroczyste bajty” | szyfrowanie tak, ale **brak uwierzytelnienia nadawcy**: każdy z kodem może podszyć się pod hosta lub dowolnego członka (MQTT: tożsamość = pole `user_id` w wiadomości) |
| „usunięta instalacja nie wróci” | ban po `client_id` wysyłanym przez klienta — nowy losowy `client_id` = nowa tożsamość |
| tylko MPRIS | na Windows `souvlaki` robi SMTC (działa, nieudokumentowane) |
| Crossfade 0–12 s, speed 0.5–2.0 | config clampuje 0–30 s i 0.25–4.0 |
| brak wzmianki o autostarcie | pole `autostart` w configu istnieje, **nigdzie nie jest używane** |
| `src-tauri/src/adblock.rs` | martwy plik (nie ma go w `lib.rs`) |
| pilot „instant” | serwer pilota **domyślnie włączony** i nasłuchuje na `0.0.0.0` |

---

## 2. Problemy (priorytet)

Legenda: **K** krytyczny, **W** wysoki, **Ś** średni, **N** niski.

| # | Prio | Obszar | Problem |
|---|---|---|---|
| S1 | K | IPC | music.youtube.com ma `core:event:*`, `shell:default`, menu/tray itd. przez capability `*`; może emitować/słuchać dowolnych zdarzeń aplikacji |
| S2 | K | IPC | most `ytmd-invoke`: zapis całego configu, `download_track` (yt-dlp → dysk), odczyt tokenu pilota i kodu pokoju z originu YTM |
| S3 | K | Sync | nadawca nieuwierzytelniony: dowolny posiadacz kodu podszywa się pod hosta (State/Kicked/HostHandoff) lub pod moderatora (MQTT bierze `user_id` z treści) |
| S4 | W | Sync | ~50 bitów entropii + stała sól PBKDF2 (20k iteracji); topic id publiczny na brokerze → offline brute-force wszystkich pokoi naraz; party id Discorda = SHA-256(kod) bez rozciągania — ~2^49 SHA-256 na pokój z zaproszeniem |
| S5 | W | Sync | brak ochrony przed replay (np. odtworzenie `Kicked`, `Leave`, `Control`) — obserwator brokera może powtarzać szyfrogramy |
| S6 | Ś | Sync | ban obchodzony nowym `client_id`; wyrzucony zna klucz i dalej czyta ruch (ograniczenie modelu „kod = sekret”) |
| S7 | Ś | Sync LAN | nieuwierzytelniony beacon UDP (każdy w LAN może przekierować gościa), brak limitu jednoczesnych połączeń TCP |
| S8 | W | Pilot | domyślnie włączony, nasłuch `0.0.0.0`, brak rate-limitu wiadomości WS i prób auth |
| S9 | W | Okna | brak CSP w lokalnych oknach; główne okno może nawigować dokądkolwiek; `window.open` bez kontroli |
| S10 | Ś | Pliki | `~/.ytmd` i `config.json`, `sync_client_id`, `session.json`, logi tworzone z domyślnym umask (0644/0755) |
| S11 | Ś | Import | import backupu nadpisuje `custom_css` bez ostrzeżenia i bez limitu rozmiaru pliku |
| S12 | Ś | Supply chain | akcje GitHub przypięte do tagów, nie SHA; brak `permissions:` w `ci.yml`; brak `cargo audit/deny`; brak kontroli zgodności wersji |
| S13 | N | Logi | brak panic hooka (crash nie zostawia śladu w logach) |
| F1 | W | Funkcje | brak ograniczenia nawigacji, ekranu offline, zapamiętywania okien, autostartu (mimo pola w configu) |

(Status każdego punktu — sekcja 3.)

---

## 3. Poprawki — Faza 1 (bezpieczeństwo)

| # | Status | Co zrobiono | Commit |
|---|---|---|---|
| S1, S2 | ✅ | ACL app-manifest (`build.rs`), **capability per okno**; `main` (tylko `https://music.youtube.com/*`) ma wyłącznie `allow-ytmd-bridge` + `allow-ytmd-subscribe`, **zero** uprawnień do zdarzeń, okien, shell, dialogów. Most zdarzeniowy `ytmd-invoke` usunięty: żądania przez komendę `ytmd_bridge` (odpowiedź bezpośrednia), zdarzenia przez `Channel` filtrowany w `page_ipc.rs` (lista `PAGE_EVENTS`, projekcje: config bez ścieżek/portów, pokój bez kodu/banów). Z tabeli mostu usunięto `save_config`, `get_remote_info`, `download_track`; `get_config` zwraca tylko pola używane przez wtyczki strony. Walidacja: `TrackPayload::sanitized` (tekst, https-only cover, id), `SyncPlaybackState::sanitized`, limity lyrics/offsetów/kolejki. QR pilota przeniesiony do Ustawień. Testy: `acl_tests.rs` (mock runtime Tauri, realne capability), `bridge.rs`, `page_ipc.rs`, `sync.test.ts` (capabilities), `bridge_client.test.ts`. | `6b897ad`, `6346b82`, `3ccca98` |
| S3–S6 | ✅ (z ograniczeniami opisanymi niżej) | **Protokół sync 3**: kod 130 bitów (26 znaków), HKDF-SHA256 (osobne etykiety klucza i topicu), podpis Ed25519 każdej wiadomości kluczem instalacji (`~/.ytmd/sync_identity`, 0600), AEAD z AAD = wersja + topic; host wiąże member id z kluczem, goście pinują klucz hosta (TOFU przy pierwszym dołączeniu, oczekiwany następca/handoff przy reconnect); ochrona przed replay (sesja + okno licznika 1024, nowa sesja tylko ±10 min). Stare kody → `sync.error.oldCode`; klient v2 dostaje od hosta v3 `Rejected{Outdated}` w starym formacie (MQTT i LAN). | `598cbd1`, `e0a2d84` |
| S7 | ✅ | Beacon LAN szyfrowany i podpisany (port nie do podrobienia bez kodu, gość zna klucz hosta przed połączeniem), limit 32 równoległych handshake'ów TCP, bufor beaconu 1400 B (wcześniejsze 512 B gubiło losowo beacony v3 — złapane przez flaky test, patrz `e0a2d84`). | `598cbd1`, `e0a2d84` |
| S8 | ✅ | Pilot domyślnie **wyłączony**; nowa opcja `remote_bind` (`lan` = tylko prywatny adres LAN, domyślnie; `all` = wszystkie interfejsy); limit błędnych tokenów per IP (20/min → 429); token bucket dla wiadomości WS (20/s, burst 40). Już wcześniej: token 32 znaki w QR→cookie HttpOnly/SameSite=Strict, walidacja Host (DNS rebinding) i Origin, limit ramki WS 16 KB, 8 klientów, brak endpointów poza sterowaniem. | `d3b0dde` |
| S9 | ✅ | CSP dla okien lokalnych (bez `unsafe-eval`, skrypty tylko `'self'`; `style-src 'unsafe-inline'` zostaje, bo kit UI wstrzykuje `<style>`); główne okno: `on_navigation` tylko domeny YouTube/Google (logowanie), `on_new_window` → przeglądarka systemowa (http/https), nic nie otwiera się w aplikacji. | `1b666f7` |
| S10 | ✅ | `~/.ytmd` 0700; config/sesja/token/tożsamość zapisywane atomowo 0600 (`secure_fs.rs`); stare pliki zawężane przy starcie; `sync_client_id` (v2) usuwany; asset protocol ma zakaz `~/.ytmd` nawet gdy biblioteka = katalog domowy. Logi: przejrzane — brak tokenów, kodów pokoju, cookies; konsola WebView nie trafia do logów; rotacja 5×2 MB. | `1b666f7`, `963c01f` |
| S11 | ✅ | Import backupu: limit 1 MB, nigdy nie importuje folderów ani włączenia/interfejsu pilota, custom CSS tylko po jawnym potwierdzeniu z ostrzeżeniem o zewnętrznych zasobach. | `1b666f7` |
| S12 | ✅ | `cargo deny` (`src-tauri/deny.toml`), `bun audit`, akcje przypięte do SHA, `permissions:` minimalne, Dependabot, `--locked`/`--frozen-lockfile`, `scripts/versions.ts` (check w CI i względem tagu). rustls → 0.23.45. | `963c01f` |
| — | ✅ | `local_files`: skan odrzuca symlinki wychodzące poza katalog (było); asset protocol Tauri kanonizuje ścieżkę i rozwiązuje symlinki przed sprawdzeniem scope (zweryfikowane w źródle `tauri::scope::fs::is_allowed`), scope = tylko skonfigurowany katalog biblioteki. | — |
| — | ✅ | Wstrzykiwanie treści: w `src/` brak `innerHTML`/`insertAdjacentHTML`/`document.write` (UI budowane przez `createEl`/`textContent`); reakcje to zamknięty zbiór emoji; nicki/tytuły przycinane i bez znaków kontrolnych w Rust (`clean_text`), tytuły z oEmbed też. | — |

### Kryptografia Listen Together — ocena przed/po

**Przed (protokół 2):** kod `YTMD-` + 10 znaków z alfabetu 32 = 50 bitów. Klucz i publiczny
topic id = PBKDF2-HMAC-SHA256(kod, **stała sól**, 20 000 iteracji). Topic id jest widoczny dla
każdego subskrybenta publicznego brokera (np. `#` na test.mosquitto.org), więc atak offline:
2^50 × 20 000 HMAC ≈ 2^65 operacji SHA-256; hashcat PBKDF2-SHA256 na RTX 4090 ≈ 8.8 MH/s przy
999 iteracjach → ~0.44 M prób/s przy 20 000 → średnio 2^49 / 0.44 M ≈ **40 lat na 1 GPU, ~15 dni
na 1000 GPU (~140 tys. USD w chmurze)**. Stała sól = jedna tablica/jeden przebieg łamie
**wszystkie** pokoje naraz. Dodatkowo `party_id` Discorda = SHA-256("ytmd-party:"+kod) bez
rozciągania: ~2^49 SHA-256 ≈ **kilkanaście godzin na jednym GPU** dla pokoju z zaproszeniem (tam
kod i tak jest w linku przycisku). Brak uwierzytelnienia nadawcy (MQTT brał `user_id` z treści),
brak ochrony przed replay.

**Po (protokół 3):** 130 bitów losowości z OS RNG → brute force 2^129 średnio — poza zasięgiem;
HKDF wystarcza (klucz o pełnej entropii nie potrzebuje rozciągania). Nonce: 96-bitowy losowy
na wiadomość; przy jednym kluczu na pokój bezpieczny limit ~2^32 wiadomości (pokój nie zbliża
się do tego). AEAD AES-256-GCM (ring), AAD = wersja protokołu + topic id. Podpisy Ed25519 (ring).
Rozważony PAKE (SPAKE2/CPace): wymaga interaktywnego uzgodnienia per gość w modelu
host-broker-wielu gości i nowej zależności (crate `spake2` bez aktywnego rozwoju); wybrano
wariant „długi losowy sekret w linku/QR/kodzie” — bez nowych zależności.

**Ograniczenia (świadome, opisane w README):**
- kod jest sekretem na okaziciela — kto go ma, czyta pokój i może poprosić o wejście
  (dlatego zaproszenie Discord wymusza zatwierdzanie);
- wyrzucony uczestnik, który zna kod, może dalej **czytać** ruch do końca sesji (rotacja klucza
  wymagałaby kanałów parami — MLS-podobny protokół; poza zakresem, patrz „Decyzje”); nie może
  się podszyć ani wrócić pod starym kluczem;
- ban dotyczy klucza instalacji; nową instalacją można próbować ponownie — przy włączonym
  zatwierdzaniu wymaga zgody hosta;
- pierwsze dołączenie ufa pierwszemu hostowi, który odpowie z tym kodem (TOFU);
- broker widzi: topic id, rozmiary, czas, adresy IP klientów.

Testy: `sync_crypto.rs` (kody, KDF, AEAD, podrobiony podpis, replay, okno licznika, stała
sesja, tożsamość 0600, zgodność LegacyCipher z v2), `sync_room.rs` (gość słucha tylko klucza
hosta, member id związany z kluczem, State podpisany przez nazwanego hosta, stare kody, klient
v2 dostaje Outdated, linie LAN podpisane cudzym kluczem ignorowane, beacon wymaga pieczęci
pokoju, beacon mieści się w buforze). Testy MQTT z prawdziwymi brokerami w tym środowisku się
pomijają (proxy blokuje brokery) — w CI GitHub wykonują się normalnie.

---

## 4. Pomiary (Faza 2)

Środowisko: Linux, WebKitGTK 2.x, Xvfb, bez GPU. Skrypty: PSS = suma `Pss` z
`/proc/<pid>/smaps_rollup` procesu aplikacji i wszystkich potomków (WebKitWebProcess,
WebKitNetworkProcess), 20 s po starcie; CPU = przyrost `utime+stime` wszystkich procesów przez
10 s; start = czas od `exec` do zmapowanego okna (`xwininfo`, 6 przebiegów na przemian
przed/po, mediana). **YouTube Music nie był ładowany** (proxy środowiska blokuje
music.youtube.com), więc to koszt samej aplikacji, bez strony YTM.

| Metryka | Przed | Po | Zmiana | Commit |
|---|---|---|---|---|
| PSS bezczynnie, build z `tauri build` (0.2.0 vs HEAD) | 618 MB | 357 MB | −42% | `159866f` |
| PSS bezczynnie, ten sam build, tylko leniwe okna | 531.7 MB | 307.6 MB | −224 MB (4 ukryte okna × ~71 MB) | `159866f` |
| Okno główne na ekranie od startu | ~586 ms | ~530 ms | −10% | `159866f` |
| Binarka (release) | 39.1 MB (`tauri build`; 36.6 MB `cargo build`) | 15.9 MB (15.4 MB) | −59% | `159866f` |
| Instalator `.deb` | 13.54 MB | 7.37 MB | −46% | `159866f` |
| Ponowny skan biblioteki, 3000 plików | 88 ms (na głównym wątku) | 32 ms (poza nim, cache mtime/rozmiar) | −64%, UI nie blokowane | `159866f` |
| CPU bezczynnie na ekranie offline | ~4% rdzenia | ~0.3% rdzenia | backoff 10 s→5 min, jeden klient TLS | `01ff2c0` |
| CPU bezczynnie (bez YTM) | ~0.6% | ~0.3–0.6% | bez zmian (szum) | — |

Przyczyny i poprawki:
- 4 okna towarzyszące tworzone przy starcie jako ukryte — każde to osobny proces WebKit
  (~71 MB PSS). Teraz `windows.rs` tworzy je przy pierwszym otwarciu; Ustawienia i Biblioteka
  są niszczone przy zamknięciu (po zapisaniu oczekującej zmiany), mini player i Listen Together
  się chowają (szybki powrót).
- `[profile.release]`: `lto`, `codegen-units = 1`, `opt-level = "s"`, `strip`. `panic`
  zostaje `unwind` (panika w zadaniu w tle nie może zabić odtwarzacza; panic hook ją loguje).
- `scan_local_music` był synchroniczną komendą (główny wątek) — teraz `async` +
  `spawn_blocking` z przyrostowym cache'em w `~/.ytmd/library_cache.json`.
- Ekran offline: ponawianie z backoffem bez przemalowywania, współdzielony `reqwest::Client`.
- Wstrzykiwany skrypt: przejrzany pod kątem pętli per-klatka (to naprawiono już w 0.1.x,
  `90d0e2c`; ambient liczony raz na utwór) — bez nowych znalezisk; bez YTM nie da się go
  zmierzyć rzetelnie, więc nie podaję liczb.

Log `startup: main window in N ms` pozwala mierzyć start na maszynie użytkownika.

---

## 5. Nowe funkcje (Faza 3)

| Funkcja | Stan | Commit |
|---|---|---|
| Panic hook: `crash-<czas>.log` (komunikat, miejsce, backtrace) w `~/.ytmd/logs`, przy następnym starcie okno „Otwórz folder logów” | ✅ | `ca17bc7` |
| Ekran offline (`offline.html`, własna capability tylko z `retry_connection`), automatyczne ponawianie | ✅ | `ca17bc7`, `01ff2c0` |
| Zapamiętywanie rozmiaru/pozycji/maksymalizacji okna głównego i mini playera (`tauri-plugin-window-state`) | ✅ | `ca17bc7` |
| Autostart (`tauri-plugin-autostart`), domyślnie **wyłączony**; start z logowania → w zasobniku | ✅ | `ca17bc7` |
| Menu zasobnika, powiadomienia, okno crasha po polsku/angielsku (`i18n.rs`, język systemu) | ✅ | `ca17bc7` |
| Przyciski poprzedni/odtwórz/następny w podglądzie paska zadań Windows (`thumbbar.rs`, ITaskbarList3) | ✅ (sprawdzone `clippy --target x86_64-pc-windows-gnu`, nie uruchamiane na Windows) | `78d2403` |
| Naprawa: MPRIS/SMTC Toggle i „Odtwórz/Pauza” z zasobnika wysyłały `play-pause` (nieobsługiwane) — nic nie robiły | ✅ + test | `78d2403` |
| SMTC (Windows) i MPRIS (Linux) | były (souvlaki); zweryfikowane komendy | — |
| Jedna instancja | była (`tauri-plugin-single-instance`) | — |
| Metadane instalatora (wydawca, kategoria, opisy, licencja, strona) | ✅ | `01ff2c0` |
| Podpisywanie kodu Windows / build macOS | ❌ — decyzja, patrz §8 | — |
| Testy: ACL (mock runtime), crypto, pluginy E2E (podpisany rejestr → skrypt strony), komendy odtwarzacza, wersje, strona join | ✅ | różne |

Stan testów na HEAD: `cargo test` 278 pass (+59 od bazy), `bun test` 235 pass (+16),
`clippy -D warnings` czysto na Linux i `x86_64-pc-windows-gnu`, `cargo deny check` OK,
`tsc --noEmit` OK, `bun run build` OK.

---

## 6. System pluginów (Fazy 4–5)

- **API v1** (`docs/PLUGIN_API.md`): manifest (`id` reverse-DNS, semver, `apiVersion`,
  `matches`, `runAt`, zamknięty zbiór uprawnień `player:read`, `player:control`, `page`,
  `storage`, `network`+`hosts`, `ui`; `internal:*` tylko dla wbudowanych), schemat ustawień
  renderowany w Ustawieniach, izolacja błędów per callback, wyłączenie po 5 błędach.
- **Loader** (`src-tauri/src/plugins/`, `src/preload/pluginHost.ts`): każdy włączony plugin to
  osobny initialization script → `__ytmdDefinePlugin` → zamrożony obiekt `ytmd` tylko z
  przyznanymi grupami; storage (1 MB) i fetch (https, tylko `hosts`, 1 MB, 10 s, bez
  przekierowań) ponownie sprawdzane w Rust.
- **Wbudowane funkcje** mają `manifest.json` (`app.ytmd.*`) i kontekst zawężony do uprawnień
  (`scopedContext`); test pilnuje, by nie wołały komend/zdarzeń poza nimi.
- **Menedżer** (Ustawienia → Pluginy): włącz/wyłącz, ustawienia, odinstaluj, aktualizacje
  czekające na zgodę (nowe uprawnienia), rejestry (URL + klucz minisign, weryfikowane przed
  zapisaniem), interwał sprawdzania aktualizacji (6/12/24 h, 0 = nigdy), tryb deweloperski za
  ostrzeżeniem, przycisk restartu.
- **Instalacja**: `index.json` + `.minisig` weryfikowane kluczem użytkownika, SHA-256
  archiwum z podpisanego indeksu, manifest w archiwum musi zgadzać się z wpisem (id, wersja,
  uprawnienia); rozpakowanie do staging bez ścieżek absolutnych, `..`, linków i plików
  specjalnych, limity rozmiaru/liczby plików (zip-bomb), potem atomowy `rename`.
- **Hot-reload**: wyłączenie działa od razu; włączenie/instalacja/aktualizacja wymagają
  restartu (`restart_app`, utwór wznawia się z `session.json`) — patrz §8.
- **Wydzielone**: adblock i SponsorBlock → `_plugins-export/plugins/` (z testami); przykład
  `app.ytmd.example-theme`. `_plugins-export/` to gotowe repo rejestru: builder
  `index.json` (odtwarzalne archiwa, te same reguły manifestu), CI na PR, workflow na tag
  (build → hash → podpis minisign → GitHub Pages), akcje przypięte do SHA.
- **Downloader usunięty** z rdzenia, potem wrócił jako addon przez `media:save` (§8.1, pkt 1) (stare komendy, UI, ustawienia `download_*` usunięte; stare pola w
  configu są ignorowane przy wczytaniu, więc format `config.json` pozostaje wstecznie
  zgodny — test `config` z polami download to sprawdza).

Pozostałe wystąpienia „ad”/„download” w rdzeniu (świadomie): pobieranie aktualizacji
(updater), pobieranie pluginów/rejestrów, wykrywanie reklamy YTM w `observer.ts` i
`sync-room` (host nie synchronizuje reklamy jako utworu), test zgodności wstecznej configu,
parser Genius pomija `div`y reklamowe, `nav_policy` przepuszcza ramki doubleclick/
googlesyndication (bez tego YTM się nie ładuje — to nie blokowanie, tylko pozwolenie).

---

## 7. Zależności

| Zmiana | Uzasadnienie |
|---|---|
| − `tauri-plugin-shell`, − `tauri-plugin-store` | nieużywane; shell to niepotrzebna powierzchnia ataku |
| − `reqwest` feature `blocking` | nieużywany, osobny runtime |
| − `@tauri-apps/api`, `plugin-global-shortcut`, `plugin-notification`, `plugin-shell`, `plugin-store` (JS) | okna używają `window.__TAURI__` (typowane w `global.d.ts`), paczki nieimportowane |
| + `tauri-plugin-window-state` | zapamiętywanie okien (oficjalny plugin Tauri; własna implementacja = więcej kodu i błędów przy wielu monitorach) |
| + `tauri-plugin-autostart` | autostart na Linux/Windows (oficjalny) |
| + `minisign-verify`, `tar`, `flate2`, `semver` | weryfikacja podpisu rejestru, rozpakowanie i wersje pluginów — **już były w drzewie** przez `tauri-plugin-updater`, więc zero nowego kodu w binarce; bez własnej kryptografii |
| `ring` (bez zmiany wersji, nowe użycie: HKDF, Ed25519) | już w drzewie (rustls); zamiast dodawać `ed25519-dalek`/`hkdf` |
| + `windows` features `Win32_UI_Shell`, `…WindowsAndMessaging`, `…Graphics_Gdi`, `…Globalization` | przyciski paska zadań, język systemu |
| dev: `tauri` feature `test` | mock runtime do testów ACL |
| `rustls` 0.23.43 → 0.23.45 | RUSTSEC-2026-0285 |
| zignorowane w `deny.toml`: 4 advisories `rustls-webpki 0.102.8` | `rumqttc` linkuje ją tylko dla typu błędu; weryfikacja certyfikatów idzie przez 0.103.15 — do usunięcia przy aktualizacji rumqttc |

---

## 8. Decyzje

### 8.1 Zatwierdzone (24.09.2026)

| # | Decyzja | Co wdrożono |
|---|---|---|
| 1 | **Downloader jako addon**, wariant „uprawnienie + yt-dlp” | Nowe uprawnienie `media:save` (`plugins/media_save.rs`): plugin podaje tylko id utworu (11 znaków) i format z listy; rdzeń uruchamia yt-dlp zainstalowany przez użytkownika (nigdy go nie pobieramy) ze stałą linią poleceń (`--ignore-config`, bez powłoki, tylko `music.youtube.com/watch?v=<id>`, `--no-overwrites`) do folderu wybranego w Ustawieniach → Pluginy; 2 naraz, max 20 w kolejce; postęp do strony tylko z nazwą pliku. Addon `app.ytmd.downloader` w rejestrze (przycisk w pasku odtwarzacza z pierścieniem postępu, PL/EN). Linia poleceń sprawdzona z prawdziwym yt-dlp 2026.08.19 + ffmpeg dla mp3/m4a/opus/flac (test `real_ytdlp`, `--ignored`). Commit `ab960ee`. **Odstępstwo od pierwotnego wymogu „zero download w rdzeniu”** — świadome, na Twoją decyzję; bez zainstalowanego addonu ten kod nic nie robi. |
| 1b | **yt-dlp i ffmpeg instalowane jednym kliknięciem** (24.09) | `plugins/media_tools.rs`: addon proponuje instalację (toast z przyciskiem, też przy pierwszym kliknięciu „Zapisz”), **zgodę daje użytkownik w natywnym oknie YTMD** (strona nie może go potwierdzić), albo przycisk w Ustawieniach. Źródła: najnowsze wydanie yt-dlp (tag z przekierowania `/releases/latest`, więc plik i `SHA2-256SUMS` z tego samego wydania) i `yt-dlp/FFmpeg-Builds` (`checksums.sha256`); tylko https i hosty GitHuba (także po przekierowaniach); limity rozmiaru; z archiwum kopiowane tylko `ffmpeg`/`ffprobe` pod stałymi nazwami (ścieżki z archiwum nigdy nie są używane do zapisu). Do `~/.ytmd/tools/`, podmiana dopiero po sprawdzeniu wszystkiego; yt-dlp odświeżany co 7 dni. Nowe zależności: `lzma-rs` (+`crc`, `crc-catalog`; czysty Rust) do `.tar.xz`, cecha `deflate-flate2` crate'u `zip` (już w drzewie przez updater). **Model zaufania:** TLS + GitHub + suma z tego samego wydania chroni przed uszkodzeniem i podmianą po drodze, ale nie przed przejęciem kont wydawców — podpisów GPG yt-dlp nie weryfikujemy (wymagałoby implementacji OpenPGP). To samo zaufanie, co przy ręcznym pobraniu z GitHuba. Testy: sumy, tag, dozwolone hosty, wypakowanie tar.xz/zip (tylko 2 pliki, ścieżki ignorowane), brak ffmpeg w archiwum, preferencja własnych kopii, jedna instalacja naraz; test `real_tools_install` (`--ignored`) pobiera naprawdę — **tu niewykonany, bo proxy tego środowiska blokuje github.com**; pobieranie/sumy/limity sprawdzone na lokalnym serwerze HTTP, a rozpakowanie na archiwach z prawdziwego `xz` (domyślny CRC64, wiele bloków, `-9e`). Ograniczenie: `lzma-rs` nie czyta xz z kontrolą SHA-256 (FFmpeg-Builds pakuje `tar cJf`, czyli CRC64); gdyby to się zmieniło, instalacja kończy się czytelnym błędem, nie cicho. |
| 2 | **Oficjalny rejestr wbudowany**, repo `oscilla-plugins` | `registry::official()`: `https://kayzedd.github.io/oscilla-plugins/index.json`, klucz minisign `2254F07B14D10D3E` wkompilowany (`OFFICIAL_KEY`); użytkownik może go usunąć i przywrócić; zapisany w stanie rejestr nie może udawać oficjalnego (test). Parę kluczy wygenerowałem w sesji (Twój wybór); sekret i hasło są tylko w katalogu tymczasowym sesji, nie w repo — do wklejenia w GitHub Secrets repo rejestru. Test pilnuje, że `_plugins-export/minisign.pub` = `OFFICIAL_KEY`. Commit `50a4001`. |
| 3 | **Bez płatnego certyfikatu** | Windows zostaje niepodpisany (SmartScreen: „Więcej informacji → Uruchom mimo to”); aktualizacje i tak są podpisane minisign. Brak builda macOS (notaryzacja wymaga płatnego konta Apple). Darmowa opcja na przyszłość: **SignPath Foundation** podpisuje za darmo projekty open source (wymaga zgłoszenia i ich zasad dla buildów z CI). |
| 4 | **Rotacja klucza pokoju po wyrzuceniu: „nie wiem”** | Zostaje stan obecny (bez rotacji). Rekomendacja: tak zostawić — wyrzucony nie może pisać ani się podszywać, a żeby odciąć czytanie, host zakłada nowy pokój. Rotacja miałaby sens dopiero przy dużych, publicznych pokojach. |
| 5 | **Ścieżki: `~/.ytmd`**, później zmiana nazwy na **Oscilla** | Bez zmian teraz. Przy rebrandingu potrzebna migracja `~/.ytmd` → nowy katalog (config, sesja, `sync_identity`, pluginy, token pilota, cache), identyfikator aplikacji Tauri (`identifier`), nazwa pakietów, `ytmd://` (zostawić jako alias) i adres updatera. Rejestr już nazywa się `oscilla-plugins`, więc jego adres się nie zmieni. |
| 6 | **Restart zamiast hot-reloadu** | Bez zmian. |

### 8.2 Otwarte (wdrożony zachowawczy wariant)

1. **Pluginy nie są sandboxowane** — działają w realmie strony YTM (jak userscript). Sufit
   to wąski most strony (§3, S1/S2). Prawdziwa izolacja (iframe/worker + postMessage) to API
   v2 i utrata `page`/`document-start`. Zaufanie = rejestr.
2. **CSP `style-src 'unsafe-inline'`** w oknach lokalnych: kit UI wstrzykuje `<style>`;
   usunięcie = przepisanie kitu na arkusze statyczne/nonce. Skrypty bez `unsafe-*`.
3. **Pilot domyślnie wyłączony, `remote_bind = lan`** — zmiana zachowania względem 0.2.0.
4. **Protokół sync 3** nie współpracuje z 0.2.x — starsi dostają czytelny komunikat
   „zaktualizuj”; stare kody pokoi przestają działać.
5. **PAKE zamiast długiego kodu** — odrzucone (§3); do rozważenia, jeśli kody mają być
   krótkie/do podyktowania.

---

## 9. Niezrobione / ograniczenia

- Pamięć i CPU **z załadowanym YouTube Music** nie zmierzone (proxy środowiska blokuje
  music.youtube.com); podane liczby to koszt samej aplikacji.
- Windows (WebView2) nie mierzony ani nie uruchamiany; kod Windows sprawdzany tylko
  kompilacją `x86_64-pc-windows-gnu` + clippy (i job `backend-windows` w CI).
- Testy MQTT z publicznymi brokerami pomijane lokalnie (proxy), wykonują się w CI GitHub.
- Pluginy nie są sandboxem (§8.5); manifest ogranicza dobrze napisany plugin, nie złośliwy.
- Brak podpisu kodu Windows i builda macOS (§8.8–9).
- `_plugins-export/` nie jest jeszcze wypchnięty jako repo `KayZedd/oscilla-plugins`
  (nie tworzę repozytoriów bez Twojej zgody), a sekrety `MINISIGN_SECRET_KEY` /
  `MINISIGN_PASSWORD` trzeba wkleić w jego ustawieniach. Do tego czasu wbudowany rejestr
  jest nieosiągalny i Ustawienia po prostu nie pokażą z niego wtyczek.
- `rustls-webpki 0.102.8` w drzewie przez `rumqttc` (zignorowane z uzasadnieniem, §7).

---

## 10. Zmiana nazwy na Oscilla (24.09.2026)

Na polecenie: wszędzie, gdzie widzi to użytkownik, „YTMD” → „Oscilla” (UI PL/EN z odmianą:
Oscilli/Oscillę/Oscillą, zasobnik, powiadomienia, okna dialogowe, pilot w telefonie, strona
zaproszeń, README/dokumentacja, metadane instalatora, `productName`, binarka `oscilla`, crate
`oscilla`, pakiet npm, User-Agent, logi `oscilla.log`). Przed zmianą nazwy scaliłem `main`
(12 commitów), m.in. pasek tytułu z paska nawigacji YTM — jego przyciski idą teraz przez
nową komendę mostu `window_action` (strona YTM nie ma uprawnień okna).

**Migracje (nic nie ginie):**
- `~/.ytmd` → `~/.oscilla` jednym `rename` przy pierwszym starcie (`config::app_dir_in`, testy);
  jeśli się nie uda, zostaje stary folder.
- `identifier` **bez zmian** (`com.ytmd.desktop`): pod nim są dane WebView (zalogowanie do
  YouTube), stan okien i blokada jednej instancji — zmiana wylogowałaby wszystkich.
- Linki: `oscilla://` + nadal `ytmd://`. Kody sesji: `OSC-` + 26 znaków (protokół 3 nie był
  jeszcze wydany, więc bez łamania kompatybilności); stare kody `YTMD-` dają komunikat „ze
  starej wersji”.
- Autostart: wpis pod starą nazwą (`~/.config/autostart/YTMD.desktop`, `HKCU\…\Run\YTMD`)
  usuwany przy starcie; nowy rejestrowany jak dotąd, gdy opcja jest włączona.
- Windows: hak NSIS (`src-tauri/windows/hooks.nsh`) po cichu odinstalowuje starą instalację
  „YTMD” przed instalacją Oscilli. **Niesprawdzone na prawdziwym Windowsie** — przed wydaniem
  zainstalować 0.2.0, zaktualizować i sprawdzić: jedna aplikacja, zalogowanie zostało,
  `~/.oscilla` na miejscu.
- Linux: pakiety deb/rpm `oscilla` zastępują `ytmd` (`replaces`/`conflicts`/`obsoletes`).
- Domyślny folder zapisanych utworów: `~/Music/Oscilla` (albo istniejący `~/Music/YTMD`).

**Świadomie bez zmian:** adres updatera (Cloudflare Worker), identyfikatory wewnętrzne
(`ytmd_bridge`, klasy/zdarzenia `ytmd-*`), obiekt `ytmd` w API pluginów i id `app.ytmd.*`
(zależą od nich zainstalowane pluginy), stałe protokołu (etykiety HKDF, znacznik kopii
`ytmd-settings`, więc stare kopie ustawień dalej się importują).

Później tego samego dnia repo przemianowano na `KayZedd/Oscilla`: adresy repo i strony
zaproszeń (`https://kayzedd.github.io/Oscilla/join/`) zaktualizowane. Stare zaproszenia
z przyciskiem Discorda wskazujące `…/ytmd/join/` przestają działać (GitHub Pages nie
przekierowuje po zmianie nazwy repo) — dotyczy tylko zaproszeń już wysłanych.

### Aktualizacje przez GitHub Pages zamiast Cloudflare Workera (24.09.2026)

Repo jest prywatne, więc pliki wydań nie są publicznie dostępne. Zamiast Workera (token GitHuba
po stronie Cloudflare) `pages.yml` przy każdym opublikowaniu wydania kopiuje pliki aktualizacji
najnowszego wydania na Pages (`/updates/<tag>/`) i publikuje `latest.json` z adresami tych kopii
(`scripts/update-manifest.ts`, testy: podpisy zachowane, nazwy plików i tag bez możliwości
wyjścia poza katalog, tylko https). Bezpieczeństwo bez zmian: aplikacja weryfikuje każdą
aktualizację podpisem minisign kluczem `A721E1BF70C34591` wbudowanym w aplikację, więc Pages
to tylko lustro. Brak tokenu poza GitHubem. Limity Pages: 1 GB, ~100 GB ruchu/mies. (miękki).
Instalacje 0.2.0 i starsze pytają dalej Workera — zostawić go, aż zaktualizują się do wersji
z nowym adresem (`docs/updates.md`). **Niesprawdzone end-to-end** (proxy tego środowiska blokuje
github.io): po pierwszym wydaniu sprawdzić `https://kayzedd.github.io/Oscilla/updates/latest.json`.
