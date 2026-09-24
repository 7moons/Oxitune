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
