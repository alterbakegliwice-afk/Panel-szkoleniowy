# Runbook: jak dodać / zmienić treść (tom, karty, pytania)

> Cel: żeby dodawanie wiedzy do panelu NIE zależało od jednej osoby. Ten runbook pozwala
> Mentorowi/technologowi rozbudowywać materiał bez właściciela — przy zachowaniu zasad bezpieczeństwa.

## Zasada nadrzędna

**Nie zmyślamy merytoryki.** Treść pochodzi z dokumentów „Złotego Standardu" (Dysk). Poprawne
odpowiedzi są **1:1 z dokumentu / wzorca** — autorskie są **wyłącznie dystraktory** (błędne warianty).
Każdy nowy tom powstaje jako **draft `do_akceptacji`** i jest niewidoczny dla zespołu do zatwierdzenia.

## Gdzie żyje treść

- `src/data/drafty_tomow.json` — drafty tomów (nauka + pytania), pogrupowane w bloki.
- `src/data/materialy_nauka.json` — materiał zwalidowanego pilota (II Zakwas, IV Wypiek, V DDT).
- `src/data/bank_pytan_seed.json` — bank pytań pilota (w tym pytania CCP).

## Krok po kroku: nowy tom (draft)

1. Otwórz `drafty_tomow.json`. Dodaj obiekt do `tomy[]`:
   ```json
   {
     "tom": "XX Nazwa tomu",
     "obszar": "krótki opis",
     "blok": "fundament | lancuch | asortyment | cukiernictwo",
     "status": "do_akceptacji",
     "nauka": { "intro": "…", "karty": [ { "tytul": "…", "punkty": ["…"], "zrodlo": "Złoty Standard …" } ] },
     "pytania": [ … ]
   }
   ```
2. **Pytania** — każde:
   - `poziom`: `JUNIOR` | `SAMODZIELNY` | `MENTOR`. Zadbaj, by tom miał **min. 1 pytanie każdego poziomu**.
   - `typ`: `jednokrotny` (auto-ocena) — z polem `opcje[]` i `poprawne[]` (indeks od 0).
   - `ccp`: **zawsze `false`** w draftach (patrz niżej).
   - `pytanie`, `wzorzec` (uzasadnienie z dokumentu), `zrodlo` (dokładna sekcja).
   - Poprawna odpowiedź = cytat/parafraza z dokumentu; dystraktory prawdopodobne, ale jednoznacznie błędne.
3. Polskie cudzysłowy w JSON: używaj `„ …”` (U+201E / U+201D) **wewnątrz** tekstu; prosty `"` tylko
   jako ogranicznik JSON — inaczej łańcuch się urwie.
4. Uruchom `npm test` — walidator sprawdza klucz odpowiedzi i pokrycie poziomów; potem `npm run build`.

## ⚠️ Pytania CCP — NIE dodajemy w kodzie

Nowych pytań **CCP (bezpieczeństwo żywności)** nie tworzymy w draftach. Ewaluacja punktów krytycznych
pozostaje w **zwalidowanym pilocie** (IV Wypiek). Powód: błędny klucz w pytaniu CCP = ciche
mis-ocenianie bezpieczeństwa. Zmiany w CCP wymagają technologa i osobnej walidacji.

## Aktywacja (akceptacja)

Draft jest niewidoczny dla zespołu. Osoba z prawem akceptacji (Właściciel; docelowo też technolog/Mentor):

1. Wchodzi w panel → zakładka **„Do akceptacji"**.
2. Czyta materiał i pytania (rozkład poziomów widać przy każdym tomie).
3. Klika **„Zatwierdź i aktywuj"** — potwierdza zgodność z dokumentem technologa.
   Od tej chwili tom trafia do nauki i egzaminów zespołu. „Cofnij aktywację" wyłącza go z powrotem.

## Wersjonowanie

Pole `wersja` w `drafty_tomow.json` znaczy datę rewizji treści. Przy istotnej zmianie standardu
podnieś wersję i rozważ ponowny egzamin osób, które zdały starą wersję (dotyczy zwłaszcza CCP).
