import { describe, it, expect } from 'vitest'
import { nowaKarta, filtrujRozszerzenia, kartyTomu, szkicPunktow, aktualizujKarte, usunKarte, listaTematow } from './rozszerzenia.js'

describe('nowaKarta', () => {
  it('tworzy kartę z przyciętymi polami i pustymi punktami odfiltrowanymi', () => {
    const k = nowaKarta({
      tom: '  IV Wypiek ',
      tytul: '  Zakwas bez zapachu ',
      punkty: ['  Dokarm częściej ', '', '   ', 'Sprawdź temperaturę'],
      zrodlo: ' Pytanie zespołu ',
      zPytania: 'pyt-1'
    })
    expect(k.id).toMatch(/^kr-/)
    expect(k.tom).toBe('IV Wypiek')
    expect(k.tytul).toBe('Zakwas bez zapachu')
    expect(k.punkty).toEqual(['Dokarm częściej', 'Sprawdź temperaturę'])
    expect(k.zrodlo).toBe('Pytanie zespołu')
    expect(k.zPytania).toBe('pyt-1')
    expect(typeof k.data).toBe('string')
  })

  it('kolejne karty mają unikalne ID', () => {
    const a = nowaKarta({ tom: 'X', tytul: 't', punkty: ['a'] })
    const b = nowaKarta({ tom: 'X', tytul: 't', punkty: ['a'] })
    expect(a.id).not.toBe(b.id)
  })
})

describe('filtrujRozszerzenia', () => {
  it('odrzuca karty bez tomu, tytułu lub punktów i przepuszcza poprawne', () => {
    const dobra = nowaKarta({ tom: 'X', tytul: 't', punkty: ['a'] })
    expect(
      filtrujRozszerzenia([
        dobra,
        null,
        {},
        { ...dobra, tom: '' },
        { ...dobra, tytul: '   ' },
        { ...dobra, punkty: [] },
        { ...dobra, punkty: ['', '  '] }
      ])
    ).toEqual([dobra])
  })

  it('nie-tablica zwraca pustą listę', () => {
    expect(filtrujRozszerzenia(undefined)).toEqual([])
    expect(filtrujRozszerzenia(null)).toEqual([])
  })
})

describe('kartyTomu', () => {
  it('zwraca tylko karty danego tomu w kształcie karty materiału z flagą rozszerzenie', () => {
    const rozsz = [
      nowaKarta({ tom: 'IV Wypiek', tytul: 'A', punkty: ['a'], zrodlo: 'z' }),
      nowaKarta({ tom: 'II Zakwas', tytul: 'B', punkty: ['b'] })
    ]
    const wynik = kartyTomu('IV Wypiek', rozsz)
    expect(wynik).toEqual([{ tytul: 'A', punkty: ['a'], zrodlo: 'z', rozszerzenie: true }])
  })

  it('odporny na zepsute dane wejściowe', () => {
    expect(kartyTomu('X', undefined)).toEqual([])
    expect(kartyTomu('X', [{}, null])).toEqual([])
  })
})

describe('aktualizujKarte', () => {
  it('edytuje treść wskazanej karty, zachowuje id/zPytania/data', () => {
    const k = nowaKarta({ tom: 'X', tytul: 'stary', punkty: ['a'], zrodlo: 'z', zPytania: 'pyt-1' })
    const [po] = aktualizujKarte([k], k.id, { tytul: 'nowy', punkty: [' b ', '', 'c'] })
    expect(po.id).toBe(k.id)
    expect(po.zPytania).toBe('pyt-1')
    expect(po.data).toBe(k.data)
    expect(po.tytul).toBe('nowy')
    expect(po.punkty).toEqual(['b', 'c'])
    expect(po.tom).toBe('X') // niezmienione pole zostaje
  })

  it('nie rusza pozostałych kart i jest odporne na zepsute wejście', () => {
    const a = nowaKarta({ tom: 'X', tytul: 'a', punkty: ['1'] })
    const b = nowaKarta({ tom: 'Y', tytul: 'b', punkty: ['2'] })
    const wynik = aktualizujKarte([a, b], b.id, { tytul: 'B2' })
    expect(wynik[0]).toEqual(a)
    expect(wynik[1].tytul).toBe('B2')
    expect(aktualizujKarte(null, 'x', {})).toEqual([])
  })

  it('obrona w głąb: zmiana zerująca kartę (puste punkty/tytuł/tom) jest ignorowana', () => {
    const k = nowaKarta({ tom: 'X', tytul: 'a', punkty: ['1'] })
    expect(aktualizujKarte([k], k.id, { punkty: ['', '   '] })).toEqual([k]) // bez zmian
    expect(aktualizujKarte([k], k.id, { tytul: '   ' })).toEqual([k])
    expect(aktualizujKarte([k], k.id, { tom: '' })).toEqual([k])
  })
})

describe('usunKarte', () => {
  it('usuwa wskazaną kartę, resztę zostawia', () => {
    const a = nowaKarta({ tom: 'X', tytul: 'a', punkty: ['1'] })
    const b = nowaKarta({ tom: 'Y', tytul: 'b', punkty: ['2'] })
    expect(usunKarte([a, b], a.id)).toEqual([b])
    expect(usunKarte(null, 'x')).toEqual([])
  })
})

describe('listaTematow', () => {
  it('łączy tomy banku z maszynami Techniki i strefami Sprzątania', () => {
    const bank = [{ tom: 'IV Wypiek' }, { tom: 'IV Wypiek' }, { tom: 'II Zakwas' }]
    const tematy = listaTematow(bank)
    expect(tematy).toContain('IV Wypiek')
    expect(tematy).toContain('II Zakwas')
    // bez duplikatów tomów banku
    expect(tematy.filter((t) => t === 'IV Wypiek')).toHaveLength(1)
    // maszyny/strefy dokładane (lista niepusta ponad same tomy banku)
    expect(tematy.length).toBeGreaterThan(2)
  })

  it('pusty/niepoprawny bank → same tematy paneli praktycznych', () => {
    expect(listaTematow(undefined).length).toBeGreaterThan(0)
  })

  it('pokrywa WSZYSTKIE hosty Learning: Technika, Sprzątanie, Rozwój, Przedsiębiorca', () => {
    const t = listaTematow([])
    // obszar Rozwoju i moduł Przedsiębiorcy MUSZĄ być wybieralne jako tom docelowy
    expect(t).toContain('Współpraca') // ROZWOJ.obszary
    expect(t.some((x) => /Bezpieczeństwo psychologiczne|Delegowanie/.test(x))).toBe(true) // PRZEDSIEBIORCA.moduly
    // bez duplikatów (Set)
    expect(new Set(t).size).toBe(t.length)
  })
})

describe('szkicPunktow', () => {
  it('dzieli wielowierszową odpowiedź na punkty (wiersz = punkt)', () => {
    expect(szkicPunktow('Pierwszy\nDrugi\n\n  Trzeci  ')).toEqual(['Pierwszy', 'Drugi', 'Trzeci'])
  })

  it('dzieli pojedynczy akapit na zdania', () => {
    expect(szkicPunktow('Dokarm częściej. Sprawdź temperaturę! Czy mąka świeża?')).toEqual([
      'Dokarm częściej.',
      'Sprawdź temperaturę!',
      'Czy mąka świeża?'
    ])
  })

  it('pusta/niepoprawna odpowiedź → pusta lista', () => {
    expect(szkicPunktow('')).toEqual([])
    expect(szkicPunktow(null)).toEqual([])
  })
})
