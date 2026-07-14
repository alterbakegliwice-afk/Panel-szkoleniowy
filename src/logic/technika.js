// Warstwa PANELU TECHNICZNEGO: park maszynowy (piece IBIS/Bongard, chłód,
// fermentacja, pomiar). Ta sama zasada co nauka.js: najpierw materiał
// („jak maszyna działa i jak czyta się jej zachowanie”), potem sprawdzenie.
// Diagnostyka objawów jest dostępna ZAWSZE (bez blokady nauki) — na hali
// objaw nie czeka, aż ktoś skończy quiz.
import modulTechniczny from '../data/modul_techniczny.json'
import { postepModulu } from './nauka.js'

export const TECHNIKA = modulTechniczny

export function maszynaTechniczna(id) {
  return TECHNIKA.maszyny.find((m) => m.id === id) || null
}

// Płaska lista pytań technicznych (do walidacji i statystyk).
export function pytaniaTechniki() {
  return TECHNIKA.maszyny.flatMap((m) => m.pytania)
}

// Postęp ucznia per maszyna + zbiorczy (te same reguły co tomy/moduły: próg 0,8).
export function postepTechniki(wyniki, idUcznia, prog = 0.8) {
  const maszyny = TECHNIKA.maszyny.map((m) => ({
    maszyna: m,
    postep: postepModulu(m, wyniki, idUcznia, prog)
  }))
  const procent = maszyny.length
    ? maszyny.reduce((s, x) => s + x.postep.procent, 0) / maszyny.length
    : 0
  return { maszyny, procent }
}

// Normalizacja do wyszukiwania objawów: bez wielkości liter i polskich znaków,
// żeby „blady spod” znalazło „Blady spód”.
const MAPA_ZNAKOW = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }
export function normalizuj(tekst) {
  return String(tekst || '')
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (z) => MAPA_ZNAKOW[z])
}

// Wyszukiwarka objawów w całym parku: „co się dzieje?” → karty diagnostyczne
// z nazwą maszyny. Przeszukuje objaw, odczyt i przyczyny. Dopasowanie per
// słowo (wszystkie muszą wystąpić), bo polska fleksja psuje dopasowanie całej
// frazy („kamień kotłowy” ma znaleźć „kamieniem kotłowym”).
export function szukajObjawow(fraza, maszyny = TECHNIKA.maszyny) {
  const slowa = normalizuj(fraza).trim().split(/\s+/).filter((s) => s.length >= 3)
  if (!slowa.length) return []
  const wynik = []
  for (const m of maszyny) {
    for (const d of m.diagnostyka || []) {
      const stog = normalizuj(
        [d.objaw, d.odczyt, ...(d.przyczyny || [])].join(' ')
      )
      if (slowa.every((s) => stog.includes(s))) {
        wynik.push({ maszyna: m, diagnoza: d })
      }
    }
  }
  return wynik
}
