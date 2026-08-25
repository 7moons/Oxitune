# Plan: Listen Together przez internet (libp2p, zero własnej infrastruktury)

Status: DRAFT — do akceptacji przed startem implementacji.
Poprzedni etap: LAN-only P2P (UDP beacon discovery + TCP relay) jest już zaimplementowany, przetestowany (32/32 testów Rust) i scommitowany (`src-tauri/src/sync_room.rs`, commit `7ebcdb3`). Ten plan go **rozszerza**, nie zastępuje — LAN zostaje jako pierwsza, szybsza ścieżka.

## Cel i twardy wymóg

Dwóch userów na różnych sieciach (np. Warszawa i Kraków) ma móc dołączyć do tego samego pokoju "Listen Together" **bez** żadnego serwera, który Kacper musi kupić, hostować albo utrzymywać. Jedyna dopuszczalna zależność zewnętrzna: już istniejąca, publiczna, darmowa infrastruktura którą ktoś inny utrzymuje (dokładnie tak jak BitTorrent DHT albo publiczne STUN Google'a).

## Dlaczego libp2p, nie własny serwer sygnalizacyjny

Żeby dwóch obcych w internecie się połączyło, coś musi im powiedzieć "ten kod pokoju = ten adres IP". Bez własnego serwera jedyna opcja to rozproszona tablica haszująca (DHT) — sieć peer-to-peer, do której się dołącza za darmo, bez rejestracji, bez opłat. `libp2p` (Rust crate, ten sam stos co IPFS/Filecoin/Ethereum/Polkadot) dostarcza to gotowe: DHT (Kademlia), NAT traversal (AutoNAT + DCUtR hole punching), i fallback relay przez publiczne node'y społeczności IPFS — wszystko już działające od ~2015, nic do postawienia.

To NIE jest "zero zależności" — to jest "zero infrastruktury, którą Ty utrzymujesz albo za którą płacisz". Aplikacja będzie korzystać z publicznych bootstrap node'ów IPFS (te same adresy, których używa każdy klient IPFS na świecie).

## Architektura

### Topologia
Gwiazda przez hosta — bez zmian względem wersji LAN. Każdy gość ma jeden tunel do hosta (nie mesh każdy-z-każdym). Host pozostaje jedynym źródłem prawdy dla stanu odtwarzania.

### Nowy moduł: `src-tauri/src/p2p_sync.rs`
Osobny plik, nie mieszamy z `sync_room.rs`. `sync_room.rs` zostaje odpowiedzialny za: generowanie kodu pokoju, model `RoomState`/`RoomMember`/`SyncPlaybackState`, protokół wiadomości (`WireMessage`), logikę dodawania/usuwania członków, `SyncEventSink`. `p2p_sync.rs` dostarcza **alternatywny transport** dla tych samych wiadomości — LAN TCP zostaje, dochodzi libp2p jako drugi transport wybierany w runtime.

Docelowo: `SyncTransport` trait (albo enum) z dwiema implementacjami:
- `LanTransport` (to co już istnieje — UDP beacon + surowy TCP)
- `P2pTransport` (nowy — libp2p swarm + DHT rendezvous + relay/hole-punch)

`join_room`/`create_room` w `sync_room.rs` próbują `LanTransport` z krótkim timeoutem (obecne 4s), a jeśli nic nie znajdą — przełączają się na `P2pTransport` z dłuższym timeoutem (patrz niżej).

### Identyfikacja peera
Przy starcie sesji (create_room / join_room) generowany jest efemeryczny klucz `libp2p::identity::Keypair` (Ed25519) — żyje tylko na czas sesji, nie jest zapisywany na dysk, nie ma kont/rejestracji. `PeerId` wyprowadzony z tego klucza.

### Rendezvous przez DHT
- Klucz DHT: `sha256("ytmd-room-v1:" + room_code)` — namespace prefix `ytmd-room-v1:` żeby nie kolidować z niepowiązaną zawartością w tej samej publicznej DHT i żeby dało się bezpiecznie zmienić format w przyszłości (v2, v3...).
- Host: po wygenerowaniu kodu pokoju robi `kademlia.start_providing(key)` — ogłasza się w DHT jako dostawca dla tego klucza.
- Gość: robi `kademlia.get_providers(key)`, czeka na pierwszy wynik (z timeoutem).
- DHT lookup nie jest natychmiastowy — realistycznie 2-10s w zależności od tego jak szybko lokalny node zdąży się zbootstrapować do sieci. To jest fundamentalnie wolniejsze niż LAN beacon (dlatego LAN zostaje jako pierwsza próba).

### NAT traversal — załatwia biblioteka, nie my
Kompozycja `NetworkBehaviour` w Swarmie:
- `identify` — każdy peer poznaje swój obserwowany publiczny adres.
- `kad` (Kademlia) — DHT do rendezvous, bootstrapowana z twardo wpisanej listy publicznych bootstrap node'ów IPFS.
- `autonat` — wykrycie czy peer jest osiągalny bezpośrednio czy za NAT.
- `dcutr` — hole punching (Direct Connection Upgrade through Relay) do nawiązania bezpośredniego połączenia mimo NAT.
- `relay::client` — fallback: jeśli hole punching się nie uda, ruch leci przez publiczny relay node społeczności IPFS. Nie uruchamiamy własnego relay servera — tylko korzystamy z publicznych.
- Transport: QUIC jako preferowany (ma wbudowane szyfrowanie, szybszy handshake), TCP jako fallback z `noise` (szyfrowanie) + `yamux` (multipleksowanie strumieni) — standardowy libp2p transport stack.
- Nasz protokół wiadomości: własny `StreamProtocol` (np. `/ytmd/sync/1.0.0`) niosący dokładnie te same `WireMessage` (JSON, newline-delimited) co już działają w wersji LAN — zero zmian w logice Join/State/Playback, zmienia się tylko to, czym te bajty lecą.

### Fallback dla ruchu (nie audio — sam stan)
Przez relay leci wyłącznie mały JSON co ~1s (stan odtwarzania: video_id, timestamp, is_playing). Żaden użytkownik nie streamuje dźwięku przez ten tunel — każdy klient i tak ciągnie audio bezpośrednio z YouTube. Publiczny relay o ograniczonej przepustowości to udźwignie bez problemu nawet dla wielu jednoczesnych par.

## Zmiany w kodzie — plik po pliku

| Plik | Zmiana |
|---|---|
| `src-tauri/Cargo.toml` | Nowe zależności (patrz niżej) |
| `src-tauri/src/p2p_sync.rs` | **Nowy plik.** Swarm setup, bootstrap, DHT provide/get_providers, dial, protokół strumienia, most między libp2p a istniejącym `WireMessage` |
| `src-tauri/src/sync_room.rs` | `create_room`/`join_room`: dodać próbę `P2pTransport` jako fallback po nieudanym LAN discovery. `generate_room_code`: zwiększyć entropię (patrz Bezpieczeństwo). Reszta (RoomState, WireMessage, member add/remove, SyncEventSink) bez zmian — reużywane przez oba transporty. |
| `src-tauri/src/lib.rs` | Rejestracja modułu `p2p_sync`, ewentualne dodanie stanu (np. cache zbootstrapowanego swarma, żeby nie robić pełnego DHT bootstrap od zera przy każdym `join_room`) |
| `src-tauri/src/commands.rs` | Bez zmian w sygnaturach — `create_sync_room`/`join_sync_room` zostają `async`, zwracają `Result<RoomState, String>` jak teraz |
| Frontend (`src/plugins/sync-room/index.ts`, `src/ui/sync.ts`) | **Zero zmian.** Kontrakt (nazwy eventów, kształt JSON) zostaje identyczny — to samo co przy wersji LAN. |

## Nowe zależności (`Cargo.toml`)

```
libp2p = { version = "0.5x", features = ["kad", "identify", "autonat", "dcutr", "relay", "noise", "yamux", "tcp", "quic", "tokio", "macros"] }
```
Dokładna wersja i lista feature'ów do zweryfikowania przy starcie implementacji (libp2p aktywnie rozwija się, sprawdzić najnowsze stabilne API — Kademlia/relay/dcutr API zmieniało się między major wersjami).

To znacząco większa zależność niż wszystko inne w projekcie (libp2p to kilkanaście pod-crate'ów) — wpłynie na czas kompilacji i rozmiar binarki. Do zaakceptowania świadomie.

## Bezpieczeństwo — co się zmienia względem wersji LAN

1. **Kod pokoju musi być mocniejszy.** W LAN zasięg = Twoja sieć Wi-Fi, więc 6 znaków (~30 bitów) wystarczało. W internecie DHT jest globalnie odpytywalna, więc zwiększam do np. 10-12 znaków z tego samego alfabetu (bez znaków mylących) — to podnosi brute-force z "trywialne" do "praktycznie niemożliwe" bez zmiany UX (dalej da się podyktować/przepisać).
2. **DHT provider records są z natury publiczne.** Ktoś robiący szeroki crawl Kademlia mógłby w teorii zauważyć że jakiś hash jest aktywnie "provide'owany", ale bez znajomości oryginalnego kodu pokoju (przed haszowaniem) nie ma jak dopasować tego do konkretnego pokoju YTMD ani dołączyć (haszujemy, nie publikujemy plaintextu). Ryzyko: enumeration attack na krótkie kody — zaadresowane przez punkt 1.
3. **Limit żywotności pokoju** (już częściowo mamy — `MAX_MEMBERS` z wersji LAN) zostaje, plus rozważyć TTL na `start_providing` (np. re-provide co kilka minut, żeby stare/opuszczone pokoje naturalnie znikały z DHT zamiast wisieć tam bez końca).
4. Transport libp2p jest szyfrowany end-to-end (noise/QUIC-TLS) z automatu — nic dodatkowego do zrobienia.

## Strategia testowania

- **W pełni automatyzowalne (cargo test, jak w wersji LAN):** logika protokołu wiadomości (`WireMessage` roundtrip — reużyte z `sync_room.rs`), derywacja klucza DHT z kodu pokoju, logika dodawania/usuwania członków. Dwa lokalne swarmy libp2p na `127.0.0.1` (bez realnego NAT) do przetestowania że DHT provide/get_providers + dial + otwarcie strumienia + wymiana Join/State faktycznie działa end-to-end w kontrolowanym środowisku.
- **Niemożliwe do automatyzacji w tym środowisku (sandbox/CI):** realny hole punching między dwoma różnymi sieciami za różnymi NAT-ami. To wymaga ręcznej weryfikacji na dwóch fizycznych urządzeniach w dwóch różnych sieciach (np. Twój laptop na Wi-Fi domowym + telefon w hotspocie komórkowym, albo faktycznie dwóch znajomych w różnych miastach). Będę o tym jawnie informował zamiast twierdzić że "działa" bez takiego testu — zgodnie z zasadą że testy jednostkowe nie są dowodem poprawności funkcjonalnej w realnych warunkach sieciowych.

## Kolejność prób przy `join_room` (finalny flow)

1. LAN UDP beacon, timeout ~4s (już zaimplementowane, bez zmian).
2. Jeśli brak wyniku → start libp2p swarm, bootstrap do publicznej DHT, `get_providers(hash(kod))`, timeout ~15-20s (DHT + ewentualny hole punching/relay potrzebują więcej czasu niż LAN).
3. Jeśli i to zawiedzie → czytelny błąd dla użytkownika: "Nie znaleziono pokoju — sprawdź kod, upewnij się że host ma otwarty pokój, i że oboje macie połączenie z internetem."

Host analogicznie: startuje LAN beacon (jak teraz) ORAZ równolegle ogłasza się w DHT (`start_providing`) — obie ścieżki aktywne jednocześnie, więc gość w tej samej sieci łączy się błyskawicznie przez LAN, a gość w innym mieście — przez DHT, bez żadnej dodatkowej decyzji ze strony hosta.

## Szacunek złożoności / etapy pracy

1. **Setup swarma + bootstrap do publicznej DHT** — dodanie `libp2p`, skonfigurowanie transportu (QUIC+TCP/noise/yamux), lista bootstrap node'ów, weryfikacja że lokalny node w ogóle dołącza do sieci.
2. **DHT rendezvous** — `start_providing`/`get_providers` po hashu kodu pokoju, testy na dwóch lokalnych swarmach.
3. **Własny protokół strumienia** — `/ytmd/sync/1.0.0`, przepięcie istniejących `WireMessage` na ten transport zamiast surowego TCP.
4. **NAT traversal** — `identify` + `autonat` + `dcutr` + `relay::client`, weryfikacja że dial przez libp2p Swarm automatycznie próbuje hole punch i spada do relay.
5. **Integracja z `sync_room.rs`** — fallback LAN→internet, ujednolicenie `SyncEventSink`, aktualizacja `generate_room_code`.
6. **Testy + ręczna weryfikacja cross-NAT** — automatyczne testy lokalne + realny test na dwóch różnych sieciach.

To wielosesyjna robota (znacznie większa niż wersja LAN, która była jednym zamkniętym blokiem) — realistycznie każdy z powyższych punktów to osobna iteracja z własną weryfikacją, nie jedno posiedzenie.

## Otwarte ryzyka (jawnie, bez podkoloryzowywania)

- Zależność od dostępności publicznych bootstrap/relay node'ów IPFS — poza kontrolą Kacpra, ale to infrastruktura działająca stabilnie od lat dla całego ekosystemu IPFS, nie jednorazowy eksperyment.
- Czas dołączenia do pokoju przez internet: sekundy do kilkunastu sekund, nie "natychmiast" jak w LAN — trzeba to dobrze zakomunikować w UI (loading state, nie cichy hang).
- `libp2p`'s API zmienia się między wersjami — trzeba dopasować dokładne wersje/feature flagi w momencie startu implementacji, nie polegać na przykładach z dokumentacji które mogą być nieaktualne.
- Nie każda para NAT-ów się połączy nawet z relay fallbackiem (skrajne przypadki firewalli korporacyjnych blokujących cały ruch UDP/QUIC wychodzący) — to akceptowalne ograniczenie, nie coś do naprawienia.

## Status

Czeka na akceptację przed startem implementacji punktu 1 (setup swarma).
