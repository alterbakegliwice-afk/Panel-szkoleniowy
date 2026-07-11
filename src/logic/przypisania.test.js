import { describe, it, expect } from 'vitest'
import { aktywnePrzypisania, tomyZWynikamiPracownika, czyZaczal, poTerminie } from './przypisania.js'

describe('przypisania — adopcja', () => {
  it('aktywnePrzypisania: najnowszy per (prac,tom) wygrywa, usuniete znika', () => {
    const log = [
      { id_prac: 'P-01', tom: 'II Zakwas', termin: '2026-07-20', utworzono: '2026-07-01' },
      { id_prac: 'P-01', tom: 'II Zakwas', termin: '2026-07-25', utworzono: '2026-07-05' },
      { id_prac: 'P-02', tom: 'IV Wypiek', termin: '2026-07-30', utworzono: '2026-07-02' },
      { id_prac: 'P-02', tom: 'IV Wypiek', usuniete: true, utworzono: '2026-07-06' }
    ]
    const p01 = aktywnePrzypisania(log, 'P-01')
    expect(p01.length).toBe(1)
    expect(p01[0].termin).toBe('2026-07-25') // nowszy
    expect(aktywnePrzypisania(log, 'P-02').length).toBe(0) // skasowane
    expect(aktywnePrzypisania(log).length).toBe(1) // globalnie: tylko P-01
  })

  it('czyZaczal: nauka LUB wynik z tomu = zaczął', () => {
    const pytania = [{ id: 'Z-01', tom: 'II Zakwas' }]
    const zWynikami = tomyZWynikamiPracownika(
      [{ id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: false }],
      pytania,
      'P-01'
    )
    expect(czyZaczal([], zWynikami, 'P-01', 'II Zakwas')).toBe(true)
    expect(czyZaczal([{ id_prac: 'P-02', obszar: 'IV Wypiek' }], new Set(), 'P-02', 'IV Wypiek')).toBe(true)
    expect(czyZaczal([], new Set(), 'P-03', 'V DDT')).toBe(false)
  })

  it('poTerminie: porównuje datę dzienną', () => {
    expect(poTerminie('2026-07-10', '2026-07-11T08:00:00Z')).toBe(true)
    expect(poTerminie('2026-07-20', '2026-07-11T08:00:00Z')).toBe(false)
    expect(poTerminie('', '2026-07-11')).toBe(false)
  })
})
