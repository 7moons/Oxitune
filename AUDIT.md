# AUDIT.md — YTMD przed wydaniem publicznym

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
