import { describe, it, expect } from 'vitest'
import {
  DOMYSLNA_KONFIG,
  ostatnieWyniki,
  ccpStatusTomu,
  postepTomu,
  profilPracownika
} from './progress.js'
import { historiaPracownika, pozycjeDoPowtorki, podsumowaniePowtorek, INTERWALY_POWTOREK_DNI } from './progress.js'
import { eksportPanelM5 } from './export.js'
import { walidujBank, eksportKopii, walidujKopie, kopieDoStanu } from './store.js'
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

  it('eksport zawiera poziom docelowy i gotowość (cel_osiagniety)', () => {
    const pracownicy = [{ id_prac: 'P-01', imie: 'Weronika', rola: 'Pomocnik', poziom_docelowy: 'JUNIOR' }]
    const eksport = eksportPanelM5(PYTANIA, [], pracownicy, KONFIG, '2026-07-09T12:00:00Z')
    const p = eksport.pracownicy[0]
    expect(p.poziom_docelowy).toBe('JUNIOR')
    expect(p.cel_osiagniety).toBe(false)
    expect(p.ccp_ogolem).toBe('BRAK — BLOKADA') // CCP W-01/W-02 nietknięte
  })
})

describe('poziom docelowy — kryterium zależne od roli (schema: Pomocnik→JUNIOR)', () => {
  // JUNIOR non-ccp: II Zakwas Z-01/02/03, V DDT D-01/02; IV Wypiek JUNIOR = tylko CCP.
  // Komplet JUNIOR + CCP (W-01/W-02), bez poziomu SAMODZIELNY.
  const doJuniora = ['Z-01', 'Z-02', 'Z-03', 'D-01', 'D-02', 'W-01', 'W-02'].map((id) => wynik(id, true))

  it('Pomocnik (cel JUNIOR) po opanowaniu JUNIOR+CCP ma cel osiągnięty', () => {
    const prof = profilPracownika(PYTANIA, doJuniora, 'P-01', KONFIG, 'JUNIOR')
    expect(prof.cel.osiagniety).toBe(true)
    expect(prof.nastepnyKrok.typ).toBe('GOTOWE')
  })

  it('te same wyniki przy celu SAMODZIELNY = cel NIE osiągnięty (brak poziomu Samodzielny)', () => {
    const prof = profilPracownika(PYTANIA, doJuniora, 'P-01', KONFIG, 'SAMODZIELNY')
    expect(prof.cel.osiagniety).toBe(false)
    expect(prof.nastepnyKrok.typ).toBe('TOM')
  })

  it('brak CCP blokuje cel JUNIOR mimo opanowanego poziomu JUNIOR', () => {
    const bezCcp = ['Z-01', 'Z-02', 'Z-03', 'D-01', 'D-02'].map((id) => wynik(id, true))
    const prof = profilPracownika(PYTANIA, bezCcp, 'P-01', KONFIG, 'JUNIOR')
    expect(prof.cel.osiagniety).toBe(false)
    expect(prof.nastepnyKrok.typ).toBe('CCP')
  })
})

describe('log append-only — „ostatni" po znaczniku czasu, nie po kolejności w tablicy', () => {
  it('nowszy timestamp wygrywa nawet gdy jest wcześniej w tablicy', () => {
    const wyniki = [
      { data: '2026-07-06T12:00:00Z', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: true },
      { data: '2026-07-05T09:00:00Z', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: false }
    ]
    const ostatnie = ostatnieWyniki(wyniki)
    expect(ostatnie.get('P-01|Z-01').zaliczyl).toBe(true) // 06-07 > 05-07
  })
})

describe('walidujBank — twarda walidacja klucza odpowiedzi', () => {
  const baza = (extra) => ({
    pytania: [{ id: 'X-1', tom: 'T', poziom: 'JUNIOR', typ: 'jednokrotny', ccp: false, pytanie: '?', wzorzec: 'w', ...extra }]
  })
  it('realny seed pilota przechodzi walidację', () => {
    expect(walidujBank(seed)).toBe(null)
  })
  it('odrzuca „poprawne" wskazujące nieistniejącą opcję', () => {
    expect(walidujBank(baza({ opcje: ['a', 'b'], poprawne: [5] }))).toMatch(/nieistniejącą/)
  })
  it('odrzuca jednokrotny z dwiema poprawnymi', () => {
    expect(walidujBank(baza({ opcje: ['a', 'b', 'c'], poprawne: [0, 1] }))).toMatch(/dokładnie 1/)
  })
  it('odrzuca opcje bez klucza „poprawne"', () => {
    expect(walidujBank(baza({ opcje: ['a', 'b'] }))).toMatch(/poprawne/)
  })
  it('przyjmuje poprawny zestaw opcje+poprawne', () => {
    expect(walidujBank(baza({ opcje: ['a', 'b'], poprawne: [1] }))).toBe(null)
  })
})

describe('historia podejść (log append-only = dowód przy awansie)', () => {
  it('zwraca wpisy pracownika, wzbogacone i posortowane malejąco po dacie', () => {
    const wyniki = [
      { data: '2026-07-05T08:00:00Z', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: false, oceniajacy: 'auto' },
      { data: '2026-07-07T09:00:00Z', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: true, oceniajacy: 'auto' },
      { data: '2026-07-06T10:00:00Z', id_prac: 'P-02', id_pytania: 'W-01', zaliczyl: true, oceniajacy: 'Piotr' }
    ]
    const h = historiaPracownika(wyniki, PYTANIA, 'P-01')
    expect(h.length).toBe(2) // tylko P-01
    expect(h[0].data).toBe('2026-07-07T09:00:00Z') // najnowszy na górze
    expect(h[0].tom).toBe('II Zakwas') // wzbogacone o dane pytania
    expect(h[0].ccp).toBe(false)
  })

  it('nie wywala się na wyniku spoza aktualnego banku', () => {
    const h = historiaPracownika(
      [{ data: '2026-07-07', id_prac: 'P-01', id_pytania: 'STARE-99', zaliczyl: true }],
      PYTANIA,
      'P-01'
    )
    expect(h[0].pytanie).toMatch(/spoza aktualnego banku/)
  })
})

describe('kopia zapasowa — pełny round-trip stanu', () => {
  const stan = {
    konfig: { PROG_ZALICZENIA: 0.7 },
    pracownicy: [{ id_prac: 'P-01', imie: 'Ala', rola: 'Piekarz', poziom_docelowy: 'SAMODZIELNY' }],
    wyniki: [{ data: '2026-07-07', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: true, oceniajacy: 'auto' }],
    kolejka: [],
    bank: null
  }

  it('eksport → walidacja OK → odtworzony stan zachowuje wyniki i konfig', () => {
    const kopia = eksportKopii(stan)
    expect(walidujKopie(kopia)).toBe(null)
    const odtworzony = kopieDoStanu(kopia)
    expect(odtworzony.wyniki).toEqual(stan.wyniki)
    expect(odtworzony.konfig.PROG_ZALICZENIA).toBe(0.7)
    expect(odtworzony.pracownicy[0].imie).toBe('Ala')
  })

  it('odrzuca plik, który nie jest kopią Alterbake', () => {
    expect(walidujKopie({ foo: 'bar' })).toMatch(/nie jest plik/)
  })

  it('odrzuca kopię z niepoprawnym bankiem', () => {
    const kopia = eksportKopii({ ...stan, bank: { pytania: [{ id: 'X', tom: 'T', poziom: 'JUNIOR', typ: 'jednokrotny', ccp: false, pytanie: '?', wzorzec: 'w', opcje: ['a', 'b'], poprawne: [9] }] } })
    expect(walidujKopie(kopia)).toMatch(/Bank w kopii/)
  })
})

describe('spaced retrieval — rozłożone powtórki wiedzy', () => {
  const pytania = [
    { id: 'A1', tom: 'II Zakwas', poziom: 'JUNIOR', ccp: false, typ: 'jednokrotny', pytanie: 'A1?', opcje: ['x', 'y'], poprawne: [0] },
    { id: 'C1', tom: 'IV Wypiek', poziom: 'JUNIOR', ccp: true, typ: 'jednokrotny', pytanie: 'C1?', opcje: ['x', 'y'], poprawne: [0] },
    { id: 'O1', tom: 'II Zakwas', poziom: 'JUNIOR', ccp: false, typ: 'otwarty', pytanie: 'O1?' } // bez opcji → nie powtarzalne
  ]
  const w = (id, data, zaliczyl) => ({ data, id_prac: 'P-01', id_pytania: id, zaliczyl, oceniajacy: 'auto', notatka: '' })
  const TERAZ = '2026-07-01T00:00:00.000Z'

  it('pozycja zaliczona świeżo NIE jest jeszcze do powtórki (przed odstępem)', () => {
    const wyniki = [w('A1', '2026-06-28T00:00:00.000Z', true)] // 3 dni temu, interwał 7
    expect(pozycjeDoPowtorki(pytania, wyniki, 'P-01', TERAZ)).toEqual([])
  })

  it('pozycja zaliczona dawniej niż odstęp serii wraca do powtórki', () => {
    const wyniki = [w('A1', '2026-06-20T00:00:00.000Z', true)] // 11 dni temu > 7 (seria 1)
    const due = pozycjeDoPowtorki(pytania, wyniki, 'P-01', TERAZ)
    expect(due.map((d) => d.id)).toEqual(['A1'])
    expect(due[0].seria).toBe(1)
  })

  it('rozszerzający harmonogram: 2 zaliczenia z rzędu → dłuższy odstęp (30 dni)', () => {
    const wyniki = [w('A1', '2026-05-01T00:00:00.000Z', true), w('A1', '2026-06-15T00:00:00.000Z', true)]
    // 16 dni od ostatniego, seria 2 → interwał 30 → jeszcze nie
    expect(pozycjeDoPowtorki(pytania, wyniki, 'P-01', TERAZ)).toEqual([])
    // ale 40 dni od ostatniego → tak
    const pozniej = pozycjeDoPowtorki(pytania, wyniki, 'P-01', '2026-07-25T00:00:00.000Z')
    expect(pozniej.map((d) => d.id)).toEqual(['A1'])
    expect(pozniej[0].seria).toBe(2)
  })

  it('oblanie kasuje serię — ostatni wpis niezaliczony nie idzie do powtórki (to nauka)', () => {
    const wyniki = [w('A1', '2026-01-01T00:00:00.000Z', true), w('A1', '2026-06-01T00:00:00.000Z', false)]
    expect(pozycjeDoPowtorki(pytania, wyniki, 'P-01', TERAZ)).toEqual([])
  })

  it('CCP pierwsze na liście (bezpieczeństwo najważniejsze)', () => {
    const wyniki = [w('A1', '2026-01-01T00:00:00.000Z', true), w('C1', '2026-01-01T00:00:00.000Z', true)]
    const due = pozycjeDoPowtorki(pytania, wyniki, 'P-01', TERAZ)
    expect(due[0].id).toBe('C1')
    expect(due[0].ccp).toBe(true)
  })

  it('pytania bez opcji (otwarte/praktyczne) nie wchodzą do powtórek', () => {
    const wyniki = [w('O1', '2026-01-01T00:00:00.000Z', true)]
    expect(pozycjeDoPowtorki(pytania, wyniki, 'P-01', TERAZ)).toEqual([])
  })

  it('podsumowaniePowtorek liczy pozycje i CCP', () => {
    const wyniki = [w('A1', '2026-01-01T00:00:00.000Z', true), w('C1', '2026-01-01T00:00:00.000Z', true)]
    const pod = podsumowaniePowtorek(pytania, wyniki, 'P-01', TERAZ)
    expect(pod.liczba).toBe(2)
    expect(pod.ccp).toBe(1)
    expect(INTERWALY_POWTOREK_DNI[0]).toBe(7)
  })
})
