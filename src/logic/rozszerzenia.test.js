import { describe, it, expect } from 'vitest'
import { nowaKarta, filtrujRozszerzenia, kartyTomu, szkicPunktow } from './rozszerzenia.js'

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
