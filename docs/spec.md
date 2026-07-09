# SPEC — Platforma Szkoleniowa Alterbake

Wersja: 2026-07-06 · Dla: Claude Code · Czytaj po AI_BATON.md

---

## 1. CEL FUNKCJONALNY

Aplikacja, w której:
- pracownik wybiera swój profil, rozwiązuje quiz z wybranego tomu, widzi swój wynik,
- każdy pracownik widzi **swój poziom wiedzy** per obszar (tom) + ogólny + status CCP osobno,
- Mentor/właściciel widzi postęp całego zespołu i decyduje o awansie na obiektywnym kryterium,
- bank pytań rośnie bez zmiany kodu (dane z pliku, nie z kodu).

## 2. UŻYTKOWNICY I ROLE

| Rola | Widzi | Może |
|---|---|---|
| Pracownik | Swój profil, swój postęp, quizy | Rozwiązywać quizy, przeglądać swoje wyniki |
| Mentor | Postęp całego zespołu + swój | Oceniać pytania otwarte/praktyczne, zatwierdzać awans |
| Właściciel (Piotr) | Wszystko + konfigurację | Zarządzać progami, eksport do Panelu |

Logowanie: prosty wybór profilu z listy + opcjonalny PIN 4-cyfrowy per pracownik. Bez OAuth na start.

## 3. TYPY PYTAŃ

- **jednokrotny** — 1 poprawna z kilku. Auto-ocena.
- **wielokrotny** — kilka poprawnych. Auto-ocena (wszystkie trafione = zaliczone).
- **otwarty** — odpowiedź tekstowa. Ocena RĘCZNA przez Mentora (porównanie z wzorcem). Nie auto.
- **praktyczny** — demonstracja na stanowisku. Mentor zaznacza zaliczył/nie w aplikacji. Nie auto.

Uwaga: pytania otwarte/praktyczne wymagają Mentora — aplikacja kolejkuje je „do oceny", nie zamyka automatem.

## 4. LOGIKA POMIARU (rdzeń — implementuj precyzyjnie)

### Opanowanie tomu na poziomie
```
dla danego (pracownik, tom, poziom):
  pytania_poziomu = pytania z banku gdzie tom=X i poziom=Y i ccp=false
  zaliczone = pytania_poziomu zaliczone przez pracownika
  procent = zaliczone / pytania_poziomu
  opanowany = procent >= PROG_ZALICZENIA (domyślnie 0,8)
```

### CCP — osobna, twarda ścieżka
```
dla danego (pracownik, tom):
  pytania_ccp = pytania z banku gdzie tom=X i ccp=true
  ccp_status = WSZYSTKIE pytania_ccp zaliczone ? "OK" : "BRAK — BLOKADA"
  # ccp_status NIE wchodzi do procentu ogólnego
  # jeśli "BRAK — BLOKADA": pracownik NIE może być uznany za Samodzielnego w tym tomie,
  #   niezależnie od procentu ogólnego
```

### Poziom ogólny pracownika
```
poziom_ogolny = średnia z procent_opanowania po wszystkich tomach (bez pytań ccp)
# wyświetlany jako %, ale status "Samodzielny" wymaga TAKŻE ccp_status=OK we wszystkich tomach
```

### Awans (kryterium delegowalne — sedno projektu)
```
Junior → Samodzielny w tomie:
  procent_poziomu_JUNIOR >= PROG  AND  procent_poziomu_SAMODZIELNY >= PROG  AND  ccp_status = OK
Samodzielny → Mentor:
  decyzja właściciela (nie automat) — aplikacja pokazuje że kryteria spełnione, ale awans na Mentora to decyzja ludzka
```

## 5. MODEL DANYCH

Patrz `schema.md`. Kluczowe: bank pytań = plik seed, wyniki = log append-only, profil i postęp = wyliczane.

## 6. WIDOK „MÓJ POZIOM" (najważniejszy ekran dla pracownika)

Musi pokazać, bez żargonu technicznego:
- imię, rola, data startu,
- pasek % per tom (II Zakwas, IV Wypiek, V DDT) + status (W TOKU / OPANOWANY),
- ogólny poziom % (duży, widoczny),
- **status CCP osobno, na czerwono jeśli brak** — nigdy schowany w średniej,
- „następny krok": który tom/poziom podciągnąć, żeby awansować.

## 7. EKSPORT DO PANELU M5

Panel Piekarni (projekt Alterbake IoT) będzie czytał dane. Zapewnij eksport:
- format: JSON i/lub xlsx o strukturze zgodnej ze `schema.md`,
- zawartość: profile + aktualny postęp per pracownik per tom + status CCP,
- endpoint lub przycisk „Eksportuj dla Panelu" — jedno kliknięcie, plik gotowy do zassania.
- NIE buduj integracji live z Panelem (Panel nie ma jeszcze buildu) — tylko eksport pliku.

## 8. STACK — Twój wybór, uzasadnij w README

Wymogi: działa lokalnie (piekarnia, nie chmura na start), dane trwałe między sesjami, prosty deploy. Sugestia (nie nakaz): React + Vite + IndexedDB lub SQLite. Jeśli wybierzesz inaczej — uzasadnij.

## 9. KAMIENIE MILOWE

1. MVP: 1 profil, 1 tom, quiz jednokrotny, wynik, widok „mój poziom" z regułą CCP.
2. Wszystkie typy pytań + kolejka oceny Mentora.
3. Zespół: wielu pracowników, widok Mentora, awans.
4. Eksport do Panelu M5.
5. (później, osobny projekt) integracja live z Panelem.
