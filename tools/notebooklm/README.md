# Generator treści szkoleniowych z NotebookLM

Pipeline: **kompendium złotych standardów → NotebookLM → bank pytań / materiały nauki**
dla Panelu Szkoleniowego. Używa nieoficjalnego klienta
[`notebooklm-py`](https://github.com/alterbakegliwice-afk/notebooklm-py) (async, batchexecute).

## Skąd treść źródłowa

Złote standardy żyją w repo `plan-produkcji-cukiernia`:

- `docs/standardy/DESTYLAT-ZLOTYCH-STANDARDOW.md` — destylat operacyjny (cukiernia),
- `docs/baza-wiedzy/ZS-PLANOWANIE-PRODUKCJI.md` — planowanie produkcji cukierni,
- `docs/baza-wiedzy/ZS-PLANOWANIE-PIEKARNIA.md` — planowanie piekarni.

Skrypt wgrywa te pliki jako źródła do jednego notatnika i odpytuje NotebookLM
**wyłącznie na ich podstawie** (zero wiedzy spoza standardów — mniejsze ryzyko
halucynacji w pytaniach CCP).

## Instalacja i logowanie (raz)

```bash
pip install notebooklm-py[browser]
notebooklm login          # otwiera przeglądarkę, zapisuje tokeny sesji Google
```

## Użycie

```bash
python generuj_tresci.py \
  --standardy ../../..//plan-produkcji-cukiernia/docs \
  --wyjscie ./wyjscie \
  --obszary "Organizacja dnia cukierni" "Delegowalność zadań i poziomy kompetencji" \
  --pytan-na-obszar 6
```

Wynik w `./wyjscie/`:

- `bank_pytan_notebooklm.json` — **szkic** banku w formacie Panelu
  (`{"pytania": [...]}`, walidowany tą samą listą reguł co `walidujBank` w aplikacji),
- `material_<obszar>.md` — zwięzłe materiały nauki per obszar (do przejrzenia).

## Do Panelu trafia TYLKO po akceptacji

Wygenerowany bank to szkic: pytania (zwłaszcza `ccp: true`) **musi zaakceptować
technolog/Piotr** (zasada z README Panelu — treść żyje w xlsx technologa).
Po akceptacji: Panel → Konfiguracja → „Wgraj bank (JSON)".

## Uwagi operacyjne

- ID metod RPC NotebookLM są niestabilne (patrz `notebooklm-py/docs/stability.md`) —
  jeśli skrypt padnie na dekodowaniu, zaktualizuj bibliotekę.
- Skrypt jest idempotentny per notatnik: szuka notatnika po tytule, źródła wgrywa
  tylko gdy brak ich na liście (po nazwie pliku).
- Rate limiting: między pytaniami jest pauza (`--pauza`, domyślnie 5 s).
