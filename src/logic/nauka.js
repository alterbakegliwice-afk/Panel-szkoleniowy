// Warstwa NAUKI (merytoryka) + moduł Przedsiębiorcy.
// Zasada: najpierw materiał do nauki, DOPIERO potem sprawdzenie wiedzy.
import materialy from '../data/materialy_nauka.json'
import modulPrzedsiebiorcy from '../data/modul_przedsiebiorcy.json'
import { ostatnieWyniki, stanPytania } from './progress.js'

export const PRZEDSIEBIORCA = modulPrzedsiebiorcy
// Właściciel jako „uczeń" modułu przedsiębiorcy — osobne id, nie miesza się z zespołem.
export const ID_WLASCICIEL = 'WLASCICIEL'

export function materialTomu(tom) {
  return materialy.tomy[tom] || null
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

// Postęp w pojedynczym module (te same reguły co tomy — REGUŁA NIENARUSZALNA
// z progress.js: procent liczą WYŁĄCZNIE pytania ccp=false; pytania CCP mają
// osobną, binarną ścieżkę z progiem 100% i blokują status OPANOWANY).
export function postepModulu(modul, wyniki, idUcznia, prog = 0.8) {
  return postepModuluZOst(modul, ostatnieWyniki(wyniki), idUcznia, prog)
}

// Wariant z gotową mapą ostatnich wyników — ostatnieWyniki sortuje CAŁY log
// append-only, więc wołający z pętlą po modułach (postepPozycji, tabele
// zespołu) liczy mapę raz i podaje ją tutaj.
export function postepModuluZOst(modul, ost, idUcznia, prog = 0.8) {
  const zwykle = modul.pytania.filter((p) => !p.ccp)
  const ccp = modul.pytania.filter((p) => p.ccp)
  const zaliczonych = zwykle.filter((p) => stanPytania(ost, idUcznia, p.id) === true).length
  const procent = zwykle.length ? zaliczonych / zwykle.length : 0
  const ccpOk = ccp.every((p) => stanPytania(ost, idUcznia, p.id) === true)
  return {
    zaliczonych,
    pytan: zwykle.length,
    procent,
    ccpPytan: ccp.length,
    ccpOk,
    status: procent >= prog && ccpOk ? 'OPANOWANY' : 'W TOKU'
  }
}

// Ogólny postęp właściciela w całym module przedsiębiorcy.
export function postepPrzedsiebiorcy(wyniki, idUcznia, prog = 0.8) {
  const ost = ostatnieWyniki(wyniki)
  const moduly = PRZEDSIEBIORCA.moduly.map((m) => ({
    modul: m,
    postep: postepModuluZOst(m, ost, idUcznia, prog)
  }))
  const procent = moduly.length
    ? moduly.reduce((s, x) => s + x.postep.procent, 0) / moduly.length
    : 0
  return { moduly, procent }
}
