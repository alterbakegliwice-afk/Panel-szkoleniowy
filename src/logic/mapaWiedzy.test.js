import { describe, it, expect } from 'vitest'
import { glownaAkcja, budujMapeWiedzy, skrocEtykiete } from './mapaWiedzy.js'
import { profilPracownika, nastepnyKrok, DOMYSLNA_KONFIG } from './progress.js'
import { rekordProfilu } from './rozwoj.js'
import seed from '../data/bank_pytan_seed.json'

const PYTANIA = seed.pytania
const w = (id, zaliczyl, data = '2026-07-06T10:00:00Z') =>
  ({ data, id_prac: 'P-01', id_pytania: id, zaliczyl, oceniajacy: 'test' })

describe('nastepnyKrok — pole `tom` (cel akcji dla pulpitu)', () => {
  it('typ CCP wskazuje pierwszy tom z brakiem', () => {
    const prof = profilPracownika(PYTANIA, [], 'P-01', DOMYSLNA_KONFIG)
    expect(prof.nastepnyKrok.typ).toBe('CCP')
    expect(prof.nastepnyKrok.tom).toBe('IV Wypiek') // jedyny tom seeda z CCP
  })

  it('typ TOM wskazuje tom do podciągnięcia', () => {
    // CCP komplet, JUNIOR nieopanowany → TOM z konkretnym tomem
    const wyniki = [w('W-01', true), w('W-02', true)]
    const prof = profilPracownika(PYTANIA, wyniki, 'P-01', DOMYSLNA_KONFIG)
    expect(prof.nastepnyKrok.typ).toBe('TOM')
    expect(typeof prof.nastepnyKrok.tom).toBe('string')
    expect(prof.tomy.some((t) => t.tom === prof.nastepnyKrok.tom)).toBe(true)
  })
})

describe('glownaAkcja — jedna rekomendacja, twardy priorytet', () => {
  const brakPowtorek = { liczba: 0, ccp: 0, pozycje: [] }

  it('CCP-blokada wygrywa ze wszystkim (czerwona, z celem)', () => {
    const prof = profilPracownika(PYTANIA, [], 'P-01', DOMYSLNA_KONFIG)
    const a = glownaAkcja(prof, { liczba: 5, ccp: 2, pozycje: [] })
    expect(a.typ).toBe('CCP')
    expect(a.stan).toBe('blok')
    expect(a.akcja).toEqual({ typ: 'tom', tom: 'IV Wypiek' })
    expect(a.przycisk).toContain('IV Wypiek')
  })

  it('bez blokady CCP: zaległe powtórki CCP przed zwykłymi', () => {
    const wyniki = [w('W-01', true), w('W-02', true)]
    const prof = profilPracownika(PYTANIA, wyniki, 'P-01', DOMYSLNA_KONFIG)
    expect(glownaAkcja(prof, { liczba: 3, ccp: 1, pozycje: [] }).typ).toBe('POWTORKA_CCP')
    expect(glownaAkcja(prof, { liczba: 3, ccp: 0, pozycje: [] }).typ).toBe('POWTORKA')
    expect(glownaAkcja(prof, { liczba: 3, ccp: 0, pozycje: [] }).akcja.typ).toBe('powtorka')
  })

  it('bez powtórek: kontynuacja tomu z nastepnyKrok', () => {
    const wyniki = [w('W-01', true), w('W-02', true)]
    const prof = profilPracownika(PYTANIA, wyniki, 'P-01', DOMYSLNA_KONFIG)
    const a = glownaAkcja(prof, brakPowtorek)
    expect(a.typ).toBe('TOM')
    expect(a.akcja.typ).toBe('tom')
    expect(a.akcja.tom).toBe(prof.nastepnyKrok.tom)
  })

  it('wszystko zrobione (cel JUNIOR): stan ok, bez przycisku', () => {
    const wyniki = ['Z-01', 'Z-02', 'Z-03', 'D-01', 'D-02', 'W-01', 'W-02'].map((id) => w(id, true))
    const prof = profilPracownika(PYTANIA, wyniki, 'P-01', DOMYSLNA_KONFIG, 'JUNIOR')
    const a = glownaAkcja(prof, brakPowtorek)
    expect(a.typ).toBe('GOTOWE')
    expect(a.stan).toBe('ok')
    expect(a.przycisk).toBe(null)
  })
})

describe('budujMapeWiedzy — cały krajobraz nauki jako powiązane węzły', () => {
  const prof = profilPracownika(PYTANIA, [], 'P-01', DOMYSLNA_KONFIG)

  it('zawiera wszystkie tomy banku + Technikę + Sprzątanie + Rozwój', () => {
    const mapa = budujMapeWiedzy({ prof, wyniki: [], idPrac: 'P-01', profile: [] })
    const idki = mapa.wezly.map((n) => n.id)
    for (const t of prof.tomy) expect(idki).toContain('tom:' + t.tom)
    expect(idki).toContain('technika')
    expect(idki).toContain('sprzatanie')
    expect(idki).toContain('rozwoj')
    expect(mapa.centrum.procent).toBe(prof.poziomOgolny)
  })

  it('tom z brakiem CCP = stan blok (czerwień tylko dla realnych blokad)', () => {
    const mapa = budujMapeWiedzy({ prof, wyniki: [], idPrac: 'P-01', profile: [] })
    expect(mapa.wezly.find((n) => n.id === 'tom:IV Wypiek').stan).toBe('blok')
    expect(mapa.wezly.find((n) => n.id === 'tom:II Zakwas').stan).toBe('toku')
  })

  it('bez wyniku Work Profile: Rozwój jako szare zaproszenie; z wynikiem: zbiorczy + 3 priorytety', () => {
    const bez = budujMapeWiedzy({ prof, wyniki: [], idPrac: 'P-01', profile: [] })
    expect(bez.wezly.find((n) => n.id === 'rozwoj').stan).toBe('info')
    expect(bez.wezly.filter((n) => n.grupa === 'rozwoj').length).toBe(1)

    const wynikWp = rekordProfilu({
      typ: 'alterbake-wynik-work-profile', wersja: '2026-07-12', narzedzie: 'profil-pracy',
      data: '2026-07-01T10:00:00.000Z', osoba: { imie: 'Weronika' },
      wyniki: { reliability: 80, pressure: 45, collaboration: 70, learning: 65, initiative: 30, integrity: 85, communication: 55, problemSolving: 60 }
    }, 'P-01', '2026-07-12')
    const z = budujMapeWiedzy({ prof, wyniki: [], idPrac: 'P-01', profile: [wynikWp] })
    const rozwojowe = z.wezly.filter((n) => n.grupa === 'rozwoj')
    expect(rozwojowe.length).toBe(4) // zbiorczy + 3 priorytety
    expect(z.wezly.find((n) => n.id === 'rozwoj:initiative')).toBeTruthy()
  })

  it('każdy węzeł ma akcję (klik = przejście do pracy), etykiety mieszczą się na mapie', () => {
    const mapa = budujMapeWiedzy({ prof, wyniki: [], idPrac: 'P-01', profile: [] })
    for (const n of mapa.wezly) {
      expect(n.akcja).toBeTruthy()
      expect(n.etykieta.length).toBeLessThanOrEqual(16)
    }
    expect(skrocEtykiete('Praktyczne rozwiązywanie problemów')).toMatch(/…$/)
    expect(skrocEtykiete('Krótkie')).toBe('Krótkie')
  })
})
