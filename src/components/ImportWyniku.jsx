import { useMemo, useRef, useState } from 'react'
import {
  przygotujPrzypisanie,
  rekordProfilu,
  czekajaceWyniki,
  nazwaNarzedzia
} from '../logic/rozwoj.js'
import { teraz } from '../logic/store.js'

// Przypisanie wyniku Work Profile przez Mentora/Właściciela do wybranego
// pracownika — np. gdy to oni prowadzą wywiad i mają plik wyniku. Sam pracownik
// robi to samo w zakładce „Rozwój”; ta ścieżka jest dla prowadzącego.
const MAKS_PLIK = 512 * 1024

export default function ImportWyniku({ pracownicy, profile, onDodajProfil }) {
  const [idPrac, setIdPrac] = useState(pracownicy[0]?.id_prac || '')
  const [komunikat, setKomunikat] = useState(null)
  const plikRef = useRef(null)

  const pracownik = pracownicy.find((p) => p.id_prac === idPrac) || null
  const czekajace = useMemo(
    () => (pracownik ? czekajaceWyniki(profile || [], pracownik.id_prac) : []),
    [pracownik, profile]
  )

  const przyjmij = (surowy, zrodlo) => {
    if (!pracownik) return
    const gotowe = przygotujPrzypisanie(surowy, pracownik, profile || [])
    if (!gotowe.ok) {
      setKomunikat({ typ: 'blad', tekst: gotowe.blad })
      return
    }
    if (gotowe.ostrzezenieImienia) {
      const zgoda = window.confirm(
        `Wynik jest podpisany „${gotowe.ostrzezenieImienia}", a przypisujesz go do „${pracownik.imie}". ` +
        'Na pewno przypisać?'
      )
      if (!zgoda) return
    }
    onDodajProfil(rekordProfilu(surowy, pracownik.id_prac, teraz()))
    setKomunikat({
      typ: 'ok',
      tekst: `Wynik „${nazwaNarzedzia(surowy.narzedzie)}” (${zrodlo}) przypisany do: ${pracownik.imie}.`
    })
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

  return (
    <div className="karta">
      <h2>Przypisz wynik Work Profile pracownikowi</h2>
      <p className="cichy mini">
        Gdy to Ty prowadzisz wywiad i masz plik wyniku (albo test wykonano na tym stanowisku) —
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
