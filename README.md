# Alterbake — Platforma Szkoleniowa

Standalone web app do ewaluacji wiedzy pracowników piekarni/cukierni Alterbake:
profile, quizy, pomiar postępu, widok „mój poziom wiedzy" per pracownik, oraz
eksport do formatu Panelu Piekarni M5.

Cel nadrzędny (M5): **uczynić kryterium awansu Junior → Samodzielny obiektywnym
i delegowalnym**, żeby Mentor mógł oceniać bez właściciela. Platforma nie tworzy
wiedzy — mierzy jej opanowanie na bazie „Złotego Standardu Piekarstwa".

Kontekst i decyzje: `docs/AI_BATON.md`, wymóg: `docs/spec.md`, model danych: `docs/schema.md`.

---

## Uruchomienie

```bash
npm install
npm run dev        # tryb deweloperski (http://localhost:5173)
npm run build      # produkcja → folder dist/
npm run preview    # podgląd builda
npm test           # testy logiki pomiaru (w tym reguła CCP)
```

Deploy w piekarni = zbuduj (`npm run build`) i skopiuj folder `dist/` na
stanowisko. `base: './'` w `vite.config.js` sprawia, że `dist/index.html`
działa też otwarty wprost z dysku.

---

## Reguła CCP — nienaruszalna (przeczytaj przed zmianą logiki)

Pytania `ccp: true` to bezpieczeństwo żywności (CCP1 ≥92°C rdzeń pieczywa,
CCP5 ≥85°C/1 min krem). W tej aplikacji:

- Próg CCP = **100%** (nie 80% jak reszta) i jest **zablokowany** w UI — nie da się
  go obniżyć w Konfiguracji.
- CCP **nie uśrednia się** z wynikiem ogólnym. Procent tomu i poziom ogólny liczą
  **wyłącznie** pytania `ccp:false`. Pracownik może mieć 100% ogólnie, a status
  bezpieczeństwa = `BRAK` — i wtedy nie może zostać uznany za „Samodzielnego".
- Status CCP jest pokazywany **osobno, na czerwono** — nigdy schowany w średniej.

Cała ta logika żyje w `src/logic/progress.js` i jest zablokowana testami
w `src/logic/progress.test.js` (uruchom `npm test`). To była pierwsza
zaimplementowana logika biznesowa — reszta się do niej dopasowuje.

---

## Architektura i stack (uzasadnienie — wymagane przez spec §8)

| Wybór | Uzasadnienie |
|---|---|
| **React + Vite** | Sugerowany w spec §8. Szybki build, zero konfiguracji, statyczny `dist/`. |
| **Trwałość: `localStorage`** (nie IndexedDB/SQLite) | Dane pilota liczone w kilobajtach (16 pytań, garść pracowników, log wyników), jedno stanowisko. `localStorage` daje trwałość między sesjami przy zerze zależności i zerze setupu serwera. Migracja do IndexedDB/SQLite jest prosta, gdy wolumen urośnie — cała warstwa danych jest odseparowana w `src/logic/store.js`. |
| **Logika jako czyste funkcje** (`src/logic/`) | Pomiar (CCP, progi, awans, eksport) nie zależy od Reacta — testowalny w izolacji, przenośny do przyszłej integracji z Panelem. |
| **Bank pytań z pliku, nie z kodu** | `data/bank_pytan_seed.json` (przy `index.html`) ma pierwszeństwo; kopia wbudowana w build to fallback dla otwarcia z `file://`. Właściciel może wgrać nowszy bank w Konfiguracji — **bez zmiany kodu**. |

### Warstwy

```
src/logic/progress.js   ← rdzeń: CCP, opanowanie tomu/poziomu, awans, „następny krok"
src/logic/export.js     ← eksport do formatu Panelu M5 (schema.md)
src/logic/store.js      ← trwałość (localStorage), walidacja banku, dane przykładowe
src/components/         ← UI: ProfilePicker, EmployeeDashboard, Quiz, TeamView, ReviewQueue, OwnerPanel
data/bank_pytan_seed.json ← 16 pytań pilota (II Zakwas, IV Wypiek, V DDT)
```

---

## Role i ekrany

- **Pracownik** — wybiera profil (opcjonalny PIN), widzi „Mój poziom" (paski % per tom,
  ogólny %, status CCP osobno, status względem **poziomu docelowego**, następny krok),
  rozwiązuje quizy i dostaje **przegląd odpowiedzi** (co poszło źle + poprawna odpowiedź).
- **Mentor** (rola pracownika = `Mentor`) — dodatkowo „Zespół" i kolejka „Do oceny".
- **Właściciel (Piotr)** — wszystko + „Konfiguracja i eksport": progi, pracownicy,
  wgrywanie banku, eksport do Panelu M5.

### Kryterium zależne od roli (poziom docelowy)

Awans nie jest jeden dla wszystkich — zależy od `poziom_docelowy` pracownika (schema, Aneks XIV):
**Pomocnik → JUNIOR** (rola stała), **Piekarz → SAMODZIELNY**, itd. Gotowość liczona jest
względem poziomów *do celu* (JUNIOR wymaga tylko poziomu JUNIOR; SAMODZIELNY wymaga JUNIOR+SAMODZIELNY)
+ komplet CCP. Dzięki temu Pomocnik, który osiągnął swój cel, widnieje jako „✓ JUNIOR", a nie
wiecznie „jeszcze nie Samodzielny". To jest sedno M5: obiektywne, delegowalne kryterium **per rola**.

## Typy pytań i ocena (spec §3)

- `jednokrotny` / `wielokrotny` **z polem `opcje[]`** → auto-ocena (komplet trafień = zaliczone).
- `jednokrotny` / `wielokrotny` **bez `opcje[]`** (stan pilota) → odpowiedź tekstowa → kolejka Mentora.
- `otwarty` → tekst → ocena ręczna Mentora (porównanie z wzorcem).
- `praktyczny` → demonstracja na stanowisku → Mentor zaznacza zaliczył/nie.

Aplikacja **nie zamyka automatem** pytań otwartych/praktycznych — kolejkuje je „Do oceny".

## Eksport do Panelu M5 (spec §7)

Konfiguracja → „Eksportuj dla Panelu M5 (JSON)" → jeden plik ze strukturą z `schema.md`
(profile + postęp per tom + `ccp_status` osobno). Dodatkowo per pracownik: `poziom_docelowy`,
`cel_osiagniety` (gotowość względem celu) i `ccp_ogolem` — Panel od razu wie, kto spełnia
kryteria. To eksport pliku, **nie** integracja live — Panel nie ma jeszcze buildu.

---

## Warianty odpowiedzi — zrobione (decyzja Piotra: „unikaj otwartych pytań")

Bank `bank_pytan_seed.json` (wersja `2026-07-09`) — **wszystkie 16 pytań auto-ocenianych**
(`jednokrotny` + `opcje[]`/`poprawne[]`), **zero pytań otwartych i zero praktycznych**:

- Pytania `otwarty` zamienione na `jednokrotny` z wariantami (w tym oba CCP: W-01 → ≥92°C, W-02).
- Pytania `praktyczny` (Z-03, D-02, W-05) zamienione na **pytania sytuacyjne „co robisz?"** —
  konkretna sytuacja przy stanowisku + warianty działania (np. Z-03: odświeżasz zakwas bez wagi,
  w pośpiechu; W-05: górne poziomy Bongarda ciemniejsze niż dolne).
- **Poprawne odpowiedzi wynikają 1:1 z pola `wzorzec`** (treść już zwalidowana). Dorobione są
  wyłącznie sytuacja i warianty błędne (dystraktory); `wzorzec` został jako referencja/wyjaśnienie.
- Pozycja poprawnej odpowiedzi jest różna w różnych pytaniach (nie zawsze pierwsza).

Format (obsługiwany przez `src/components/Quiz.jsx`):
```json
{ "id": "W-01", "typ": "jednokrotny",
  "opcje": ["≥ 75°C", "≥ 85°C", "≥ 92°C", "≥ 100°C"], "poprawne": [2] }
```
`opcje` = warianty; `poprawne` = indeksy (0-based) poprawnych (dla `wielokrotny` > 1).

### ⚠️ Do decyzji Piotra (zebrane, nie zgadywane — AI_BATON §8)

1. **Zweryfikuj dystraktory.** Poprawne odpowiedzi pochodzą z `wzorzec`, ale warianty błędne
   napisałem ja — proszę o rzut okiem technologa, czy któryś dystraktor nie jest przypadkiem
   „też trochę prawdziwy". Lista poprawnych do przeglądu: uruchom `npm test` lub zobacz
   `bank_pytan_seed.json`. Po akceptacji warto wpisać `opcje`/`poprawne` do master-xlsx
   i re-eksportować, żeby xlsx pozostał źródłem prawdy.

2. **Pytania praktyczne — zamienione na sytuacyjne** (decyzja Piotra). Z-03, D-02 i W-05 to teraz
   pytania „w tej sytuacji — co robisz?" z wariantami działania. Poprawne działanie wynika z `wzorzec`.
   Jeśli chcesz zamiast tego (albo dodatkowo) sprawdzać realną demonstrację przy stanowisku,
   typ `praktyczny` nadal jest obsługiwany przez aplikację i można go przywrócić dla wybranych pytań.

3. **PIN.** Zaimplementowany jako opcjonalny 4-cyfrowy per profil, przechowywany lokalnie
   jawnie (piekarnia, nie bank). Jeśli potrzebna większa ochrona — do ustalenia.

## Status pilota

3 tomy (II Zakwas, IV Wypiek, V DDT), 16 pytań. Skalowanie na pozostałe tomy —
**po walidacji pilota przez Piotra**. Integracja live z Panelem — osobny projekt
(Alterbake IoT), gdy Panel ma build.
