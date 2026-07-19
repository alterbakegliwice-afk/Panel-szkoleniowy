import { describe, it, expect } from 'vitest'
import { noweZapytanie, filtrujPytania } from './pytaniaMistrza.js'

describe('noweZapytanie', () => {
  it('tworzy pytanie z domyślnym statusem nowe i pustą odpowiedzią', () => {
    const p = noweZapytanie({ id_prac: 'P-01', imie: 'Weronika', tom: 'II Zakwas', tresc: '  Dlaczego levain nie rośnie?  ' })
    expect(p.id).toMatch(/^pyt-/)
    expect(p.id_prac).toBe('P-01')
    expect(p.tom).toBe('II Zakwas')
    expect(p.tresc).toBe('Dlaczego levain nie rośnie?') // przycięte
    expect(p.status).toBe('nowe')
    expect(p.odpowiedz).toBe('')
    expect(p.dodacDoMaterialu).toBe(false)
  })

  it('pytanie ogólne (bez tomu) dostaje tom: pusty string', () => {
    const p = noweZapytanie({ id_prac: 'P-01', imie: 'Weronika', tom: '', tresc: 'Ogólne pytanie' })
    expect(p.tom).toBe('')
  })

  it('kolejne pytania mają unikalne ID', () => {
    const a = noweZapytanie({ id_prac: 'P-01', imie: 'W', tom: '', tresc: 'a' })
    const b = noweZapytanie({ id_prac: 'P-01', imie: 'W', tom: '', tresc: 'b' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('filtrujPytania', () => {
  it('odrzuca wpisy bez wymaganych pól i przepuszcza poprawne', () => {
    const dobre = noweZapytanie({ id_prac: 'P-01', imie: 'W', tom: 'X', tresc: 'ok' })
    expect(
      filtrujPytania([
        dobre,
        null,
        {},
        { ...dobre, id: undefined },
        { ...dobre, tresc: '   ' },
        { ...dobre, status: 'cos-innego' }
      ])
    ).toEqual([dobre])
  })

  it('nie-tablica zwraca pustą listę', () => {
    expect(filtrujPytania(undefined)).toEqual([])
    expect(filtrujPytania(null)).toEqual([])
  })

  it('akceptuje status odpowiedziane', () => {
    const p = { ...noweZapytanie({ id_prac: 'P-01', imie: 'W', tom: '', tresc: 'x' }), status: 'odpowiedziane', odpowiedz: 'tak' }
    expect(filtrujPytania([p])).toEqual([p])
  })
})
