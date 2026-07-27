import { useMemo, useRef, useState } from 'react'
import {
  przygotujPrzypisanie,
  rekordProfilu,
  czekajaceWyniki,
  walidujWynikWp,
  imionaPasuja,
  nazwaNarzedzia
} from '../logic/rozwoj.js'
import { teraz } from '../logic/store.js'

// Przypisanie wyniku Work Profile przez Mentora/Właściciela do wybranego
// pracownika — np. gdy to oni prowadzą wywiad i mają plik wyniku. Sam pracownik
// robi to samo w zakładce „Rozwój”; ta ścieżka jest dla prowadzącego.
//
// Trzy drogi wejścia wyniku, od najwygodniejszej dla osoby zdalnej:
//  1. wklejony JSON (test ma przycisk „Wyślij wynik właścicielowi” = schowek),
//  2. plik JSON (klasyczny załącznik),
//  3. wynik wykryty w tej przeglądarce (test robiony na tym stanowisku).
const MAKS_PLIK = 512 * 1024
const MAKS_WKLEJKA = 512 * 1024

export default function ImportWyniku({ pracownicy, profile, onDodajProfil, onDodajGoscia }) {
  const [idPrac, setIdPrac] = useState(pracownicy[0]?.id_prac || '')
  const [komunikat, setKomunikat] = useState(null)
  const [wklejka, setWklejka] = useState('')
  const [oczekujacy, setOczekujacy] = useState(null) // sparsowany wynik czekający na decyzję
  const plikRef = useRef(null)

  const pracownik = pracownicy.find((p) => p.id_prac === idPrac) || null
  const czekajace = useMemo(
    () => (pracownik ? czekajaceWyniki(profile || [], pracownik.id_prac) : []),
    [pracownik, profile]
  )

  // Czy ktokolwiek w panelu pasuje do imienia podpisanego na wyniku — jeśli nie,
  // proponujemy założenie profilu gościa (typowe przy zbieraniu ewaluacji).
  const imieWyniku = (oczekujacy?.osoba?.imie || '').trim()
  const znanaOsoba = useMemo(
    () => (imieWyniku ? pracownicy.find((p) => imionaPasuja(p.imie, imieWyniku)) : null),
    [imieWyniku, pracownicy]
  )

  const przyjmij = (surowy, zrodlo, osoba = pracownik) => {
    if (!osoba) return
    const gotowe = przygotujPrzypisanie(surowy, osoba, profile || [])
    if (!gotowe.ok) {
      setKomunikat({ typ: 'blad', tekst: gotowe.blad })
      return
    }
    if (gotowe.ostrzezenieImienia) {
      const zgoda = window.confirm(
        `Wynik jest podpisany „${gotowe.ostrzezenieImienia}", a przypisujesz go do „${osoba.imie}". ` +
        'Na pewno przypisać?'
      )
      if (!zgoda) return
    }
    onDodajProfil(rekordProfilu(surowy, osoba.id_prac, teraz()))
    setKomunikat({
      typ: 'ok',
      tekst: `Wynik „${nazwaNarzedzia(surowy.narzedzie)}” (${zrodlo}) przypisany do: ${osoba.imie}.`
    })
    setOczekujacy(null)
    setWklejka('')
  }

  const importujPlik = (e) => {
    const plik = e.target.files?.[0]
    if (!plik) return
    if (plik.size > MAKS_PLIK) {
      setKomunikat({ typ: 'blad', tekst: 'Plik jest za duży jak na wynik testu (limit 512 KB).' })
      e.target.value = ''
      return
    }
    const czytnik = new FileReader()
    czytnik.onload = () => {
      try {
        przyjmij(JSON.parse(czytnik.result), 'z pliku')
      } catch {
        setKomunikat({ typ: 'blad', tekst: 'To nie jest poprawny plik JSON.' })
      }
    }
    czytnik.readAsText(plik)
    e.target.value = ''
  }

  // Wklejka: najpierw parsujemy i pokazujemy, CO przyszło — dopiero potem
  // decyzja o przypisaniu. Dzięki temu widać, czy wynik jest podpisany osobą,
  // której nie ma jeszcze w panelu (wtedy jedno kliknięcie zakłada gościa).
  const wczytajWklejke = () => {
    const tekst = wklejka.trim()
    if (!tekst) return
    if (tekst.length > MAKS_WKLEJKA) {
      setKomunikat({ typ: 'blad', tekst: 'Wklejony tekst jest za długi jak na wynik testu.' })
      return
    }
    let obiekt
    try {
      obiekt = JSON.parse(tekst)
    } catch {
      setKomunikat({
        typ: 'blad',
        tekst: 'To nie jest poprawny JSON. Wklej całość razem z nawiasami { }.'
      })
      return
    }
    const blad = walidujWynikWp(obiekt)
    if (blad) {
      setKomunikat({ typ: 'blad', tekst: blad })
      return
    }
    setKomunikat(null)
    setOczekujacy(obiekt)
  }

  const dodajGosciaIPrzypisz = () => {
    const gosc = onDodajGoscia?.(imieWyniku)
    if (!gosc) return
    setIdPrac(gosc.id_prac)
    przyjmij(oczekujacy, 'z wklejki', gosc)
  }

  return (
    <div className="karta">
      <h2>Przypisz wynik Work Profile pracownikowi</h2>
      <p className="cichy mini">
        Gdy to Ty prowadzisz wywiad i masz wynik (albo test wykonano na tym stanowisku) —
        przypisz go wybranej osobie. Pracownik może zrobić to sam w zakładce „Rozwój”.
      </p>
      <div className="rzad">
        <label className="import-label">
          Pracownik:{' '}
          <select value={idPrac} onChange={(e) => { setIdPrac(e.target.value); setKomunikat(null) }}>
            {pracownicy.map((p) => (
              <option key={p.id_prac} value={p.id_prac}>{p.imie} ({p.rola})</option>
            ))}
          </select>
        </label>
        <button className="drugi" onClick={() => plikRef.current?.click()} disabled={!pracownik}>
          📄 Importuj wynik z pliku (JSON)
        </button>
        <input
          ref={plikRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={importujPlik}
        />
      </div>

      <details className="wklejka-blok">
        <summary>📥 Wklej wynik przysłany wiadomością</summary>
        <p className="cichy mini">
          Osoba testująca zdalnie klika w raporcie „📤 Wyślij wynik właścicielowi” (wynik ląduje
          w jej schowku) i wysyła go dowolnym komunikatorem. Wklej tu całość — razem z nawiasami{' '}
          <code>{'{ }'}</code>. Żadnych plików ani załączników.
        </p>
        <textarea
          className="pole wklejka-pole"
          rows={4}
          placeholder='{"typ":"alterbake-wynik-work-profile", ... }'
          value={wklejka}
          onChange={(e) => { setWklejka(e.target.value); setOczekujacy(null) }}
        />
        <div className="rzad">
          <button className="drugi" onClick={wczytajWklejke} disabled={!wklejka.trim()}>
            Sprawdź wklejony wynik
          </button>
          {wklejka && (
            <button className="link-odrzuc" onClick={() => { setWklejka(''); setOczekujacy(null); setKomunikat(null) }}>
              wyczyść
            </button>
          )}
        </div>

        {oczekujacy && (
          <div className="wklejka-podglad">
            <p>
              <strong>{nazwaNarzedzia(oczekujacy.narzedzie)}</strong>
              {imieWyniku ? ` · podpisany: ${imieWyniku}` : ' · bez podpisu'}
              {oczekujacy.data ? ` · ${String(oczekujacy.data).slice(0, 10)}` : ''}
            </p>
            {imieWyniku && !znanaOsoba && (
              <p className="cichy mini">
                W panelu nie ma osoby o imieniu „{imieWyniku}”. Możesz założyć jej profil gościa
                jednym kliknięciem — wyniki gości nie mieszają się z danymi zespołu.
              </p>
            )}
            <div className="rzad">
              {imieWyniku && !znanaOsoba && onDodajGoscia && (
                <button className="glowny" onClick={dodajGosciaIPrzypisz}>
                  ➕ Dodaj gościa „{imieWyniku}” i przypisz
                </button>
              )}
              <button
                className={imieWyniku && !znanaOsoba ? 'drugi' : 'glowny'}
                onClick={() => przyjmij(oczekujacy, 'z wklejki')}
                disabled={!pracownik}
              >
                Przypisz do: {pracownik?.imie || '—'}
              </button>
            </div>
          </div>
        )}
      </details>

      {komunikat && (
        <div className={komunikat.typ === 'ok' ? 'ccp-tag ok import-komunikat' : 'ccp-tag brak import-komunikat'}>
          {komunikat.tekst}
        </div>
      )}

      {czekajace.length > 0 && (
        <>
          <p className="cichy mini" style={{ marginTop: '.8rem' }}>
            Wyniki wykryte w tej przeglądarce, nieprzypisane jeszcze do {pracownik?.imie}:
          </p>
          {czekajace.map((w, i) => (
            <div key={i} className="rzad">
              <span>
                <strong>{nazwaNarzedzia(w.narzedzie)}</strong>
                {w.osoba?.imie ? ` · podpisany: ${w.osoba.imie}` : ''} · {(w.data || '').slice(0, 10)}
              </span>
              <button className="glowny" onClick={() => przyjmij(w, 'z tej przeglądarki')}>
                Przypisz do: {pracownik?.imie}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
