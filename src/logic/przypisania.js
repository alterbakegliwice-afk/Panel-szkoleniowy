// ADOPCJA (blind spot: użycie) — przydział nauki z terminem + widok „kto nie zaczął".
// Bez nudge'a platforma szkoleniowa ląduje na półce. Log jest append-only: najnowszy wpis
// per (id_prac, tom) wygrywa; wpis z usuniete:true kasuje przydział.

export function aktywnePrzypisania(przypisania, idPrac = null) {
  const mapa = new Map()
  for (const p of przypisania || []) {
    if (idPrac && p.id_prac !== idPrac) continue
    const klucz = p.id_prac + '|' + p.tom
    const poprz = mapa.get(klucz)
    if (!poprz || (p.utworzono || '') >= (poprz.utworzono || '')) mapa.set(klucz, p)
  }
  return [...mapa.values()].filter((p) => !p.usuniete)
}

// Zbiór tomów, w których pracownik ma jakikolwiek wynik (do wykrycia „zaczął").
export function tomyZWynikamiPracownika(wyniki, pytania, idPrac) {
  const mapaP = new Map(pytania.map((p) => [p.id, p.tom]))
  const zbior = new Set()
  for (const w of wyniki || []) {
    if (w.id_prac !== idPrac) continue
    const tom = mapaP.get(w.id_pytania)
    if (tom) zbior.add(tom)
  }
  return zbior
}

// Czy pracownik ZACZĄŁ tom: przerobił materiał albo ma jakikolwiek wynik z tego tomu.
export function czyZaczal(nauka, tomyZWynikami, idPrac, tom) {
  const uczyl = (nauka || []).some((n) => n.id_prac === idPrac && n.obszar === tom)
  return uczyl || (tomyZWynikami || new Set()).has(tom)
}

// Czy termin już minął (po dacie ISO YYYY-MM-DD). teraz = ISO string „teraźniejszości".
export function poTerminie(termin, teraz) {
  if (!termin) return false
  return termin < (teraz || '').slice(0, 10)
}
