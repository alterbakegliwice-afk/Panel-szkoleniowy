# SCHEMA — Model danych Platformy Szkoleniowej Alterbake

Wersja: 2026-07-06 · Spójny z Alterbake_Platforma_Szkoleniowa_v2026-07-06.xlsx

---

## Encja: PYTANIE (bank_pytan_seed.json — źródło, read-mostly)

| Pole | Typ | Opis |
|---|---|---|
| id | string | Unikalny, prefiks per tom (Z- zakwas, W- wypiek, D- DDT). Rośnie. |
| tom | string | "II Zakwas" / "IV Wypiek" / "V DDT" (rozszerzalne) |
| poziom | enum | JUNIOR / SAMODZIELNY / MENTOR |
| typ | enum | jednokrotny / wielokrotny / otwarty / praktyczny |
| ccp | bool | true = pytanie bezpieczeństwa, próg 100%, osobna ścieżka |
| pytanie | string | Treść |
| wzorzec | string | Odpowiedź wzorcowa (dla auto-oceny jednokrotny/wielokrotny + referencja dla Mentora przy otwartych) |
| zrodlo | string | Tom/sekcja — do odesłania przy nauce |

Uwaga do typów auto-ocenianych: dla `jednokrotny`/`wielokrotny` docelowo dodać pole `opcje[]` i `poprawne[]` — pilot ma wzorzec tekstowy, Claude Code rozszerza strukturę o opcje przy implementacji quizu (zgłoś Piotrowi propozycję formatu opcji przed masowym uzupełnianiem).

## Encja: PRACOWNIK

| Pole | Typ | Opis |
|---|---|---|
| id_prac | string | P-01, P-02... |
| imie | string | |
| rola | enum | Piekarz / Pomocnik / Cukiernik / Obsługa / Mentor |
| data_startu | date | |
| poziom_docelowy | enum | JUNIOR / SAMODZIELNY / MENTOR (dla Pomocnika docelowy = JUNIOR, rola stała — patrz Aneks XIV) |
| pin | string? | opcjonalny 4-cyfrowy |

## Encja: WYNIK (log append-only — nigdy nie nadpisuj, tylko dopisuj)

| Pole | Typ | Opis |
|---|---|---|
| data | datetime | |
| id_prac | string | FK → PRACOWNIK |
| id_pytania | string | FK → PYTANIE |
| zaliczyl | bool | true/false |
| oceniajacy | string | kto ocenił (auto / imię Mentora) |
| notatka | string? | opcjonalna |

Append-only jest celowe: historia postępu = wartość. Powtórne podejście = nowy wiersz, nie edycja starego. Aktualny stan = ostatni wynik per (pracownik, pytanie).

## Encja: POSTEP (wyliczana — nie przechowuj, licz z WYNIK + PYTANIE)

Per (pracownik, tom):
- pytan_w_banku = count(PYTANIE gdzie tom=X, ccp=false)
- zaliczonych = count(ostatni WYNIK per pytanie gdzie zaliczyl=true, tom=X, ccp=false)
- procent = zaliczonych / pytan_w_banku
- status = procent >= PROG ? OPANOWANY : W_TOKU
- ccp_status = wszystkie(PYTANIE gdzie tom=X, ccp=true) mają ostatni WYNIK zaliczyl=true ? OK : BRAK

## Encja: KONFIG

| Klucz | Wartość domyślna |
|---|---|
| PROG_ZALICZENIA | 0,8 |
| PROG_CCP | 1,0 |

## Relacje

```
PRACOWNIK 1──∞ WYNIK ∞──1 PYTANIE
POSTEP = f(WYNIK, PYTANIE, KONFIG)   [wyliczane]
```

## Format eksportu do Panelu M5

```json
{
  "wersja": "2026-07-06",
  "wygenerowano": "<ISO datetime>",
  "pracownicy": [
    {
      "id_prac": "P-01",
      "imie": "...",
      "rola": "Piekarz",
      "poziom_ogolny_proc": 0.12,
      "tomy": [
        {"tom":"II Zakwas","procent":0.17,"status":"W TOKU","ccp_status":"OK"}
      ]
    }
  ]
}
```
Panel zassie to bez przepisywania — struktura płaska, ID-relacje jawne.
