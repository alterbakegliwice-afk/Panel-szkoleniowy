import { useMemo, useState } from 'react'
import {
  ROZWOJ,
  KIERUNKI_OBSERWACJI,
  postepRozwoju,
  triangulacja,
  rekordObserwacji
} from '../logic/rozwoj.js'
import { teraz } from '../logic/store.js'

// TRIANGULACJA — obserwacja Mentora obok samooceny Work Profile.
// Po co: Work Profile to self-report (samoocena ~8% wariancji realnych umiejętności,
// Dunning-Kruger). Krótka obserwacja Mentora „w praktyce” urealnia wynik, a jawny
// sygnał rozjazdu (samoocena rośnie, obserwacja nie) staje się tematem do rozmowy.
export default function ObserwacjeMentora({ pracownicy, profile, obserwacje, oceniajacy, onDodajObserwacje }) {
  const [idPrac, setIdPrac] = useState(pracownicy[0]?.id_prac || '')
  const [obszar, setObszar] = useState(ROZWOJ.obszary[0].id)
  const [kierunek, setKierunek] = useState('wzrost')
  const [notatka, setNotatka] = useState('')
  const [info, setInfo] = useState('')

  const pracownik = pracownicy.find((p) => p.id_prac === idPrac) || null

  const zapisz = () => {
    if (!pracownik) return
    onDodajObserwacje(
      rekordObserwacji(pracownik.id_prac, obszar, kierunek, oceniajacy, notatka.trim(), teraz())
    )
    const nazwaObszaru = ROZWOJ.obszary.find((o) => o.id === obszar)?.nazwa
    setInfo(`Zapisano obserwację: ${pracownik.imie} · ${nazwaObszaru}.`)
    setNotatka('')
  }

  return (
    <div className="karta">
      <h2>Obserwacja w praktyce vs samoocena</h2>
      <p className="cichy mini">
        Work Profile to <strong>samoocena</strong> — pokazuje, jak pracownik <em>widzi</em> siebie.
        Twoja krótka obserwacja z praktyki urealnia obraz. Gdy samoocena rośnie, a Ty nie widzisz
        zmiany, panel to zaznaczy — to nie „przyłapanie”, tylko najlepszy moment na rozmowę.
      </p>

      <div className="obs-form">
        <label className="import-label">
          Pracownik:{' '}
          <select value={idPrac} onChange={(e) => { setIdPrac(e.target.value); setInfo('') }}>
            {pracownicy.map((p) => (
              <option key={p.id_prac} value={p.id_prac}>{p.imie} ({p.rola})</option>
            ))}
          </select>
        </label>
        <label className="import-label">
          Obszar:{' '}
          <select value={obszar} onChange={(e) => setObszar(e.target.value)}>
            {ROZWOJ.obszary.map((o) => (
              <option key={o.id} value={o.id}>{o.nazwa}</option>
            ))}
          </select>
        </label>
        <label className="import-label">
          Co widzisz:{' '}
          <select value={kierunek} onChange={(e) => setKierunek(e.target.value)}>
            {Object.entries(KIERUNKI_OBSERWACJI).map(([k, v]) => (
              <option key={k} value={k}>{v.etykieta}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        className="pole"
        rows={2}
        placeholder="Notatka (opcjonalnie): konkretna sytuacja z praktyki, którą widziałeś"
        value={notatka}
        onChange={(e) => setNotatka(e.target.value)}
      />
      <div className="rzad">
        <button className="glowny" onClick={zapisz} disabled={!pracownik}>Zapisz obserwację</button>
        {info && <span className="ccp-tag ok import-komunikat">{info}</span>}
      </div>

      <div className="obs-zestawienia">
        {pracownicy.map((prac) => {
          const postep = postepRozwoju(profile || [], prac.id_prac)
          if (!postep) return null
          const wiersze = triangulacja(postep, obserwacje || [], prac.id_prac).filter(
            (o) => o.obserwacja || o.delta !== null
          )
          if (!wiersze.length) return null
          return (
            <details key={prac.id_prac} className="historia-karta">
              <summary>{prac.imie} — samoocena vs obserwacja</summary>
              <div className="obs-lista">
                {wiersze.map((o) => (
                  <div key={o.id} className={'obs-wiersz' + (o.rozjazd ? ' obs-rozjazd' : '')}>
                    <span className="obs-obszar">{o.nazwa}</span>
                    <span className="obs-samoocena">
                      {o.delta === null
                        ? 'samoocena: 1. podejście'
                        : o.delta === 0
                          ? 'samoocena: bez zmian'
                          : `samoocena: ${o.delta > 0 ? '▲ +' : '▼ '}${o.delta}`}
                    </span>
                    <span className="obs-obserwacja">
                      {o.obserwacja
                        ? `obserwacja: ${KIERUNKI_OBSERWACJI[o.obserwacja.kierunek].etykieta.toLowerCase()}`
                        : 'obserwacja: brak'}
                    </span>
                    {o.rozjazd && (
                      <span className="obs-flaga">
                        ⚠ {o.typRozjazdu === 'zawyzona'
                          ? 'samoocena wyżej niż obserwacja — temat do rozmowy'
                          : 'niedocenia się — warto docenić postęp'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
