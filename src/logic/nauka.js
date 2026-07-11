// Warstwa NAUKI (merytoryka) + moduł Przedsiębiorcy.
// Zasada: najpierw materiał do nauki, DOPIERO potem sprawdzenie wiedzy.
import materialy from '../data/materialy_nauka.json'
import modulPrzedsiebiorcy from '../data/modul_przedsiebiorcy.json'
import draftyTomow from '../data/drafty_tomow.json'
import { ostatnieWyniki, stanPytania } from './progress.js'

export const PRZEDSIEBIORCA = modulPrzedsiebiorcy
// Właściciel jako „uczeń" modułu przedsiębiorcy — osobne id, nie miesza się z zespołem.
export const ID_WLASCICIEL = 'WLASCICIEL'

// Drafty tomów (z dokumentów Złotego Standardu) — nieaktywne do zatwierdzenia przez właściciela.
export const DRAFTY = draftyTomow.tomy

// Materiał do nauki: najpierw zwalidowany pilot, potem drafty (dostępne dopiero
// gdy tom jest zatwierdzony — bo tylko wtedy trafia do banku i listy pracownika).
export function materialTomu(tom) {
  if (materialy.tomy[tom]) return materialy.tomy[tom]
  const d = DRAFTY.find((x) => x.tom === tom)
  return d ? d.nauka : null
}

// Pytania z zatwierdzonych draftów — doklejane do banku bazowego.
export function pytaniaZatwierdzone(zatwierdzone) {
  const zbior = new Set(zatwierdzone || [])
  return DRAFTY.filter((d) => zbior.has(d.tom)).flatMap((d) => d.pytania)
}

export function czyTomZatwierdzony(zatwierdzone, tom) {
  return (zatwierdzone || []).includes(tom)
}

export function programNauki() {
  return materialy.program
}

// Płaska lista pytań modułu przedsiębiorcy (każdy moduł = osobny „tom").
export function pytaniaPrzedsiebiorcy() {
  return PRZEDSIEBIORCA.moduly.flatMap((m) => m.pytania)
}

// Czy dany uczeń przerobił materiał danego obszaru (tom lub moduł).
export function czyPrzerobiono(nauka, idUcznia, obszar) {
  return (nauka || []).some((n) => n.id_prac === idUcznia && n.obszar === obszar)
}

// Postęp w pojedynczym module przedsiębiorcy (te same reguły co tomy: próg domyślny 0,8).
export function postepModulu(modul, wyniki, idUcznia, prog = 0.8) {
  const ost = ostatnieWyniki(wyniki)
  const zestaw = modul.pytania
  const zaliczonych = zestaw.filter((p) => stanPytania(ost, idUcznia, p.id) === true).length
  const procent = zestaw.length ? zaliczonych / zestaw.length : 0
  return {
    zaliczonych,
    pytan: zestaw.length,
    procent,
    status: procent >= prog ? 'OPANOWANY' : 'W TOKU'
  }
}

// Ogólny postęp właściciela w całym module przedsiębiorcy.
export function postepPrzedsiebiorcy(wyniki, idUcznia, prog = 0.8) {
  const moduly = PRZEDSIEBIORCA.moduly.map((m) => ({
    modul: m,
    postep: postepModulu(m, wyniki, idUcznia, prog)
  }))
  const procent = moduly.length
    ? moduly.reduce((s, x) => s + x.postep.procent, 0) / moduly.length
    : 0
  return { moduly, procent }
}
