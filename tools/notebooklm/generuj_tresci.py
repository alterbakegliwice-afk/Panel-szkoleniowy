#!/usr/bin/env python3
"""Generator treści szkoleniowych: złote standardy → NotebookLM → bank pytań.

Wgrywa kompendium złotych standardów (markdown z repo plan-produkcji-cukiernia)
jako źródła notatnika NotebookLM, a następnie prosi model o pytania quizowe
w formacie banku Panelu Szkoleniowego oraz zwięzłe materiały nauki per obszar.

Wymaga zalogowanej sesji: `notebooklm login` (patrz README.md obok).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

try:
    from notebooklm import NotebookLMClient
except ImportError:  # pragma: no cover - komunikat dla operatora
    sys.exit("Brak biblioteki notebooklm-py. Zainstaluj: pip install notebooklm-py[browser]")

TYTUL_NOTATNIKA = "Alterbake — Złote Standardy (szkolenia)"

# Domyślne pliki kompendium (relatywnie do --standardy)
PLIKI_STANDARDOW = [
    "standardy/DESTYLAT-ZLOTYCH-STANDARDOW.md",
    "baza-wiedzy/ZS-PLANOWANIE-PRODUKCJI.md",
    "baza-wiedzy/ZS-PLANOWANIE-PIEKARNIA.md",
]

DOMYSLNE_OBSZARY = [
    "Organizacja dnia cukierni (model wieczorny, handoffy)",
    "Delegowalność zadań i poziomy kompetencji (JUNIOR/SAMODZIELNY/MENTOR)",
    "Bezpieczeństwo żywności: CCP4 i CCP5",
    "Planowanie produkcji piekarni",
]

PROMPT_PYTANIA = """Na podstawie WYŁĄCZNIE źródeł w tym notatniku przygotuj {n} pytań
quizowych z obszaru: „{obszar}".

Zwróć SAM JSON (bez komentarzy, bez markdown), tablicę obiektów o polach:
- "id": string, prefiks "NL-", np. "NL-ORG-01" (unikalne),
- "tom": "{obszar}",
- "poziom": "JUNIOR" albo "SAMODZIELNY",
- "typ": "jednokrotny" (jedna poprawna) albo "wielokrotny" (2+ poprawnych),
- "pytanie": treść po polsku,
- "opcje": lista 3-5 wariantów odpowiedzi (niepuste stringi),
- "poprawne": lista indeksów poprawnych opcji (0-based; dla "jednokrotny" dokładnie 1),
- "wzorzec": jedno-dwuzdaniowe uzasadnienie poprawnej odpowiedzi Z CYTOWANIEM
  skrótu dokumentu źródłowego (np. ORG-X, KOMP-X, ZSC),
- "ccp": true tylko jeśli pytanie dotyczy krytycznego punktu kontroli
  bezpieczeństwa żywności (CCP), inaczej false.

Pytania mają sprawdzać wiedzę operacyjną (co robić na hali), nie definicje."""

PROMPT_MATERIAL = """Na podstawie WYŁĄCZNIE źródeł w tym notatniku napisz zwięzły materiał
szkoleniowy (markdown, po polsku, maks. 400 słów) dla pracownika z obszaru:
„{obszar}". Struktura: po co to jest (2 zdania) → 5-8 konkretnych zasad
działania (lista) → 3 najczęstsze błędy. Przy każdej zasadzie skrót dokumentu
źródłowego w nawiasie (np. ORG-X 2)."""


# --- walidacja szkicu banku: lustro reguł walidujBank z src/logic/store.js ---
def waliduj_pytania(pytania: list) -> str | None:
    if not isinstance(pytania, list) or not pytania:
        return "Wynik nie jest niepustą listą pytań."
    wymagane = ["id", "tom", "poziom", "typ", "pytanie", "wzorzec"]
    for p in pytania:
        for pole in wymagane:
            if not p.get(pole):
                return f"Pytanie {p.get('id', '(bez id)')} nie ma pola „{pole}”."
        if not isinstance(p.get("ccp"), bool):
            return f"Pytanie {p['id']}: pole „ccp” musi być true/false."
        opcje, poprawne = p.get("opcje"), p.get("poprawne")
        if opcje is not None:
            if not isinstance(opcje, list) or len(opcje) < 2:
                return f"Pytanie {p['id']}: „opcje” musi być listą min. 2 wariantów."
            if any(not isinstance(o, str) or not o.strip() for o in opcje):
                return f"Pytanie {p['id']}: każda opcja musi być niepustym tekstem."
            if not isinstance(poprawne, list) or not poprawne:
                return f"Pytanie {p['id']}: „opcje” bez „poprawne”."
            # uwaga: bool jest podklasą int w Pythonie — odrzucamy jawnie
            # (JS-owe Number.isInteger(true) === false, lustro musi się zgadzać)
            if any(
                not isinstance(i, int) or isinstance(i, bool) or i < 0 or i >= len(opcje)
                for i in poprawne
            ):
                return f"Pytanie {p['id']}: „poprawne” wskazuje nieistniejącą opcję."
            if len(set(poprawne)) != len(poprawne):
                return f"Pytanie {p['id']}: zduplikowane indeksy w „poprawne”."
            if p["typ"] == "jednokrotny" and len(poprawne) != 1:
                return f"Pytanie {p['id']}: „jednokrotny” wymaga dokładnie 1 poprawnej."
        elif p["typ"] in ("jednokrotny", "wielokrotny") and poprawne is not None:
            # lustro store.js walidujBank: „poprawne” bez „opcje” to błąd klucza
            return f"Pytanie {p['id']}: „poprawne” bez „opcje”."
    idki = [p["id"] for p in pytania]
    if len(set(idki)) != len(idki):
        return "Zduplikowane ID pytań."
    return None


def wytnij_json(tekst: str):
    """Model bywa gadatliwy — wytnij pierwszą tablicę obiektów z odpowiedzi.

    Zachłanny regex `\\[.*\\]` łapał od pierwszego do ostatniego nawiasu w całej
    odpowiedzi, więc znaczniki cytowań NotebookLM (np. „[1]” w prozie) psuły
    parsowanie. Zamiast tego dekodujemy od kolejnych „[” raw_decode'em i bierzemy
    pierwszą poprawną listę słowników.
    """
    dekoder = json.JSONDecoder()
    for kandydat in re.finditer(r"\[", tekst):
        try:
            wynik, _ = dekoder.raw_decode(tekst, kandydat.start())
        except json.JSONDecodeError:
            continue
        if isinstance(wynik, list) and wynik and all(isinstance(x, dict) for x in wynik):
            return wynik
    raise ValueError("Brak tablicy JSON w odpowiedzi:\n" + tekst[:400])


def bezpieczna_nazwa(obszar: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", obszar.lower()).strip("-")[:60]


async def znajdz_lub_utworz_notatnik(client):
    for nb in await client.notebooks.list():
        if nb.title == TYTUL_NOTATNIKA:
            return nb
    return await client.notebooks.create(TYTUL_NOTATNIKA)


async def wgraj_zrodla(client, nb_id: str, katalog: Path) -> None:
    istniejace = {s.title for s in await client.sources.list(nb_id)}
    for wzgledna in PLIKI_STANDARDOW:
        plik = katalog / wzgledna
        if not plik.exists():
            print(f"  ⚠ pominięto (brak pliku): {plik}")
            continue
        if plik.name in istniejace:
            print(f"  = już wgrane: {plik.name}")
            continue
        print(f"  + wgrywam: {plik.name}")
        await client.sources.add_file(nb_id, plik, wait=True, title=plik.name)


async def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--standardy", type=Path, required=True,
                    help="katalog docs repo plan-produkcji-cukiernia")
    ap.add_argument("--wyjscie", type=Path, default=Path("wyjscie"))
    ap.add_argument("--obszary", nargs="+", default=DOMYSLNE_OBSZARY)
    ap.add_argument("--pytan-na-obszar", type=int, default=6)
    ap.add_argument("--pauza", type=float, default=5.0,
                    help="sekundy między zapytaniami (rate limiting)")
    args = ap.parse_args()
    args.wyjscie.mkdir(parents=True, exist_ok=True)

    async with NotebookLMClient.from_storage() as client:
        nb = await znajdz_lub_utworz_notatnik(client)
        print(f"Notatnik: {nb.title} ({nb.id})")
        await wgraj_zrodla(client, nb.id, args.standardy)

        bank = []
        for obszar in args.obszary:
            print(f"— pytania: {obszar}")
            odp = await client.chat.ask(
                nb.id, PROMPT_PYTANIA.format(n=args.pytan_na_obszar, obszar=obszar)
            )
            # błąd parsowania jednej partii nie może wywalić skryptu i utopić
            # wyników wcześniejszych obszarów — odrzucamy partię jak przy walidacji
            try:
                pytania = wytnij_json(odp.answer)
                blad = waliduj_pytania(pytania)
            except ValueError as e:
                blad = f"parsowanie: {e}"
            if blad:
                print(f"  ⚠ odrzucono partię ({blad}) — popraw prompt/model i ponów")
            else:
                bank.extend(pytania)
            await asyncio.sleep(args.pauza)

            print(f"— materiał: {obszar}")
            odp = await client.chat.ask(nb.id, PROMPT_MATERIAL.format(obszar=obszar))
            (args.wyjscie / f"material_{bezpieczna_nazwa(obszar)}.md").write_text(
                odp.answer, encoding="utf-8"
            )
            await asyncio.sleep(args.pauza)

        blad = waliduj_pytania(bank)
        if blad:
            sys.exit(f"Zbiorczy bank nie przeszedł walidacji: {blad}")
        plik_banku = args.wyjscie / "bank_pytan_notebooklm.json"
        plik_banku.write_text(
            json.dumps({"pytania": bank}, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"✓ {len(bank)} pytań → {plik_banku}")
        print("SZKIC: wymaga akceptacji technologa/Piotra przed wgraniem do Panelu.")


if __name__ == "__main__":
    asyncio.run(main())
