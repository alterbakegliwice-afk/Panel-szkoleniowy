// Trwałość danych: localStorage (uzasadnienie w README — dane liczone w KB,
// jedno stanowisko, zero zależności; eksport/backup przyciskiem).
// WYNIK jest logiem append-only — akcje wyłącznie DOPISUJĄ, nigdy nie edytują.
import seedWbudowany from '../data/bank_pytan_seed.json'

const KLUCZ = 'alterbake-platforma-v1'

// Przykładowe dane z Alterbake_Platforma_Szkoleniowa_v20260706.xlsx
// (arkusze PRACOWNICY i WYNIKI) — do nadpisania realnymi w Konfiguracji.
export const PRZYKLADOWI_PRACOWNICY = [
  {
    id_prac: 'P-01',
    imie: '(przykład) Weronika',
    rola: 'Piekarz',
    data_startu: '2026-01-15',
    poziom_docelowy: 'SAMODZIELNY',
    pin: ''
  },
  {
    id_prac: 'P-02',
    imie: '(przykład) Michał',
    rola: 'Pomocnik',
    data_startu: '2026-03-01',
    poziom_docelowy: 'JUNIOR', // rola Pomocnik = stała, docelowy JUNIOR (Aneks XIV)
    pin: ''
  }
]

export const PRZYKLADOWE_WYNIKI = [
  { data: '2026-07-06', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: true, oceniajacy: 'Piotr', notatka: 'przykład' },
  { data: '2026-07-06', id_prac: 'P-01', id_pytania: 'W-01', zaliczyl: true, oceniajacy: 'Piotr', notatka: 'przykład CCP' },
  { data: '2026-07-06', id_prac: 'P-02', id_pytania: 'Z-01', zaliczyl: false, oceniajacy: 'Piotr', notatka: 'przykład — do powtórki' }
]

export const ROLE = ['Piekarz', 'Pomocnik', 'Cukiernik', 'Obsługa', 'Mentor']

export function domyslnyStan() {
  return {
    konfig: { PROG_ZALICZENIA: 0.8 },
    pracownicy: PRZYKLADOWI_PRACOWNICY,
    wyniki: PRZYKLADOWE_WYNIKI,
    kolejka: [], // odpowiedzi otwarte/praktyczne czekające na ocenę Mentora
    bank: null // null = bank z pliku seed; obiekt = bank wgrany w Konfiguracji
  }
}

export function wczytajStan() {
  try {
    const surowe = localStorage.getItem(KLUCZ)
    if (!surowe) return domyslnyStan()
    const stan = JSON.parse(surowe)
    return { ...domyslnyStan(), ...stan }
  } catch {
    return domyslnyStan()
  }
}

export function zapiszStan(stan) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(stan))
  } catch (e) {
    console.error('Nie udało się zapisać stanu', e)
  }
}

// Bank pytań: priorytet ma bank wgrany przez właściciela (rośnie bez zmiany kodu),
// inaczej seed wbudowany w build.
export function bankPytan(stan) {
  return stan.bank || seedWbudowany
}

export function walidujBank(obiekt) {
  if (!obiekt || !Array.isArray(obiekt.pytania)) {
    return 'Plik nie ma tablicy „pytania".'
  }
  const wymagane = ['id', 'tom', 'poziom', 'typ', 'pytanie', 'wzorzec']
  for (const p of obiekt.pytania) {
    for (const pole of wymagane) {
      if (p[pole] === undefined || p[pole] === '') {
        return `Pytanie ${p.id || '(bez id)'} nie ma pola „${pole}".`
      }
    }
    if (typeof p.ccp !== 'boolean') {
      return `Pytanie ${p.id}: pole „ccp" musi być true/false.`
    }
    // Klucz odpowiedzi (opcje/poprawne) — walidacja twarda. Błędny klucz w pytaniu
    // CCP oznaczałby ciche mis-ocenianie bezpieczeństwa żywności, więc nie przepuszczamy.
    if (p.opcje !== undefined) {
      if (!Array.isArray(p.opcje) || p.opcje.length < 2) {
        return `Pytanie ${p.id}: „opcje" musi być listą min. 2 wariantów.`
      }
      if (p.opcje.some((o) => typeof o !== 'string' || !o.trim())) {
        return `Pytanie ${p.id}: każda opcja musi być niepustym tekstem.`
      }
      if (!Array.isArray(p.poprawne) || p.poprawne.length === 0) {
        return `Pytanie ${p.id}: „opcje" bez „poprawne" — brak klucza odpowiedzi.`
      }
      if (p.poprawne.some((i) => !Number.isInteger(i) || i < 0 || i >= p.opcje.length)) {
        return `Pytanie ${p.id}: „poprawne" wskazuje nieistniejącą opcję.`
      }
      if (new Set(p.poprawne).size !== p.poprawne.length) {
        return `Pytanie ${p.id}: „poprawne" ma zduplikowane indeksy.`
      }
      if (p.typ === 'jednokrotny' && p.poprawne.length !== 1) {
        return `Pytanie ${p.id}: „jednokrotny" musi mieć dokładnie 1 poprawną odpowiedź.`
      }
    } else if ((p.typ === 'jednokrotny' || p.typ === 'wielokrotny') && p.poprawne !== undefined) {
      return `Pytanie ${p.id}: „poprawne" bez „opcje".`
    }
  }
  const idki = obiekt.pytania.map((p) => p.id)
  if (new Set(idki).size !== idki.length) return 'Zduplikowane ID pytań.'
  return null
}

export function nastepneIdPracownika(pracownicy) {
  const nr = pracownicy
    .map((p) => parseInt((p.id_prac || '').replace('P-', ''), 10))
    .filter((n) => !isNaN(n))
  const max = nr.length ? Math.max(...nr) : 0
  return 'P-' + String(max + 1).padStart(2, '0')
}

export function teraz() {
  return new Date().toISOString()
}
