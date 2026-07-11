# Backend (Supabase) — plan i szkielet

## Dlaczego

Pracownicy uczą się **w domu, na własnych urządzeniach**. W trybie localStorage każdy zapisuje
wyniki tylko u siebie — właściciel nigdy ich nie zobaczy. Wspólny obraz postępu (cel M5) wymaga
**wspólnej bazy**. Wybór: **Supabase** (PostgreSQL + logowanie + RLS + realtime, region UE, darmowy
plan na ten wolumen, hosting aplikacji zostaje na GitHub Pages).

## Zasada: przełącznik, nie przepisanie

Aplikacja działa dalej na localStorage. Backend to **osobna warstwa za flagą**:

- brak zmiennych `VITE_SUPABASE_*` → tryb lokalny (jak dziś, build na Pages bez zmian),
- ustawione zmienne → tryb wspólnej bazy.

Cała logika (`progress.js`, reguła CCP, egzamin, oś praktyczna) zostaje **bez zmiany** — podmieniamy
tylko warstwę zapisu. Logi są append-only, więc dane z wielu urządzeń **sumują się** bez konfliktów
(regułę „ostatni po dacie wygrywa" liczy już `progress.js`).

## Co jest w repo (szkielet — gotowe)

| Plik | Rola |
|---|---|
| `supabase/schema.sql` | Tabele 1:1 ze stanem + funkcje ról + polityki **RLS** (kto co widzi/pisze) |
| `src/logic/supabase/klient.js` | Klient Supabase za flagą `backendWlaczony()` |
| `src/logic/supabase/auth.js` | Logowanie **magic link** (bez haseł) + profil (rola/id_prac/uprawnienia) |
| `src/logic/supabase/stanZdalny.js` | Odczyt całego stanu + akcje dopisujące (logi) + zapis ustawień |
| `.env.example` | Wzór konfiguracji (skopiuj do `.env`) |

## Twoje kroki (jednorazowo, ~15 min)

1. Załóż projekt na **supabase.com**, region **Frankfurt (EU)**.
2. SQL Editor → wklej i uruchom **`supabase/schema.sql`**.
3. Authentication → włącz **Email (magic link)**.
4. Project Settings → API → skopiuj **Project URL** i **anon public key**.
5. W repo: skopiuj `.env.example` do `.env`, wklej URL i anon key.
6. Dodaj swój profil właściciela (SQL Editor), gdy już się zalogujesz e-mailem:
   ```sql
   -- po pierwszym logowaniu (magic link) znajdź swój user_id w Authentication → Users
   insert into profile (user_id, id_prac, rola, is_owner)
   values ('<twoj-user-id>', 'WLASCICIEL', 'Właściciel', true);
   ```
7. Migracja dotychczasowych danych: w panelu zrób **kopię zapasową** (JSON), potem wgraj ją do
   tabel — kształt kopii jest 1:1 z tabelami (skrypt importu dołożę przy podłączaniu).

## Co zostaje do zrobienia (podłączenie + test na żywo)

Szkielet nie jest jeszcze wpięty w `App.jsx`, żeby nie ruszać działającej aplikacji przed testem
na realnej bazie. Ostatni etap (robię go, gdy masz już projekt Supabase):

1. **Bootstrap async**: przy starcie, jeśli `backendWlaczony()`, `App` czeka na `wczytajStanZdalnie()`
   zamiast `wczytajStan()` (localStorage). Ekran ładowania na czas pobrania.
2. **Logowanie zamiast wyboru profilu**: w trybie backendu `ProfilePicker` → magic link; sesję i rolę
   bierzemy z `mojProfil()` zamiast lokalnego wyboru.
3. **Akcje piszą do bazy**: `dodajWynik`, `oznaczPrzerobiony`, `potwierdzPraktyke`, `przypiszTom`,
   `zatwierdzTom`, zapis konfig/pracowników — wołają funkcje z `stanZdalny.js` (i aktualizują stan lokalny).
4. **Offline-first (piekarnia/dom z kiepskim wifi)**: „outbox" — wpis ląduje najpierw lokalnie,
   dosyła się po odzyskaniu sieci. Append-only sprawia, że kolejność nie ma znaczenia.
5. **Realtime (opcjonalnie)**: `naZmianeDanych()` odświeża widok „Zespół" na żywo.
6. **Test end-to-end na żywej bazie** + przełączenie flagi w produkcji.

## Bezpieczeństwo i RODO

- **Anon key** jest bezpieczny we froncie — dostępu pilnuje **RLS** (pracownik widzi tylko siebie,
  właściciel/mentor cały zespół). Klucza `service_role` **nigdy** nie umieszczamy we froncie.
- Dane pracownicze to **dane osobowe** — projekt w **regionie UE**, minimalny zakres, krótka nota
  o przetwarzaniu w regulaminie pracy.
- `.env` jest w `.gitignore` — sekrety nie trafiają do repo.

## Szacunek pracy (podłączenie)

~1 tydzień skupionej pracy na solidny MVP (auth + warstwa zapisu + offline + migracja + testy);
wariant bez offline/realtime ~2–3 dni. Koszt hostingu: 0 zł (Pages + darmowy plan Supabase).
