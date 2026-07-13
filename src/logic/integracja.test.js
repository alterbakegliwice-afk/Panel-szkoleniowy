import { beforeEach, describe, expect, it } from 'vitest'
import {
  KLUCZ_PLANER,
  KLUCZ_ZESPOL,
  KLUCZ_ZGLOSZENIA,
  dzisISO,
  zbudujRejestr,
  zapiszLustroZespolu,
  filtrujZgloszenia,
  noweZgloszenie,
  dodajZgloszenie,
  ustawStatusZgloszenia,
  wczytajZgloszenia,
  wczytajPlaner,
  zadaniaDnia,
  planDnia,
  maPowiazanieZPlanerem,
  przelaczStatusZadania
} from './integracja.js'

// środowisko testów to node — podstawiamy pamięciowy localStorage
beforeEach(() => {
  const mapa = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k)
  }
})

const stanPanelu = {
  konfig: { PROG_ZALICZENIA: 0.8, PIN_WLASCICIELA: '9999' },
  pracownicy: [
    { id_prac: 'P-01', imie: 'Weronika', rola: 'Piekarz', pin: '1234', kierownik: ['piekarnia'] },
    { id_prac: 'P-02', imie: 'Michał', rola: 'Pomocnik', pin: '' }
  ]
}

const stanPlanera = {
  wersja: 2,
  aktywnyModul: 'cukiernia',
  moduly: {
    cukiernia: {
      ustawienia: {
        zespol: [
          { id: 'oliwia', nazwa: 'Oliwia', rola: 'szef', od: '07:00', do: '15:00' },
          { id: 'julia', nazwa: 'Julia', rola: 'pomoc', od: '07:00', do: '14:00', id_prac: 'P-02' }
        ]
      },
      plan: {
        '2026-07-13': {
          bloki: [
            { id: 'b1', nr: 'C-01', partie: 2, osoba: 'julia', start: 420, segmenty: [{ od: 0, do: 90, typ: 'aktywny' }] },
            { id: 'b2', nr: 'C-02', partie: 1, osoba: 'oliwia', start: 400, segmenty: [{ od: 0, do: 60, typ: 'aktywny' }] }
          ]
        }
      },
      zadania: [
        { id: 'z1', tytul: 'Naważki kremów', osoba: 'julia', data: '2026-07-13', czas_min: 30, status: 'otwarte' },
        { id: 'z2', tytul: 'Glazura', osoba: 'oliwia', data: '2026-07-13', czas_min: 20, status: 'otwarte' },
        { id: 'z3', tytul: 'Wczorajsze', osoba: 'julia', data: '2026-07-12', czas_min: 15, status: 'zrobione' }
      ]
    },
    piekarnia: { ustawienia: { zespol: [] }, plan: {}, zadania: [] }
  }
}

describe('dzisISO', () => {
  it('daje datę lokalną w formacie YYYY-MM-DD', () => {
    expect(dzisISO(new Date(2026, 6, 13, 0, 30))).toBe('2026-07-13')
  })
})

describe('rejestr zespołu (alterbake_zespol_v1)', () => {
  it('buduje lustro z PIN-ami i uprawnieniami kierownika', () => {
    const r = zbudujRejestr(stanPanelu, '2026-07-13T08:00:00.000Z')
    expect(r.wersja).toBe(1)
    expect(r.wlasciciel).toEqual({ imie: 'Piotr', pin: '9999' })
    expect(r.pracownicy).toEqual([
      { id_prac: 'P-01', imie: 'Weronika', rola: 'Piekarz', pin: '1234', kierownik: ['piekarnia'] },
      { id_prac: 'P-02', imie: 'Michał', rola: 'Pomocnik', pin: '', kierownik: [] }
    ])
  })

  it('odfiltrowuje nieznane moduły z uprawnień kierownika', () => {
    const r = zbudujRejestr(
      { konfig: {}, pracownicy: [{ id_prac: 'P-01', imie: 'X', rola: 'Piekarz', kierownik: ['piekarnia', 'lodziarnia'] }] },
      't'
    )
    expect(r.pracownicy[0].kierownik).toEqual(['piekarnia'])
  })

  it('zapisuje lustro do localStorage', () => {
    zapiszLustroZespolu(stanPanelu, 't')
    const zapis = JSON.parse(localStorage.getItem(KLUCZ_ZESPOL))
    expect(zapis.pracownicy).toHaveLength(2)
  })
})

describe('zgłoszenia (alterbake_zgloszenia_v1)', () => {
  it('filtruje zepsute wpisy', () => {
    const dobry = noweZgloszenie({ id_prac: 'P-01', imie: 'W', typ: 'uwaga', tresc: 'ok' })
    expect(
      filtrujZgloszenia([dobry, null, {}, { ...dobry, typ: 'spam' }, { ...dobry, tresc: '  ' }])
    ).toEqual([dobry])
  })

  it('dopisuje i aktualizuje status bez edycji treści', () => {
    const wpis = noweZgloszenie({ id_prac: 'P-02', imie: 'Michał', typ: 'potrzeba', tresc: ' Brak pistacji ' })
    expect(wpis.tresc).toBe('Brak pistacji')
    expect(wpis.status).toBe('nowe')
    dodajZgloszenie(wpis)
    ustawStatusZgloszenia(wpis.id, 'przyjete', 'Zamówione na jutro')
    const [po] = wczytajZgloszenia()
    expect(po.status).toBe('przyjete')
    expect(po.odpowiedz).toBe('Zamówione na jutro')
    expect(po.tresc).toBe('Brak pistacji')
    expect(JSON.parse(localStorage.getItem(KLUCZ_ZGLOSZENIA)).wersja).toBe(1)
  })
})

describe('odczyt Planera (alterbake_planer_v2)', () => {
  beforeEach(() => localStorage.setItem(KLUCZ_PLANER, JSON.stringify(stanPlanera)))

  it('zwraca null przy braku/zepsutych danych', () => {
    localStorage.removeItem(KLUCZ_PLANER)
    expect(wczytajPlaner()).toBeNull()
    localStorage.setItem(KLUCZ_PLANER, '{zepsute')
    expect(wczytajPlaner()).toBeNull()
  })

  it('zadaniaDnia: tylko zadania pracownika z danego dnia, przez mapowanie id_prac', () => {
    const planer = wczytajPlaner()
    const z = zadaniaDnia(planer, 'P-02', '2026-07-13')
    expect(z).toHaveLength(1)
    expect(z[0]).toMatchObject({ modul: 'cukiernia', tytul: 'Naważki kremów', status: 'otwarte' })
    expect(zadaniaDnia(planer, 'P-01', '2026-07-13')).toHaveLength(0) // brak mapowania
  })

  it('planDnia: bloki posortowane, z oznaczeniem własnych', () => {
    const [modul] = planDnia(wczytajPlaner(), '2026-07-13', 'P-02')
    expect(modul.modul).toBe('cukiernia')
    expect(modul.bloki.map((b) => b.nr)).toEqual(['C-02', 'C-01'])
    expect(modul.bloki[1]).toMatchObject({ od: '07:00', do: '08:30', osoba: 'Julia', moje: true })
    expect(modul.bloki[0].moje).toBe(false)
  })

  it('maPowiazanieZPlanerem rozpoznaje mapowanie', () => {
    const planer = wczytajPlaner()
    expect(maPowiazanieZPlanerem(planer, 'P-02')).toBe(true)
    expect(maPowiazanieZPlanerem(planer, 'P-01')).toBe(false)
  })

  it('przelaczStatusZadania zapisuje zmianę statusu do klucza Planera', () => {
    expect(przelaczStatusZadania('cukiernia', 'z1')).toBe('zrobione')
    const po = JSON.parse(localStorage.getItem(KLUCZ_PLANER))
    expect(po.moduly.cukiernia.zadania.find((z) => z.id === 'z1').status).toBe('zrobione')
    expect(przelaczStatusZadania('cukiernia', 'z1')).toBe('otwarte')
    expect(przelaczStatusZadania('cukiernia', 'nie-ma')).toBeNull()
  })
})
