// Integracja między aplikacjami Alterbake przez wspólny origin GitHub Pages
// (alterbakegliwice-afk.github.io — wszystkie aplikacje współdzielą localStorage).
// Kontrakty danych: docs/SPEC-APLIKACJA-PRACOWNIKA.md §2.
//
// Zasady własności kluczy:
// - alterbake_zespol_v1     — pisze WYŁĄCZNIE Panel (lustro pracowników z tego stanu),
// - alterbake_zgloszenia_v1 — treść dopisuje pracownik, status/odpowiedź zmienia
//                             Właściciel; wpisy nigdy nie są edytowane ani usuwane,
// - alterbake_planer_v2     — własność Planera Produkcji; Panel czyta plan i zadania,
//                             a zapisuje wyłącznie zmianę statusu WŁASNEGO zadania.

export const KLUCZ_ZESPOL = 'alterbake_zespol_v1'
export const KLUCZ_ZGLOSZENIA = 'alterbake_zgloszenia_v1'
export const KLUCZ_PLANER = 'alterbake_planer_v2'

export const MODULY_PLANERA = [
  { klucz: 'cukiernia', nazwa: 'Cukiernia', ikona: '🍰' },
  { klucz: 'piekarnia', nazwa: 'Piekarnia', ikona: '🥖' }
]

export const TYPY_ZGLOSZEN = [
  { klucz: 'potrzeba', nazwa: 'Potrzeba (brakuje / potrzebuję)' },
  { klucz: 'uwaga', nazwa: 'Uwaga / pomysł' },
  { klucz: 'awaria', nazwa: 'Awaria / problem' }
]

export const STATUSY_ZGLOSZEN = ['nowe', 'przyjete', 'zamkniete']

const maLocalStorage = () => typeof localStorage !== 'undefined'

function czytajJSON(klucz) {
  if (!maLocalStorage()) return null
  try {
    const surowe = localStorage.getItem(klucz)
    return surowe ? JSON.parse(surowe) : null
  } catch {
    return null
  }
}

function zapiszJSON(klucz, obiekt) {
  if (!maLocalStorage()) return
  try {
    localStorage.setItem(klucz, JSON.stringify(obiekt))
  } catch (e) {
    console.error('Nie udało się zapisać ' + klucz, e)
  }
}

// Dzień w czasie LOKALNYM (toISOString to UTC — data przeskakiwałaby
// o 1:00/2:00 w nocy czasu polskiego; ten sam wzorzec co w Planerze).
export function dzisISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// --- REJESTR ZESPOŁU (lustro pracowników dla Planera i AI Dashboardu) ---

// Czysta funkcja: stan Panelu → obiekt rejestru (testowalna bez localStorage).
export function zbudujRejestr(stan, terazISO) {
  return {
    wersja: 1,
    zaktualizowano: terazISO,
    wlasciciel: {
      imie: 'Piotr',
      pin: (stan.konfig && stan.konfig.PIN_WLASCICIELA) || ''
    },
    pracownicy: (stan.pracownicy || []).map((p) => ({
      id_prac: p.id_prac,
      imie: p.imie,
      rola: p.rola,
      pin: p.pin || '',
      kierownik: Array.isArray(p.kierownik)
        ? p.kierownik.filter((m) => MODULY_PLANERA.some((x) => x.klucz === m))
        : []
    }))
  }
}

export function zapiszLustroZespolu(stan, terazISO = new Date().toISOString()) {
  zapiszJSON(KLUCZ_ZESPOL, zbudujRejestr(stan, terazISO))
}

// --- ZGŁOSZENIA (potrzeby i uwagi pracowników) ---

export function filtrujZgloszenia(lista) {
  if (!Array.isArray(lista)) return []
  return lista.filter(
    (z) =>
      z &&
      typeof z === 'object' &&
      typeof z.id === 'string' &&
      typeof z.id_prac === 'string' &&
      typeof z.tresc === 'string' &&
      z.tresc.trim() !== '' &&
      typeof z.data === 'string' &&
      TYPY_ZGLOSZEN.some((t) => t.klucz === z.typ) &&
      STATUSY_ZGLOSZEN.includes(z.status)
  )
}

// Surowa lista z klucza — BEZ filtrowania. Zapisy (dopisanie, zmiana statusu)
// operują na surowej liście, żeby wpisy nierozpoznane przez tę wersję Panelu
// (np. nowy typ zapisany przez AI Dashboard) przetrwały zapis — log jest
// append-only dla WSZYSTKICH aplikacji originu, nie tylko dla nas.
function suroweZgloszenia() {
  const dane = czytajJSON(KLUCZ_ZGLOSZENIA)
  return Array.isArray(dane && dane.zgloszenia) ? dane.zgloszenia : []
}

export function wczytajZgloszenia() {
  return filtrujZgloszenia(suroweZgloszenia())
}

function zapiszZgloszenia(zgloszenia) {
  zapiszJSON(KLUCZ_ZGLOSZENIA, { wersja: 1, zgloszenia })
}

let licznikId = 0
export function noweZgloszenie({ id_prac, imie, typ, tresc }, terazISO = new Date().toISOString()) {
  return {
    id: 'zg-' + Date.now().toString(36) + '-' + (licznikId++).toString(36),
    id_prac,
    imie,
    typ,
    tresc: tresc.trim(),
    data: terazISO,
    status: 'nowe',
    odpowiedz: ''
  }
}

// Dopisanie wpisu (log append-only) — zwraca zaktualizowaną listę do UI.
export function dodajZgloszenie(wpis) {
  const surowe = [...suroweZgloszenia(), wpis]
  zapiszZgloszenia(surowe)
  return filtrujZgloszenia(surowe)
}

// Zmiana statusu/odpowiedzi (jedyna dozwolona modyfikacja istniejącego wpisu).
export function ustawStatusZgloszenia(id, status, odpowiedz) {
  const surowe = suroweZgloszenia().map((z) =>
    z && z.id === id
      ? { ...z, status, odpowiedz: odpowiedz !== undefined ? odpowiedz : z.odpowiedz }
      : z
  )
  zapiszZgloszenia(surowe)
  return filtrujZgloszenia(surowe)
}

// --- ODCZYT PLANERA PRODUKCJI (tylko-odczyt + status własnego zadania) ---

export function wczytajPlaner() {
  const dane = czytajJSON(KLUCZ_PLANER)
  return dane && dane.moduly && typeof dane.moduly === 'object' ? dane : null
}

// Wpisy zespołu planera powiązane z pracownikiem (ustawienia.zespol[].id_prac).
function idOsobPracownika(modul, idPrac) {
  const zespol = (modul.ustawienia && modul.ustawienia.zespol) || []
  return zespol.filter((os) => os.id_prac === idPrac).map((os) => os.id)
}

function nazwaOsoby(modul, idOsoby) {
  const zespol = (modul.ustawienia && modul.ustawienia.zespol) || []
  const os = zespol.find((x) => x.id === idOsoby)
  return os ? os.nazwa : idOsoby
}

// Zadania pracownika na dzień, ze wszystkich modułów planera.
export function zadaniaDnia(planer, idPrac, data) {
  if (!planer) return []
  const wynik = []
  for (const { klucz, nazwa, ikona } of MODULY_PLANERA) {
    const modul = planer.moduly[klucz]
    if (!modul) continue
    const moje = new Set(idOsobPracownika(modul, idPrac))
    if (!moje.size) continue
    for (const z of modul.zadania || []) {
      if (z.data === data && moje.has(z.osoba)) {
        wynik.push({
          modul: klucz,
          modulNazwa: nazwa,
          modulIkona: ikona,
          id: z.id,
          tytul: z.tytul,
          czas_min: z.czas_min || 0,
          status: z.status,
          zrodlo: z.zrodlo || ''
        })
      }
    }
  }
  return wynik
}

// Czy pracownik ma w ogóle powiązanie z zespołem któregokolwiek modułu planera.
export function maPowiazanieZPlanerem(planer, idPrac) {
  if (!planer) return false
  return MODULY_PLANERA.some(
    ({ klucz }) => planer.moduly[klucz] && idOsobPracownika(planer.moduly[klucz], idPrac).length
  )
}

const zMin = (min) => {
  const p = (n) => String(n).padStart(2, '0')
  return p(Math.floor(min / 60) % 24) + ':' + p(min % 60)
}

// Bloki planu produkcji na dzień, per moduł. Nazwy receptur żyją w danych
// Planera (AB_RECEPTURY) — tu pokazujemy nr, okno czasowe i prowadzącego.
export function planDnia(planer, data, idPrac) {
  if (!planer) return []
  const wynik = []
  for (const { klucz, nazwa, ikona } of MODULY_PLANERA) {
    const modul = planer.moduly[klucz]
    if (!modul) continue
    const dzien = modul.plan && modul.plan[data]
    const bloki = (dzien && dzien.bloki) || []
    if (!bloki.length) continue
    const moje = new Set(idOsobPracownika(modul, idPrac))
    wynik.push({
      modul: klucz,
      modulNazwa: nazwa,
      modulIkona: ikona,
      bloki: bloki
        .map((b) => {
          const koniec =
            b.segmenty && b.segmenty.length ? b.start + b.segmenty[b.segmenty.length - 1].do : b.start
          return {
            id: b.id,
            nr: b.nr,
            od: zMin(b.start),
            do: zMin(koniec),
            startMin: b.start,
            osoba: nazwaOsoby(modul, b.osoba),
            moje: moje.has(b.osoba)
          }
        })
        .sort((a, b) => a.startMin - b.startMin)
    })
  }
  return wynik
}

// Jedyny zapis Panelu do stanu Planera: pracownik odhacza status WŁASNEGO zadania.
// Wołający (MojDzien) podaje zadanie z listy zadaniaDnia(), więc własność jest
// już zweryfikowana przez mapowanie id_prac.
export function przelaczStatusZadania(modulKlucz, idZadania) {
  const planer = wczytajPlaner()
  if (!planer) return null
  const modul = planer.moduly[modulKlucz]
  const zadanie = modul && (modul.zadania || []).find((z) => z.id === idZadania)
  if (!zadanie) return null
  zadanie.status = zadanie.status === 'zrobione' ? 'otwarte' : 'zrobione'
  zapiszJSON(KLUCZ_PLANER, planer)
  return zadanie.status
}
