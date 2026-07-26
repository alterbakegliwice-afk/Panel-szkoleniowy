// ROZSZERZENIA MATERIAŁU — karty wiedzy tworzone w czasie działania przez
// Właściciela z oflagowanych pytań zespołu (Pytania do Mistrza → warstwa
// PRAKTYCZNA, SPEC §4c). Statyczne karty żyją w materialy_nauka.json (wpieczone
// w build); rozszerzenia żyją w stanie (localStorage, append-only), żeby
// Właściciel mógł rozwijać materiał z przeglądarki bez przebudowy kodu.
//
// Kształt karty (zgodny z materialy_nauka.json → tomy[].karty[]):
//   { id, tom, tytul, punkty:[string], zrodlo, zPytania (id źródłowego pytania), data }

import { listaTomow } from './progress.js'
import { TECHNIKA } from './technika.js'
import { SPRZATANIE } from './sprzatanie.js'

let licznikId = 0

// Znormalizowane pola treści karty — wspólne dla tworzenia i edycji (trim +
// odrzucenie pustych punktów), żeby jedna karta nie miała dwóch reguł czyszczenia.
function polaKarty({ tom, tytul, punkty, zrodlo }) {
  return {
    tom: (tom || '').trim(),
    tytul: (tytul || '').trim(),
    punkty: (Array.isArray(punkty) ? punkty : [])
      .map((p) => (p || '').trim())
      .filter((p) => p !== ''),
    zrodlo: (zrodlo || '').trim()
  }
}

// Lista tematów, do których można przypiąć kartę (tomy banku + Technika + Sprzątanie).
// Jedno źródło dla formularza pytania (PytaniaMistrza) i redakcji kart (OwnerPanel).
export function listaTematow(pytaniaBank) {
  return [
    ...listaTomow(pytaniaBank || []),
    ...TECHNIKA.maszyny.map((m) => m.nazwa),
    ...SPRZATANIE.strefy.map((s) => s.nazwa)
  ]
}

export function nowaKarta({ tom, tytul, punkty, zrodlo, zPytania = '' }, terazISO = new Date().toISOString()) {
  return {
    id: 'kr-' + Date.now().toString(36) + '-' + (licznikId++).toString(36),
    ...polaKarty({ tom, tytul, punkty, zrodlo }),
    zPytania,
    data: terazISO
  }
}

// Edycja karty w miejscu (redakcja): tylko treść, zachowuje id/zPytania/data.
export function aktualizujKarte(lista, id, zmiany) {
  return (Array.isArray(lista) ? lista : []).map((k) =>
    k && k.id === id ? { ...k, ...polaKarty({ tom: k.tom, tytul: k.tytul, punkty: k.punkty, zrodlo: k.zrodlo, ...zmiany }) } : k
  )
}

export function usunKarte(lista, id) {
  return (Array.isArray(lista) ? lista : []).filter((k) => k && k.id !== id)
}

// Walidacja przy wczytaniu/backupie — zepsuty wpis (ręczna edycja localStorage,
// stara wersja) nie może wywalić UI ani wpuścić pustej karty do materiału.
export function filtrujRozszerzenia(lista) {
  if (!Array.isArray(lista)) return []
  return lista.filter(
    (k) =>
      k &&
      typeof k === 'object' &&
      typeof k.id === 'string' &&
      typeof k.tom === 'string' &&
      k.tom.trim() !== '' &&
      typeof k.tytul === 'string' &&
      k.tytul.trim() !== '' &&
      Array.isArray(k.punkty) &&
      k.punkty.length > 0 &&
      k.punkty.every((p) => typeof p === 'string' && p.trim() !== '') &&
      typeof k.data === 'string'
  )
}

// Dynamiczne karty danego tematu (tomu/maszyny/strefy), w kształcie karty
// materiału. Znacznik `rozszerzenie:true` pozwala Learning oznaczyć je wizualnie.
export function kartyTomu(tom, rozszerzenia) {
  return filtrujRozszerzenia(rozszerzenia)
    .filter((k) => k.tom === tom)
    .map((k) => ({ tytul: k.tytul, punkty: k.punkty, zrodlo: k.zrodlo, rozszerzenie: true }))
}

// Wstępny szkic punktów karty z odpowiedzi Właściciela — każdy niepusty wiersz
// (albo zdanie) staje się osobnym punktem. Właściciel dopracowuje przed publikacją.
export function szkicPunktow(odpowiedz) {
  if (typeof odpowiedz !== 'string') return []
  const wiersze = odpowiedz.split('\n').map((w) => w.trim()).filter((w) => w !== '')
  if (wiersze.length > 1) return wiersze
  // jeden akapit → podziel na zdania (kropka/wykrzyknik/znak zapytania + spacja)
  return odpowiedz
    .split(/(?<=[.!?])\s+/)
    .map((z) => z.trim())
    .filter((z) => z !== '')
}
