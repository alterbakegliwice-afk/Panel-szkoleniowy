// Warstwa modułu SPRZĄTANIE (higiena produkcji): strefy z nauką („jak
// sprzątać skutecznie i wydajnie”), kartami problemów (objaw → przyczyny →
// działania) i rytmem sprzątania. Analogiczna do Techniki — wspólny silnik
// w panelPraktyczny.js; karty problemów dostępne zawsze, quiz po nauce.
import modulSprzatania from '../data/modul_sprzatanie.json'
import { szukajObjawow, postepPozycji } from './panelPraktyczny.js'

export const SPRZATANIE = modulSprzatania

export function strefaSprzatania(id) {
  return SPRZATANIE.strefy.find((s) => s.id === id) || null
}

// Płaska lista pytań higienicznych (do walidacji i statystyk).
export function pytaniaSprzatania() {
  return SPRZATANIE.strefy.flatMap((s) => s.pytania)
}

// Postęp ucznia per strefa + zbiorczy (te same reguły co tomy: próg 0,8).
export function postepSprzatania(wyniki, idUcznia, prog = 0.8) {
  return postepPozycji(SPRZATANIE.strefy, wyniki, idUcznia, prog)
}

export function szukajProblemow(fraza) {
  return szukajObjawow(fraza, SPRZATANIE.strefy)
}
