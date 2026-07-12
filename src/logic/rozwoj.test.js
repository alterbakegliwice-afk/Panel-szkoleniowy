import { describe, it, expect } from 'vitest'
import {
  ROZWOJ,
  walidujWynikWp,
  naObszary,
  rekordProfilu,
  czyDuplikatProfilu,
  seriaTestow,
  postepRozwoju,
  obszarNauki,
  NARZEDZIA,
  sredniaDelta,
  podsumowanieZespolu
} from './rozwoj.js'

// Przykładowe rekordy w formacie zapisywanym przez repo alterbake-work-profile.
const PROFIL_PRACY = {
  typ: 'alterbake-wynik-work-profile',
  wersja: '2026-07-12',
  narzedzie: 'profil-pracy',
  data: '2026-07-01T10:00:00.000Z',
  osoba: { imie: 'Weronika', rola: 'Piekarz' },
  wyniki: {
    reliability: 80,
    pressure: 45,
    collaboration: 70,
    learning: 65,
    initiative: 30,
    integrity: 85,
    communication: 55,
    problemSolving: 60
  }
}

const MAPA = {
  typ: 'alterbake-wynik-work-profile',
  wersja: '2026-07-12',
  narzedzie: 'mapa-potencjalu',
  data: '2026-07-05T10:00:00.000Z',
  osoba: { imie: 'Weronika', rola: 'production' },
  wyniki: {
    precision: 4, standards: 2, empathy: 0, relations: 1,
    consistency: 3, structure: 2, curiosity: -1, flexibility: 0,
    independence: 2, initiative: -2, regulation: 1, resilience: 0,
    drive: 4, purpose: 2, influence: -1, communication: 1
  },
  charakter: { energia: -1, konflikt: 0.5 }
}

describe('dane rozwoju kompetencji', () => {
  it('ma 8 obszarów pokrywających kategorie Profilu Pracy 1:1', () => {
    const idki = ROZWOJ.obszary.map((o) => o.id).sort()
    expect(idki).toEqual(
      ['collaboration', 'communication', 'initiative', 'integrity',
        'learning', 'pressure', 'problemSolving', 'reliability'].sort()
    )
  })

  it('mapuje wszystkie 16 talentów Mapy Potencjału, każdy dokładnie raz', () => {
    const talenty = ROZWOJ.obszary.flatMap((o) => o.talenty)
    expect(talenty.length).toBe(16)
    expect(new Set(talenty).size).toBe(16)
  })

  it('każdy obszar ma materiał nauki: intro, karty ze źródłami i mikropraktyki', () => {
    for (const o of ROZWOJ.obszary) {
      expect(o.nauka.intro.length).toBeGreaterThan(40)
      expect(o.nauka.karty.length).toBeGreaterThanOrEqual(3)
      for (const k of o.nauka.karty) {
        expect(k.punkty.length).toBeGreaterThanOrEqual(3)
        expect(k.zrodlo.length).toBeGreaterThan(5)
      }
      // ostatnia karta = mikropraktyki do wdrożenia przed retestem
      expect(o.nauka.karty[o.nauka.karty.length - 1].tytul).toMatch(/Mikropraktyki/)
    }
  })
})

describe('walidacja wyniku Work Profile', () => {
  it('przepuszcza poprawne rekordy obu narzędzi', () => {
    expect(walidujWynikWp(PROFIL_PRACY)).toBe(null)
    expect(walidujWynikWp(MAPA)).toBe(null)
  })

  it('odrzuca zły typ, nieznane narzędzie i zepsute wyniki', () => {
    expect(walidujWynikWp(null)).toContain('Work Profile')
    expect(walidujWynikWp({ typ: 'cokolwiek' })).toContain('typ')
    expect(walidujWynikWp({ ...PROFIL_PRACY, narzedzie: 'obcy-test' })).toContain('Nieznane narzędzie')
    expect(walidujWynikWp({ ...PROFIL_PRACY, wyniki: {} })).toContain('pusty')
    expect(walidujWynikWp({ ...PROFIL_PRACY, wyniki: { reliability: 'duzo' } })).toContain('liczbami')
  })
})

describe('normalizacja do obszarów 0–100', () => {
  it('Profil Pracy przechodzi 1:1 (kategorie = obszary)', () => {
    const o = naObszary(PROFIL_PRACY)
    expect(o.reliability).toBe(80)
    expect(o.initiative).toBe(30)
    expect(Object.keys(o).length).toBe(8)
  })

  it('Mapa Potencjału: talent [-2..4] → procent, obszar = średnia talentów', () => {
    const o = naObszary(MAPA)
    // problemSolving = precision(4→100%) + structure(2→66.7%) → 83
    expect(o.problemSolving).toBe(83)
    // initiative = initiative(-2→0%) + independence(2→66.7%) → 33
    expect(o.initiative).toBe(33)
    // integrity = drive(4→100%) + purpose(2→66.7%) → 83
    expect(o.integrity).toBe(83)
    expect(Object.keys(o).length).toBe(8)
    for (const v of Object.values(o)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })
})

describe('import i duplikaty', () => {
  it('rekordProfilu buduje wpis panelu z obszarami', () => {
    const r = rekordProfilu(PROFIL_PRACY, 'P-01', '2026-07-12T08:00:00.000Z')
    expect(r.id_prac).toBe('P-01')
    expect(r.narzedzie).toBe('profil-pracy')
    expect(r.obszary.pressure).toBe(45)
    expect(r.data).toBe(PROFIL_PRACY.data)
  })

  it('wykrywa duplikat po dacie testu albo identycznych wynikach', () => {
    const profile = [rekordProfilu(PROFIL_PRACY, 'P-01', '2026-07-12')]
    expect(czyDuplikatProfilu(profile, 'P-01', PROFIL_PRACY)).toBe(true)
    // ta sama treść, inna data → nadal duplikat (identyczne wyniki)
    expect(czyDuplikatProfilu(profile, 'P-01', { ...PROFIL_PRACY, data: '2026-08-01' })).toBe(true)
    // inny pracownik → nie duplikat
    expect(czyDuplikatProfilu(profile, 'P-02', PROFIL_PRACY)).toBe(false)
    // realnie inne wyniki i data → nie duplikat
    const retest = {
      ...PROFIL_PRACY,
      data: '2026-09-01T10:00:00.000Z',
      wyniki: { ...PROFIL_PRACY.wyniki, initiative: 55 }
    }
    expect(czyDuplikatProfilu(profile, 'P-01', retest)).toBe(false)
  })
})

describe('retest = ewaluacja postępu w szkoleniu', () => {
  const t1 = rekordProfilu(PROFIL_PRACY, 'P-01', '2026-07-12')
  const retest = rekordProfilu(
    {
      ...PROFIL_PRACY,
      data: '2026-09-01T10:00:00.000Z',
      wyniki: { ...PROFIL_PRACY.wyniki, initiative: 55, pressure: 60, reliability: 78 }
    },
    'P-01',
    '2026-09-01'
  )
  const mapaInnegoNarzedzia = rekordProfilu(MAPA, 'P-01', '2026-07-12')

  it('pierwsze podejście: brak delty, są priorytety (najsłabsze obszary)', () => {
    const p = postepRozwoju([t1], 'P-01')
    expect(p.liczbaTestow).toBe(1)
    expect(p.poprzedni).toBe(null)
    expect(p.obszary.every((o) => o.delta === null)).toBe(true)
    expect(p.priorytety).toEqual(['initiative', 'pressure', 'communication'])
  })

  it('po reteście liczy deltę per obszar względem poprzedniego podejścia tego samego narzędzia', () => {
    const p = postepRozwoju([t1, mapaInnegoNarzedzia, retest], 'P-01')
    expect(p.ostatni.data).toBe('2026-09-01T10:00:00.000Z')
    // poprzednikiem jest t1 (profil-pracy), NIE mapa z 5 lipca
    expect(p.poprzedni.data).toBe(PROFIL_PRACY.data)
    const deltas = Object.fromEntries(p.obszary.map((o) => [o.id, o.delta]))
    expect(deltas.initiative).toBe(25)
    expect(deltas.pressure).toBe(15)
    expect(deltas.reliability).toBe(-2)
    expect(deltas.collaboration).toBe(0)
  })

  it('sortuje serię po dacie testu, nawet gdy log jest poza kolejnością', () => {
    const seria = seriaTestow([retest, t1, mapaInnegoNarzedzia], 'P-01')
    expect(seria.map((s) => s.data)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-05T10:00:00.000Z',
      '2026-09-01T10:00:00.000Z'
    ])
  })

  it('brak testów → null (zakładka pokazuje wtedy zaproszenie do testu)', () => {
    expect(postepRozwoju([], 'P-01')).toBe(null)
    expect(postepRozwoju([t1], 'P-02')).toBe(null)
  })
})

describe('podsumowanie zespołu (widok Mentora/Właściciela)', () => {
  const t1 = rekordProfilu(PROFIL_PRACY, 'P-01', '2026-07-12')
  const retest = rekordProfilu(
    {
      ...PROFIL_PRACY,
      data: '2026-09-01T10:00:00.000Z',
      wyniki: { ...PROFIL_PRACY.wyniki, initiative: 55, pressure: 60 }
    },
    'P-01',
    '2026-09-01'
  )
  const pracownicy = [
    { id_prac: 'P-01', imie: 'Weronika' },
    { id_prac: 'P-02', imie: 'Michał' }
  ]

  it('sredniaDelta liczy tylko obszary z deltą, null gdy pierwszego podejścia', () => {
    const pierwsze = postepRozwoju([t1], 'P-01')
    expect(sredniaDelta(pierwsze.obszary)).toBe(null)
    const poReteste = postepRozwoju([t1, retest], 'P-01')
    // delty: initiative +25, pressure +15, reszta 0 → (25+15)/8 = 5
    expect(sredniaDelta(poReteste.obszary)).toBe(5)
  })

  it('daje wiersz per pracownik, z postep=null gdy brak testów', () => {
    const wiersze = podsumowanieZespolu([t1, retest], pracownicy)
    expect(wiersze.length).toBe(2)
    expect(wiersze[0].postep.liczbaTestow).toBe(2)
    expect(wiersze[0].sredniaZmiana).toBe(5)
    expect(wiersze[1].postep).toBe(null)
    expect(wiersze[1].sredniaZmiana).toBe(null)
  })
})

describe('pomocnicze', () => {
  it('obszarNauki daje przestrzeń nazw w logu nauki', () => {
    expect(obszarNauki('communication')).toBe('ROZWOJ:communication')
  })

  it('narzędzia mają nazwy i adresy do wykonania testu', () => {
    for (const n of Object.values(NARZEDZIA)) {
      expect(n.nazwa.length).toBeGreaterThan(3)
      expect(n.url).toMatch(/^https:\/\//)
    }
  })
})
