import { describe, it, expect } from 'vitest'
import {
  PRZEDSIEBIORCA,
  ID_WLASCICIEL,
  pytaniaPrzedsiebiorcy,
  czyPrzerobiono,
  postepModulu,
  postepPrzedsiebiorcy,
  materialTomu
} from './nauka.js'
import { walidujBank } from './store.js'

describe('moduł przedsiębiorcy — dane', () => {
  it('ma moduły i pytania z poprawnym kluczem odpowiedzi (walidacja jak bank)', () => {
    expect(PRZEDSIEBIORCA.moduly.length).toBeGreaterThanOrEqual(6)
    const pytania = pytaniaPrzedsiebiorcy()
    expect(pytania.length).toBe(PRZEDSIEBIORCA.moduly.reduce((s, m) => s + m.pytania.length, 0))
    // ten sam twardy walidator co dla banku pytań — łapie zły indeks poprawnej odpowiedzi
    expect(walidujBank({ pytania })).toBe(null)
  })

  it('każdy moduł ma materiał do nauki (intro + karty)', () => {
    for (const m of PRZEDSIEBIORCA.moduly) {
      expect(m.nauka.intro.length).toBeGreaterThan(20)
      expect(m.nauka.karty.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('brama nauki — najpierw materiał, potem sprawdzenie', () => {
  it('czyPrzerobiono wykrywa wpis nauki dla ucznia i obszaru', () => {
    const nauka = [{ id_prac: ID_WLASCICIEL, obszar: 'Bezpieczeństwo psychologiczne', data: '2026-07-10' }]
    expect(czyPrzerobiono(nauka, ID_WLASCICIEL, 'Bezpieczeństwo psychologiczne')).toBe(true)
    expect(czyPrzerobiono(nauka, ID_WLASCICIEL, 'Motywacja wewnętrzna (autonomia, mistrzostwo, sens)')).toBe(false)
    expect(czyPrzerobiono([], 'P-01', 'II Zakwas')).toBe(false)
  })
})

describe('postęp modułu przedsiębiorcy', () => {
  it('liczy procent na podstawie ostatnich wyników właściciela', () => {
    const modul = PRZEDSIEBIORCA.moduly[0]
    const p0 = modul.pytania[0]
    const wyniki = [{ data: '2026-07-10T10:00:00Z', id_prac: ID_WLASCICIEL, id_pytania: p0.id, zaliczyl: true }]
    const post = postepModulu(modul, wyniki, ID_WLASCICIEL)
    expect(post.zaliczonych).toBe(1)
    expect(post.pytan).toBe(modul.pytania.length)
    // ogólny postęp uśrednia moduły
    expect(postepPrzedsiebiorcy(wyniki, ID_WLASCICIEL).procent).toBeGreaterThan(0)
  })
})

describe('materiał tomów pilota', () => {
  it('istnieje dla 3 tomów pilota i ma źródła', () => {
    for (const tom of ['II Zakwas', 'IV Wypiek', 'V DDT']) {
      const m = materialTomu(tom)
      expect(m).toBeTruthy()
      expect(m.karty.every((k) => k.zrodlo && k.zrodlo.length > 3)).toBe(true)
    }
    expect(materialTomu('Nieistniejący tom')).toBe(null)
  })
})
