import { describe, it, expect } from 'vitest'
import {
  SPRZATANIE,
  strefaSprzatania,
  pytaniaSprzatania,
  postepSprzatania,
  szukajProblemow
} from './sprzatanie.js'
import { pytaniaTechniki } from './technika.js'
import { walidujBank } from './store.js'

describe('dane modułu sprzątania', () => {
  it('każda strefa ma komplet sekcji: nauka, diagnostyka, rytm, pytania', () => {
    expect(SPRZATANIE.strefy.length).toBeGreaterThanOrEqual(6)
    for (const s of SPRZATANIE.strefy) {
      expect(s.id, s.id).toMatch(/^SPRZ-/)
      expect(s.nazwa).toBeTruthy()
      expect(s.nauka.intro).toBeTruthy()
      expect(s.nauka.karty.length).toBeGreaterThan(0)
      expect(s.diagnostyka.length).toBeGreaterThan(0)
      expect(s.konserwacja.length).toBeGreaterThan(0)
      expect(s.pytania.length).toBeGreaterThan(0)
    }
  })

  it('pytania przechodzą reguły banku Panelu (walidujBank)', () => {
    expect(walidujBank({ pytania: pytaniaSprzatania() })).toBeNull()
  })

  it('ID pytań unikalne, z prefiksem SPRZ-, bez kolizji z Techniką', () => {
    const idki = pytaniaSprzatania().map((p) => p.id)
    expect(new Set(idki).size).toBe(idki.length)
    expect(idki.every((id) => id.startsWith('SPRZ-'))).toBe(true)
    const techniczne = new Set(pytaniaTechniki().map((p) => p.id))
    expect(idki.some((id) => techniczne.has(id))).toBe(false)
  })

  it('każde pytanie strefy ma tom tej strefy (quiz filtruje po tomie)', () => {
    for (const s of SPRZATANIE.strefy) {
      expect(new Set(s.pytania.map((p) => p.tom)).size, s.id).toBe(1)
    }
  })

  it('karty problemów mają objaw, odczyt, przyczyny, działania i znane ryzyko', () => {
    for (const s of SPRZATANIE.strefy) {
      for (const d of s.diagnostyka) {
        expect(d.objaw, s.id).toBeTruthy()
        expect(d.odczyt, s.id).toBeTruthy()
        expect(d.przyczyny.length, s.id + ': ' + d.objaw).toBeGreaterThan(0)
        expect(d.dzialania.length, s.id + ': ' + d.objaw).toBeGreaterThan(0)
        expect(['jakość', 'awaria', 'bezpieczeństwo']).toContain(d.ryzyko)
      }
    }
  })

  it('jest pytanie CCP (mycie chłodni a CCP4)', () => {
    expect(pytaniaSprzatania().some((p) => p.ccp === true)).toBe(true)
  })
})

describe('strefaSprzatania', () => {
  it('znajduje strefę po id, null dla nieznanej', () => {
    expect(strefaSprzatania('SPRZ-METODA').nazwa).toContain('chemia')
    expect(strefaSprzatania('SPRZ-NIE-MA')).toBeNull()
  })
})

describe('szukajProblemow', () => {
  it('znajduje problem po fragmencie bez diakrytyki („plesn" → strefy wilgotne)', () => {
    const wyniki = szukajProblemow('plesn')
    expect(wyniki.length).toBeGreaterThan(0)
    expect(wyniki.some((w) => w.maszyna.id === 'SPRZ-WILGOC')).toBe(true)
  })

  it('szuka w odczycie i przyczynach („maka klej" → posadzka myta na mokro)', () => {
    const wyniki = szukajProblemow('maka klej')
    expect(wyniki.some((w) => w.maszyna.id === 'SPRZ-POSADZKI')).toBe(true)
  })

  it('krótka fraza nie zwraca nic', () => {
    expect(szukajProblemow('pl')).toEqual([])
  })
})

describe('postepSprzatania', () => {
  it('agreguje postęp per strefa', () => {
    const idki = strefaSprzatania('SPRZ-METODA').pytania.map((p) => p.id)
    const wyniki = idki.map((id) => ({
      data: '2026-07-14', id_prac: 'P-01', id_pytania: id, zaliczyl: true, oceniajacy: 'auto', notatka: ''
    }))
    const postep = postepSprzatania(wyniki, 'P-01')
    const metoda = postep.maszyny.find((x) => x.maszyna.id === 'SPRZ-METODA')
    expect(metoda.postep.status).toBe('OPANOWANY')
    expect(postep.procent).toBeGreaterThan(0)
    expect(postep.procent).toBeLessThan(1)
  })
})
