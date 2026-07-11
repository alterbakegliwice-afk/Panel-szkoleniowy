# AI BATON — Platforma Szkoleniowa Alterbake

> **Czym jest ten plik:** pałeczka sztafetowa. Nowa sesja Claude Code czyta go PIERWSZY, przed dotknięciem kodu. Niesie cały kontekst, którego nie widać w samym kodzie. Czytasz to → wiesz co budujesz, dlaczego tak, i czego NIE robić.

---

## 1. CO BUDUJESZ (jedno zdanie)

Standalone web app do ewaluacji wiedzy pracowników piekarni/cukierni Alterbake, z profilami, quizami, pomiarem postępu i widokiem „mój poziom wiedzy" dla każdego pracownika — z eksportem do formatu Panelu Piekarni M5.

## 2. DLACZEGO ISTNIEJE (kontekst biznesowy — nie pomijaj)

- Alterbake = mikropiekarnia rzemieślnicza, Gliwice, właściciel Piotr.
- **Cel nadrzędny M5: redukcja zależności operacyjnej od właściciela.** Dziś awans pracownika Junior→Samodzielny zależy od wyczucia Piotra — niedokumentowalnego i niedelegowalnego. Ta platforma czyni kryterium awansu OBIEKTYWNYM, żeby Mentor mógł oceniać bez Piotra.
- Baza wiedzy już istnieje: 20 tomów „Złoty Standard Piekarstwa" + 14 części Cukiernictwa. Platforma NIE tworzy wiedzy — mierzy jej opanowanie.

## 3. DECYZJE JUŻ PODJĘTE (nie podważaj bez pytania Piotra)

| Decyzja | Wariant | Uzasadnienie |
|---|---|---|
| Architektura | **Standalone najpierw** (nie moduł Panelu od razu) | Panel Piekarni to mockup bez daty buildu. Platforma potrzebna wcześniej. Integracja później = mapowanie, nie przepisywanie. |
| Format danych źródłowych | **xlsx → JSON seed** | Spójny z Receptury_alterbake.xlsx. Repozytorium w Excelu już istnieje, `bank_pytan_seed.json` z niego wyeksportowany. |
| Zakres startowy | **Pilot: 3 tomy** (II Zakwas, IV Wypiek, V DDT) | Zasada Piotra: pilot-before-scale. 16 pytań zweryfikowanych > 400 niesprawdzonych. |
| Poziomy kompetencji | Junior / Samodzielny / Mentor | Zgodne z Tomem XIV (Piekarz) i Częścią X (Cukiernik). |

## 4. ZASADA NIENARUSZALNA — CCP (przeczytaj dwa razy)

**Pytania oznaczone `ccp: true` to bezpieczeństwo żywności (CCP1 ≥92°C pieczywo, CCP5 ≥85°C/1min krem).**

- Próg zaliczenia CCP = **100%**, nie 80% jak reszta.
- CCP **NIE uśrednia się** z ogólnym wynikiem. Pracownik może mieć 95% ogólnie, ale jeśli oblał choć jedno CCP — status bezpieczeństwa = NIEZALICZONY, wyświetlany OSOBNO i na czerwono.
- To nie jest opcja UI do „ładnego pokazania". To twarda reguła biznesowa. Uśrednienie CCP z resztą = błąd krytyczny, który pozwala „zdać" mimo luki w bezpieczeństwie.

## 5. CZEGO NIE ROBIĆ

- ❌ NIE buduj własnego CMS do edycji wiedzy — treść żyje w dokumentach/xlsx, platforma tylko mierzy.
- ❌ NIE hardkoduj pytań w kodzie — czytaj z `bank_pytan_seed.json`, ma rosnąć bez zmiany kodu.
- ❌ NIE rób logowania przez zewnętrzne OAuth na start — prosty wybór profilu wystarcza (piekarnia, nie bank). Można dodać PIN per pracownik.
- ❌ NIE uśredniaj CCP (patrz sekcja 4).
- ❌ NIE wymyślaj nowych pytań — jeśli bank jest za mały, zgłoś to, nie generuj treści merytorycznej sam (wymaga akceptacji technologa).

## 6. STAN GOTOWOŚCI

- ✅ Schemat danych — gotowy (`schema.md`)
- ✅ Bank pytań pilot — gotowy (`bank_pytan_seed.json`, 16 pytań)
- ✅ Reguły pomiaru — gotowe (`spec.md` sekcja „Logika")
- ✅ Format eksportu do Panelu M5 — opisany (`spec.md` sekcja „Eksport")
- ⏳ Skalowanie banku na pozostałe tomy — PO walidacji pilota przez Piotra
- ⏳ Integracja z Panelem — osobny projekt (Alterbake IoT), gdy Panel ma build

## 7. PIERWSZE 3 KROKI DLA CIEBIE (Claude Code)

1. Przeczytaj `spec.md` (pełny wymóg) + `schema.md` (model danych) + `bank_pytan_seed.json`.
2. Zbuduj MVP: wybór profilu → quiz z jednego tomu → wynik → widok „mój poziom". Stack: React + lokalny stan/IndexedDB lub SQLite (Twój wybór, uzasadnij w README).
3. Zaimplementuj regułę CCP z sekcji 4 JAKO PIERWSZĄ logikę biznesową, nie na końcu — reszta ma się do niej dopasować.

## 8. KONTAKT ZWROTNY

Jeśli natrafisz na decyzję, której ten baton nie rozstrzyga — NIE zgaduj. Zbierz pytania i zadaj Piotrowi zbiorczo. Zasada projektu: brak danych = pytaj, nie zmyślaj.
