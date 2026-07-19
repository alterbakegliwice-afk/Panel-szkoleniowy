# SPEC: Aplikacja Pracownika Alterbake — integracja zadań, planu produkcji i szkoleń

> Ustrukturyzowany prompt wykonawczy (Fable 5) na bazie strumienia pomysłów Właściciela, 2026-07-13.
> Kontynuacja projektu „Work profile and training panel integration" (PR #2/#3 Panel-szkoleniowy, PR #2 alterbake-work-profile).

## 1. Prompt wykonawczy (wersja kanoniczna)

**Rola:** Jesteś inżynierem prowadzącym ekosystem aplikacji Alterbake (Panel Szkoleniowy,
Profil Pracy, Planer Produkcji, AI Command Center). Wszystkie aplikacje są statyczne,
publikowane na GitHub Pages pod wspólnym originem `alterbakegliwice-afk.github.io`,
dane trzymają w `localStorage` (piekarnia, nie chmura).

**Cel:** Rozszerz ekosystem o **wersję aplikacji dla każdego pracownika**:

1. **Profile pracowników zakłada wyłącznie Właściciel** (istniejący panel Konfiguracja
   w Panelu Szkoleniowym; profil = imię, rola, PIN, poziom docelowy).
2. Pracownik po zalogowaniu (wybór profilu + PIN) widzi **do jakich zadań jest dziś
   przydzielony** i **jak wygląda plan produkcji** (dane z Planera Produkcji).
3. **Uprawnienia edycji:** harmonogram i delegowanie zadań może modyfikować wyłącznie
   Właściciel oraz **wyznaczeni kierownicy** (cukiernia / piekarnia — nadaje Właściciel).
   Pozostali pracownicy mają wgląd bez edycji; mogą jedynie odhaczać status **własnych** zadań.
4. Aplikacja pracownika **łączy moduły szkoleniowe i Work Profile**: plan produkcji,
   zadania dnia, nauka + quizy + ewaluacje, testy charakteru — w jednym miejscu.
5. Pracownik może **zgłaszać potrzeby i uwagi** (append-only log, obsługiwany przez
   Właściciela/kierowników).
6. **AI Command Center (ai-dashboard)** dostaje moduł ZESPÓŁ: rejestr profili, przydziały
   dnia i skrzynkę zgłoszeń.
7. **NotebookLM (notebooklm-py)** służy do generowania treści szkoleniowych (bank pytań,
   materiały) z **kompendium złotych standardów** (`plan-produkcji-cukiernia/docs/standardy/`
   + `docs/baza-wiedzy/`).
8. **grill-me-codex** stosuj jako proces jakości: plan → adwersaryjny przegląd Codex →
   implementacja → przegląd diffu drugim modelem (gdy CLI Codex dostępne).

**Ograniczenia twarde:**
- Zero backendu, zero OAuth; kontrakty danych przez wspólny origin `localStorage`.
- Nie łamać istniejących danych: nowe pola są opcjonalne, stare klucze migrowane łagodnie.
- Bez rejestru pracowników (samodzielne użycie planera) wszystko działa jak dotąd.
- PIN to ochrona przed wejściem „przez ramię", nie kryptografia — jak dotychczas w Panelu.
- Język UI i kodu: polski (konwencje repozytoriów).

## 2. Architektura integracji

```
                    wspólny origin: alterbakegliwice-afk.github.io
┌─────────────────────────────────────────────────────────────────────┐
│ localStorage                                                        │
│                                                                     │
│  alterbake-platforma-v1  ← Panel Szkoleniowy (źródło prawdy o       │
│        │                    pracownikach: profile, PIN, kierownicy) │
│        ▼ lustro przy każdym zapisie                                 │
│  alterbake_zespol_v1     ← REJESTR (tylko-odczyt dla konsumentów)   │
│  alterbake_zgloszenia_v1 ← ZGŁOSZENIA (pisze Panel, zarządza        │
│                             Panel-Właściciel i AI Dashboard)        │
│  alterbake_planer_v2     ← Planer (plan + zadania; Panel czyta      │
│                             tylko-odczyt do widoku „Mój dzień")     │
└─────────────────────────────────────────────────────────────────────┘
   Panel Szkoleniowy          Planer Produkcji         AI Dashboard
   (aplikacja pracownika)     (logowanie + gating      (moduł ZESPÓŁ:
   Mój dzień · Rozwój ·        edycji wg rejestru;      rejestr, przydziały,
   Nauka · Zgłoszenia          zespół ↔ id_prac)        zgłoszenia)
```

### 2.1 Klucz `alterbake_zespol_v1` (rejestr — pisze wyłącznie Panel Szkoleniowy)

```json
{
  "wersja": 1,
  "zaktualizowano": "2026-07-13T09:00:00.000Z",
  "wlasciciel": { "imie": "Piotr", "pin": "" },
  "pracownicy": [
    { "id_prac": "P-01", "imie": "Weronika", "rola": "Piekarz",
      "pin": "1234", "kierownik": ["piekarnia"] }
  ]
}
```

- `kierownik`: lista modułów planera (`"cukiernia"`, `"piekarnia"`), których harmonogram
  dana osoba może edytować. Nadaje/odbiera Właściciel w Konfiguracji.
- `wlasciciel.pin`: opcjonalny PIN wejścia właścicielskiego (Konfiguracja); pusty = bez PIN.

### 2.2 Klucz `alterbake_zgloszenia_v1` (log append-only)

```json
{ "wersja": 1, "zgloszenia": [
  { "id": "zg-…", "id_prac": "P-01", "imie": "Weronika", "typ": "potrzeba",
    "tresc": "…", "data": "ISO", "status": "nowe", "odpowiedz": "" } ] }
```

`typ`: `potrzeba` | `uwaga` | `awaria`. `status`: `nowe` → `przyjete` → `zamkniete`
(status i odpowiedź zmienia Właściciel/kierownik; treść wpisu nigdy nie jest edytowana).

### 2.3 Powiązanie zespołu planera z rejestrem

Wpis zespołu w planerze (`ustawienia.zespol[]`) dostaje opcjonalne pole `id_prac`.
Mapowanie ustawia Właściciel/kierownik w Ustawieniach planera. Widok „Mój dzień"
w Panelu pokazuje zadania i bloki planu, których `osoba` wskazuje wpis zespołu
z `id_prac` zalogowanego pracownika.

### 2.4 Uprawnienia w planerze

- Rejestr **nieobecny** → tryb legacy: pełny dostęp (kompatybilność wstecz).
- Rejestr obecny → ekran wyboru profilu (sessionStorage `alterbake_planer_sesja`):
  - **Właściciel** i **kierownik aktywnego modułu**: pełna edycja.
  - **Pozostali**: tylko odczyt + odhaczanie statusu wyłącznie własnych zadań;
    ukryte akcje dodawania/przenoszenia/usuwania, edycji planu i ustawień zespołu.

## 3. Podział prac na repozytoria

| Repo | Zakres |
|---|---|
| `Panel-szkoleniowy` | rejestr-lustro, PIN właściciela, uprawnienia kierowników (Konfiguracja), zakładki „Mój dzień" i „Zgłoszenia", narzędzie NotebookLM (`tools/notebooklm/`) |
| `plan-produkcji-cukiernia` | logowanie z rejestru, gating edycji, mapowanie zespół↔`id_prac` |
| `alterbake-ai-dashboard` | moduł ZESPÓŁ (rejestr, przydziały dnia, zgłoszenia) |
| `alterbake-work-profile` | bez zmian kodu — integracja z Panelem już działa (zakładka Rozwój) |
| `notebooklm-py` | bez zmian — używany jako biblioteka/CLI przez `tools/notebooklm/` |
| `grill-me-codex` | bez zmian — proces przeglądu planu/diffu (wymaga CLI Codex) |

## 4. Fazy wdrożenia

1. **Kontrakt danych** — moduł integracyjny w Panelu (lustro rejestru, zgłoszenia,
   odczyt planera) + testy jednostkowe.
2. **Aplikacja pracownika** — „Mój dzień" + „Zgłoszenia" w Panelu; PIN właściciela;
   pole `kierownik` w Konfiguracji.
3. **Planer** — sesja, gating edycji, mapowanie `id_prac`.
4. **AI Command Center** — moduł ZESPÓŁ.
5. **Treści** — `tools/notebooklm/generuj_tresci.py`: złote standardy → notatnik
   NotebookLM → bank pytań JSON (format `walidujBank`) + materiały nauki.
6. **Jakość** — testy `vitest`, e2e Playwright tam gdzie są; przegląd grill-me-codex
   przy dostępnym CLI Codex; push na `claude/employee-app-tasks-training-pqsw3n`.

## 4a. Panel Techniczny (rozszerzenie 2026-07-14)

Zakładka **Technika** w Panelu (pracownik i Właściciel): park maszynowy na
poziomie praktycznym — czytanie zachowania maszyny, diagnoza „co ją boli",
granica samodzielnej naprawy vs serwis, ulepszenia.

- Dane: `src/data/modul_techniczny.json` — 8 maszyn (piec trzonowy IBIS,
  piec konwekcyjny Bongard, chłodnia Asber, Tradilevain 40L, miesiarka
  spiralna, garownia, sonda Testo 106, wałkownica). Każda maszyna:
  `nauka` (jak działa — format `Learning`), `diagnostyka[]`
  (objaw → odczyt → przyczyny → działania → kiedy serwis, ryzyko:
  jakość/awaria/bezpieczeństwo), `konserwacja[]` (co/kiedy/kto),
  `pytania[]` (format `walidujBank`; pytania CCP1/CCP4 z `ccp: true`).
- Logika: `src/logic/technika.js` — postęp per maszyna (reguły tomów)
  + wyszukiwarka objawów `szukajObjawow()` (dopasowanie per słowo,
  bez diakrytyki — „blady spod" znajduje „Blady spód").
- Zasada: nauka → quiz (jak tomy), ale **diagnostyka dostępna zawsze** —
  objaw na hali nie czeka na zaliczenie quizu.
- Wyniki quizów logują się do wspólnego `WYNIKI` (append-only), więc
  Właściciel widzi postęp techniczny zespołu tak samo jak merytoryczny
  (tabela „Technika — znajomość parku maszynowego" w widoku Zespół).
- Widok diagnostyki maszyny ma wersję do druku (`@media print`) — karta
  wisi przy maszynie na hali; oraz opcjonalną sekcję `dokumentacja[]`
  (linki do DTR/kart producenta: `{tytul, url, typ, uwaga}`).

## 4b. Moduł Sprzątanie (rozszerzenie 2026-07-14)

Zakładka **Sprzątanie** — higiena produkcji „skutecznie i wydajnie",
zbudowana analogicznie do Panelu Technicznego i na tym samym silniku:

- Wspólny silnik: `src/logic/panelPraktyczny.js` (wyszukiwarka
  objawów/problemów, postęp per pozycja) + `src/components/PanelPraktyczny.jsx`
  (siatka pozycji, karty diagnostyczne, rytm, druk, quiz). Technika
  i Sprzątanie to cienkie wrappery z etykietami domeny.
- Dane: `src/data/modul_sprzatanie.json` — 8 stref (metoda i chemia
  z kołem Sinnera, stanowisko/clean-as-you-go + alergeny, strefa pieców
  i okap, chłodnie i magazyn/FIFO, strefy wilgotne, drobny sprzęt,
  posadzki i odpływy, odpady i szkodniki). Każda strefa: nauka, karty
  problemów (objaw → odczyt → przyczyny → działania → granica serwisu),
  rytm sprzątania (co/kiedy/kto), pytania (format `walidujBank`;
  pytanie CCP4 o mycie chłodni z `ccp: true`).
- Widok Zespół Właściciela: tabela „Sprzątanie — higiena skuteczna
  i wydajna" (postęp per pracownik × strefa), obok tabeli Techniki
  (wspólny komponent `TabelaPraktyczna`).

## 4c. Pytania do Mistrza (rozszerzenie 2026-07-14) — warstwa TEORETYCZNA

Cel: przygotować pracownika do pracy **teoretycznie** — pełny Panel do
pogłębiania wiedzy, w tym możliwość zadania pytania przy dowolnym materiale.
Świadomie **bez** warstwy praktycznej (weryfikacja na stanowisku, ocena
wykonania) — to zakres przyszły.

- `src/logic/pytaniaMistrza.js` — `noweZapytanie()`/`filtrujPytania()`
  (log append-only w `stan.pytania`, ten sam localStorage co WYNIK/NAUKA/
  KOLEJKA — sprawa wewnętrzna Panelu, nie kontrakt originu jak zgłoszenia).
  Kształt wpisu: `{id, id_prac, imie, tom, tresc, data, status: 'nowe'|
  'odpowiedziane', odpowiedz, dodacDoMaterialu}`. `tom: ''` = pytanie ogólne.
- `Learning.jsx` (uniwersalny ekran nauki — tomy banku, Technika, Sprzątanie,
  moduł Przedsiębiorcy, Rozwój) ma opcjonalny prop `onZadajPytanie(tresc)`:
  mini-formularz pod materiałem, rodzic już wie kim jest uczący się i jaki
  to tom. Pytanie dostępne też przy materiale „w przygotowaniu".
- `PytaniaMistrza.jsx` — nowa zakładka „Pytania” (pracownik: formularz +
  własne pytania z odpowiedziami) / „Pytania do Mistrza” (tylko Właściciel,
  jak w Zgłoszeniach — Mentor nie ma skrzynki): filtr nowe/odpowiedziane,
  odpowiedź + checkbox „📌 do rozszerzenia materiału”.
- **Znacznik `dodacDoMaterialu` to tylko flaga kandydata** — samo dopisanie
  nowej karty do `materialy_nauka.json` danego tomu jest krokiem **ręcznym**
  (albo przez pipeline `tools/notebooklm/`, gdy będzie źródło do wgrania).
  To jest właśnie „praktyka”, którą świadomie odłożono na później.

## 5. Poza zakresem (świadomie)

- Synchronizacja między urządzeniami (dane żyją per przeglądarka; transfer = kopia JSON).
- Hasła/hash PIN, sesje serwerowe, RODO-grade audyt — skala mikropiekarni.
- Automatyczne wywołania NotebookLM w CI (wymagają zalogowanej sesji Google).
