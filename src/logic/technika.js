// Warstwa PANELU TECHNICZNEGO: park maszynowy (piece IBIS/Bongard, chłód,
// fermentacja, pomiar). Ta sama zasada co nauka.js: najpierw materiał
// („jak maszyna działa i jak czyta się jej zachowanie”), potem sprawdzenie.
// Diagnostyka objawów jest dostępna ZAWSZE (bez blokady nauki) — na hali
// objaw nie czeka, aż ktoś skończy quiz.
// Silnik (wyszukiwarka, postęp) wspólny z modułem Sprzątania: panelPraktyczny.js.
import modulTechniczny from '../data/modul_techniczny.json'
import {
  normalizuj,
  szukajObjawow as szukajWPozycjach,
  postepPozycji
} from './panelPraktyczny.js'

export { normalizuj }

export const TECHNIKA = modulTechniczny

export function maszynaTechniczna(id) {
  return TECHNIKA.maszyny.find((m) => m.id === id) || null
}

// Płaska lista pytań technicznych (do walidacji i statystyk).
export function pytaniaTechniki() {
  return TECHNIKA.maszyny.flatMap((m) => m.pytania)
}

// Postęp ucznia per maszyna + zbiorczy (te same reguły co tomy: próg 0,8).
export function postepTechniki(wyniki, idUcznia, prog = 0.8) {
  return postepPozycji(TECHNIKA.maszyny, wyniki, idUcznia, prog)
}

export function szukajObjawow(fraza, maszyny = TECHNIKA.maszyny) {
  return szukajWPozycjach(fraza, maszyny)
}
