import { describe, it, expect } from 'vitest'
import {
  DOMYSLNA_KONFIG,
  ostatnieWyniki,
  ccpStatusTomu,
  postepTomu,
  profilPracownika
} from './progress.js'
import { eksportPanelM5 } from './export.js'
import seed from '../data/bank_pytan_seed.json'

const KONFIG = DOMYSLNA_KONFIG
const PYTANIA = seed.pytania

function wynik(idPytania, zaliczyl) {
  return { data: '2026-07-06T10:00:00Z', id_prac: 'P-01', id_pytania: idPytania, zaliczyl, oceniajacy: 'test' }
}

// Pytania tomu IV Wypiek w seedzie: W-01 (ccp), W-02 (ccp), W-03, W-04, W-05 (nie-ccp)
const NIE_CCP_WYPIEK = ['W-03', 'W-04', 'W-05']

describe('REGUŁA CCP — nienaruszalna (AI_BATON §4)', () => {
  it('oblane jedno CCP blokuje status mimo 100% wyniku ogólnego (CCP nie uśrednia się)', () => {
    // wszystkie nie-CCP zaliczone, W-01 (CCP1 ≥92°C) oblane
    const wyniki = [
      ...NIE_CCP_WYPIEK.map((id) => wynik(id, true)),
      wynik('W-01', false),
      wynik('W-02', true)
    ]
    const ostatnie = ostatnieWyniki(wyniki)
    const t = postepTomu(PYTANIA, ostatnie, 'P-01', 'IV Wypiek', KONFIG)
    expect(t.procent).toBe(1) // procent ogólny NIE zawiera CCP…
    expect(t.status).toBe('OPANOWANY')
    expect(t.ccp.status).toBe('BRAK') // …a CCP osobno = BRAK
    expect(t.awansSamodzielny).toBe(false) // i blokuje awans
  })

  it('CCP wymaga 100% — jedno z dwóch zaliczone to wciąż BRAK', () => {
    const ostatnie = ostatnieWyniki([wynik('W-01', true)])
    const ccp = ccpStatusTomu(PYTANIA, ostatnie, 'P-01', 'IV Wypiek')
    expect(ccp.status).toBe('BRAK')
  })

  it('brak podejścia do CCP = BRAK (nie zakładamy zaliczenia)', () => {
    const ccp = ccpStatusTomu(PYTANIA, ostatnieWyniki([]), 'P-01', 'IV Wypiek')
    expect(ccp.status).toBe('BRAK')
    expect(ccp.pytania.map((p) => p.stan)).toEqual([null, null])
  })

  it('komplet CCP zaliczony = OK', () => {
    const ostatnie = ostatnieWyniki([wynik('W-01', true), wynik('W-02', true)])
    expect(ccpStatusTomu(PYTANIA, ostatnie, 'P-01', 'IV Wypiek').status).toBe('OK')
  })

  it('tom bez pytań CCP (II Zakwas) = OK, nie blokuje', () => {
    expect(ccpStatusTomu(PYTANIA, ostatnieWyniki([]), 'P-01', 'II Zakwas').status).toBe('OK')
  })

  it('CCP nie podnosi procentu ogólnego — zaliczone CCP przy zerze nie-CCP to nadal 0%', () => {
    const ostatnie = ostatnieWyniki([wynik('W-01', true), wynik('W-02', true)])
    const t = postepTomu(PYTANIA, ostatnie, 'P-01', 'IV Wypiek', KONFIG)
    expect(t.procent).toBe(0)
    expect(t.ccp.status).toBe('OK')
  })
})

describe('log append-only — ostatni wynik wygrywa', () => {
  it('oblanie potem zaliczenie = zaliczone; zaliczenie potem oblanie = niezaliczone', () => {
    const ostatnie = ostatnieWyniki([wynik('Z-01', false), wynik('Z-01', true), wynik('Z-02', true), wynik('Z-02', false)])
    const t = postepTomu(PYTANIA, ostatnie, 'P-01', 'II Zakwas', KONFIG)
    expect(t.zaliczonych).toBe(1) // tylko Z-01
  })
})

describe('progi i awans (spec.md §4)', () => {
  it('próg 0.8 jest domknięty: dokładnie 80% = OPANOWANY', () => {
    // II Zakwas ma 6 pytań nie-CCP; 5/6 ≈ 0.83 ≥ 0.8
    const wyniki = ['Z-01', 'Z-02', 'Z-03', 'Z-04', 'Z-05'].map((id) => wynik(id, true))
    const t = postepTomu(PYTANIA, ostatnieWyniki(wyniki), 'P-01', 'II Zakwas', KONFIG)
    expect(t.status).toBe('OPANOWANY')
    // a 4/6 ≈ 0.67 < 0.8
    const t2 = postepTomu(PYTANIA, ostatnieWyniki(wyniki.slice(0, 4)), 'P-01', 'II Zakwas', KONFIG)
    expect(t2.status).toBe('W TOKU')
  })

  it('awans na Samodzielnego wymaga JUNIOR≥próg AND SAMODZIELNY≥próg AND ccp=OK', () => {
    // V DDT: JUNIOR = D-01, D-02; SAMODZIELNY = D-03, D-04; brak CCP
    const tylkoJunior = ['D-01', 'D-02'].map((id) => wynik(id, true))
    expect(postepTomu(PYTANIA, ostatnieWyniki(tylkoJunior), 'P-01', 'V DDT', KONFIG).awansSamodzielny).toBe(false)
    const oba = [...tylkoJunior, wynik('D-03', true), wynik('D-04', true)]
    expect(postepTomu(PYTANIA, ostatnieWyniki(oba), 'P-01', 'V DDT', KONFIG).awansSamodzielny).toBe(true)
  })

  it('poziom ogólny = średnia procentów tomów (bez CCP), a samodzielnyMozliwy wymaga CCP wszędzie', () => {
    // komplet nie-CCP we wszystkich tomach, CCP nietknięte
    const nieCcp = PYTANIA.filter((p) => !p.ccp).map((p) => wynik(p.id, true))
    const prof = profilPracownika(PYTANIA, nieCcp, 'P-01', KONFIG)
    expect(prof.poziomOgolny).toBe(1)
    expect(prof.ccpOk).toBe(false)
    expect(prof.samodzielnyMozliwy).toBe(false)
    expect(prof.nastepnyKrok.typ).toBe('CCP') // CCP ma pierwszeństwo w „następnym kroku"
  })
})

describe('eksport do Panelu M5 (schema.md)', () => {
  it('struktura zgodna ze schematem, ccp_status osobno od procentu', () => {
    const pracownicy = [{ id_prac: 'P-01', imie: 'Weronika', rola: 'Piekarz' }]
    const wyniki = [...NIE_CCP_WYPIEK.map((id) => wynik(id, true)), wynik('W-01', false)]
    const eksport = eksportPanelM5(PYTANIA, wyniki, pracownicy, KONFIG, '2026-07-09T12:00:00Z')
    expect(eksport.wygenerowano).toBe('2026-07-09T12:00:00Z')
    const p = eksport.pracownicy[0]
    expect(p.id_prac).toBe('P-01')
    expect(typeof p.poziom_ogolny_proc).toBe('number')
    const wypiek = p.tomy.find((t) => t.tom === 'IV Wypiek')
    expect(wypiek.procent).toBe(1)
    expect(wypiek.status).toBe('OPANOWANY')
    expect(wypiek.ccp_status).toBe('BRAK — BLOKADA') // nie uśrednione, jawnie osobno
    const zakwas = p.tomy.find((t) => t.tom === 'II Zakwas')
    expect(zakwas.ccp_status).toBe('OK')
  })
})
