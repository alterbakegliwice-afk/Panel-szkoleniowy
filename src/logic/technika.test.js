import { describe, it, expect } from 'vitest'
import {
  TECHNIKA,
  maszynaTechniczna,
  pytaniaTechniki,
  postepTechniki,
  szukajObjawow,
  normalizuj
} from './technika.js'
import { walidujBank } from './store.js'

describe('dane modułu technicznego', () => {
  it('każda maszyna ma komplet sekcji: nauka, diagnostyka, konserwacja, pytania', () => {
    expect(TECHNIKA.maszyny.length).toBeGreaterThanOrEqual(6)
    for (const m of TECHNIKA.maszyny) {
      expect(m.id, m.id).toMatch(/^TECH-/)
      expect(m.nazwa).toBeTruthy()
      expect(m.nauka.intro).toBeTruthy()
      expect(m.nauka.karty.length).toBeGreaterThan(0)
      expect(m.diagnostyka.length).toBeGreaterThan(0)
      expect(m.konserwacja.length).toBeGreaterThan(0)
      expect(m.pytania.length).toBeGreaterThan(0)
    }
  })

  it('pytania techniczne przechodzą te same reguły co bank Panelu (walidujBank)', () => {
    expect(walidujBank({ pytania: pytaniaTechniki() })).toBeNull()
  })

  it('ID pytań są unikalne i nie kolidują z prefiksami banku (Z-/W-/D-)', () => {
    const idki = pytaniaTechniki().map((p) => p.id)
    expect(new Set(idki).size).toBe(idki.length)
    expect(idki.every((id) => id.startsWith('TECH-'))).toBe(true)
  })

  it('każde pytanie maszyny ma tom tej maszyny (quiz filtruje po tomie)', () => {
    for (const m of TECHNIKA.maszyny) {
      const tomy = new Set(m.pytania.map((p) => p.tom))
      expect(tomy.size, m.id).toBe(1)
    }
  })

  it('karty diagnostyczne mają objaw, odczyt, przyczyny i działania', () => {
    for (const m of TECHNIKA.maszyny) {
      for (const d of m.diagnostyka) {
        expect(d.objaw, m.id).toBeTruthy()
        expect(d.odczyt, m.id).toBeTruthy()
        expect(d.przyczyny.length, m.id + ': ' + d.objaw).toBeGreaterThan(0)
        expect(d.dzialania.length, m.id + ': ' + d.objaw).toBeGreaterThan(0)
        expect(['jakość', 'awaria', 'bezpieczeństwo']).toContain(d.ryzyko)
      }
    }
  })

  it('są pytania CCP (chłodnia/sonda) — bezpieczeństwo żywności liczone progiem 100%', () => {
    expect(pytaniaTechniki().some((p) => p.ccp === true)).toBe(true)
  })

  it('REGUŁA CCP: oblane pytanie ccp blokuje status OPANOWANY mimo progu zwykłych pytań', () => {
    // Asber ma 4 pytania, w tym 1 CCP (TECH-ASB-1). Zaliczamy wszystkie
    // poza CCP → zwykłe 100%, ale status musi zostać W TOKU (CCP osobno,
    // próg 100% — reguła nienaruszalna z progress.js).
    const asber = maszynaTechniczna('TECH-ASBER')
    const wyniki = asber.pytania.map((p) => ({
      data: '2026-07-14',
      id_prac: 'P-01',
      id_pytania: p.id,
      zaliczyl: !p.ccp,
      oceniajacy: 'auto',
      notatka: ''
    }))
    const postep = postepTechniki(wyniki, 'P-01')
    const wpis = postep.maszyny.find((x) => x.maszyna.id === 'TECH-ASBER')
    expect(wpis.postep.procent).toBe(1)
    expect(wpis.postep.ccpOk).toBe(false)
    expect(wpis.postep.status).toBe('W TOKU')

    // po zaliczeniu CCP (późniejszy wpis w logu) status się domyka
    const poprawka = [...wyniki, {
      data: '2026-07-15', id_prac: 'P-01',
      id_pytania: asber.pytania.find((p) => p.ccp).id,
      zaliczyl: true, oceniajacy: 'auto', notatka: ''
    }]
    const po = postepTechniki(poprawka, 'P-01').maszyny.find((x) => x.maszyna.id === 'TECH-ASBER')
    expect(po.postep.ccpOk).toBe(true)
    expect(po.postep.status).toBe('OPANOWANY')
  })

  it('dokumentacja producenta (gdy jest) ma tytuł i URL http(s)', () => {
    let zLinkami = 0
    for (const m of TECHNIKA.maszyny) {
      for (const d of m.dokumentacja || []) {
        expect(d.tytul, m.id).toBeTruthy()
        expect(d.url, m.id).toMatch(/^https?:\/\//)
        zLinkami++
      }
    }
    expect(zLinkami).toBeGreaterThan(0)
  })
})

describe('maszynaTechniczna', () => {
  it('znajduje maszynę po id, null dla nieznanego', () => {
    expect(maszynaTechniczna('TECH-IBIS').nazwa).toContain('IBIS')
    expect(maszynaTechniczna('TECH-NIE-MA')).toBeNull()
  })
})

describe('szukajObjawow — wyszukiwarka „co się dzieje?"', () => {
  it('znajduje objaw po fragmencie bez polskich znaków i wielkości liter', () => {
    const wyniki = szukajObjawow('BLADY SPOD')
    expect(wyniki.length).toBeGreaterThan(0)
    expect(wyniki[0].maszyna.id).toBe('TECH-IBIS')
    expect(wyniki[0].diagnoza.objaw).toMatch(/spód/i)
  })

  it('szuka też w odczycie i przyczynach (np. „kamień kotłowy")', () => {
    const wyniki = szukajObjawow('kamien kotlowy')
    expect(wyniki.some((w) => w.maszyna.id === 'TECH-IBIS')).toBe(true)
  })

  it('objaw z innej maszyny prowadzi do niej (masło → wałkownica/Bongard/gar)', () => {
    const maszyny = szukajObjawow('maslo').map((w) => w.maszyna.id)
    expect(maszyny).toContain('TECH-BONGARD')
  })

  it('fraza krótsza niż 3 znaki nie zwraca nic (szum)', () => {
    expect(szukajObjawow('pi')).toEqual([])
    expect(szukajObjawow('  ')).toEqual([])
  })

  it('normalizuj skleja diakrytykę do ASCII', () => {
    expect(normalizuj('Zażółć gęślą jaźń')).toBe('zazolc gesla jazn')
  })
})

describe('postepTechniki', () => {
  it('agreguje postęp per maszyna wg ostatnich wyników', () => {
    const idki = maszynaTechniczna('TECH-IBIS').pytania.map((p) => p.id)
    const wyniki = idki.map((id) => ({
      data: '2026-07-14', id_prac: 'P-01', id_pytania: id, zaliczyl: true, oceniajacy: 'auto', notatka: ''
    }))
    const postep = postepTechniki(wyniki, 'P-01')
    const ibis = postep.maszyny.find((x) => x.maszyna.id === 'TECH-IBIS')
    expect(ibis.postep.status).toBe('OPANOWANY')
    expect(ibis.postep.zaliczonych).toBe(idki.length)
    expect(postep.procent).toBeGreaterThan(0)
    expect(postep.procent).toBeLessThan(1)
  })

  it('bez wyników wszystko W TOKU, 0%', () => {
    const postep = postepTechniki([], 'P-01')
    expect(postep.procent).toBe(0)
    expect(postep.maszyny.every((x) => x.postep.status === 'W TOKU')).toBe(true)
  })
})
