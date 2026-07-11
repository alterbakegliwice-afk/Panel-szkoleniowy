// Eksport do Panelu Piekarni M5 — format ze schema.md.
// Tylko plik (JSON) — NIE integracja live (Panel nie ma jeszcze buildu, spec.md §7).
import { profilPracownika } from './progress.js'

const WERSJA_FORMATU = '2026-07-06'

function zaokr(x) {
  return Math.round(x * 10000) / 10000
}

export function eksportPanelM5(pytania, wyniki, pracownicy, konfig, wygenerowano, praktyka = []) {
  return {
    wersja: WERSJA_FORMATU,
    wygenerowano,
    pracownicy: pracownicy.map((prac) => {
      const prof = profilPracownika(pytania, wyniki, prac.id_prac, konfig, prac.poziom_docelowy, praktyka)
      return {
        id_prac: prac.id_prac,
        imie: prac.imie,
        rola: prac.rola,
        poziom_docelowy: prac.poziom_docelowy || null,
        poziom_ogolny_proc: zaokr(prof.poziomOgolny),
        cel_osiagniety: prof.cel.osiagniety, // czy pracownik spełnia kryteria swojego poziomu docelowego
        ccp_ogolem: prof.ccpOk ? 'OK' : 'BRAK — BLOKADA',
        praktyka_wymagana: prof.praktykaWymagana,
        praktyka_ogolem: !prof.praktykaWymagana ? 'NIE DOTYCZY' : prof.praktykaOk ? 'OK' : 'BRAK',
        tomy: prof.tomy.map((t) => ({
          tom: t.tom,
          procent: zaokr(t.procent),
          status: t.status,
          ccp_status: t.ccp.status === 'OK' ? 'OK' : 'BRAK — BLOKADA',
          praktyka: t.praktyka.potwierdzona ? 'OK' : '—'
        }))
      }
    })
  }
}
