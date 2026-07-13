import { useCallback, useState } from 'react'
import {
  dzisISO,
  wczytajPlaner,
  zadaniaDnia,
  planDnia,
  maPowiazanieZPlanerem,
  przelaczStatusZadania
} from '../logic/integracja.js'

// Mój dzień: przydziały i plan produkcji pracownika, czytane wprost ze stanu
// Planera Produkcji (wspólny origin GitHub Pages = wspólny localStorage).
// Widok jest tylko-odczyt — jedyna dozwolona akcja to odhaczenie WŁASNEGO zadania.
export default function MojDzien({ pracownik }) {
  const [data, setData] = useState(dzisISO())
  // planer czytamy przy każdym renderze wywołanym akcją — bez cache w stanie,
  // żeby zmiany zrobione w Planerze były widoczne po przełączeniu zakładki
  const [, setOdswiez] = useState(0)
  const odswiez = useCallback(() => setOdswiez((n) => n + 1), [])

  const planer = wczytajPlaner()
  const zadania = zadaniaDnia(planer, pracownik.id_prac, data)
  const plan = planDnia(planer, data, pracownik.id_prac)
  const powiazany = maPowiazanieZPlanerem(planer, pracownik.id_prac)

  const przesunDzien = (o) => {
    const d = new Date(data + 'T12:00:00')
    d.setDate(d.getDate() + o)
    setData(dzisISO(d))
  }

  const odhacz = (z) => {
    przelaczStatusZadania(z.modul, z.id)
    odswiez()
  }

  const otwarteMin = zadania
    .filter((z) => z.status !== 'zrobione')
    .reduce((a, z) => a + z.czas_min, 0)

  return (
    <div className="moj-dzien">
      <div className="karta">
        <div className="rzad dzien-nawigacja">
          <button className="drugi" onClick={() => przesunDzien(-1)} aria-label="poprzedni dzień">‹</button>
          <div className="dzien-data">
            <strong>{data}</strong>
            {data === dzisISO() && <span className="chip-dzis"> dziś</span>}
          </div>
          <button className="drugi" onClick={() => przesunDzien(1)} aria-label="następny dzień">›</button>
        </div>

        <h2>Moje zadania</h2>
        {!planer && (
          <p className="cichy">
            Brak danych Planera Produkcji w tej przeglądarce. Zadania i plan pojawią się,
            gdy Planer będzie używany na tym samym urządzeniu (ta sama domena GitHub Pages).
          </p>
        )}
        {planer && !powiazany && (
          <p className="cichy">
            Twój profil nie jest jeszcze powiązany z zespołem Planera. Poproś Właściciela
            lub kierownika o przypisanie Cię w Ustawieniach Planera (Zespół → profil).
          </p>
        )}
        {planer && powiazany && zadania.length === 0 && (
          <p className="cichy">Brak zadań przydzielonych na ten dzień. 🎉</p>
        )}
        {zadania.length > 0 && (
          <>
            <ul className="lista-zadan">
              {zadania.map((z) => (
                <li key={z.modul + z.id} className={z.status === 'zrobione' ? 'zadanie-zrobione' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={z.status === 'zrobione'}
                      onChange={() => odhacz(z)}
                    />
                    <span className="zadanie-tytul">{z.tytul}</span>
                  </label>
                  <span className="cichy mini">
                    {z.modulIkona} {z.modulNazwa}
                    {z.czas_min ? ` · ~${z.czas_min} min` : ''}
                    {z.zrodlo ? ` · ${z.zrodlo}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="cichy mini">
              Do zrobienia: ~{otwarteMin} min.{' '}
              Odhaczasz tylko własne zadania — delegowanie i zmiany harmonogramu robi
              Właściciel lub kierownik w Planerze.
            </p>
          </>
        )}
      </div>

      <div className="karta">
        <h2>Plan produkcji</h2>
        {plan.length === 0 && (
          <p className="cichy">Brak bloków produkcyjnych w planie na ten dzień.</p>
        )}
        {plan.map((m) => (
          <div key={m.modul} className="plan-modul">
            <h3>{m.modulIkona} {m.modulNazwa}</h3>
            <div className="tabela-otoczka">
              <table className="tabela">
                <thead>
                  <tr><th>Godziny</th><th>Produkt</th><th>Prowadzi</th></tr>
                </thead>
                <tbody>
                  {m.bloki.map((b) => (
                    <tr key={b.id} className={b.moje ? 'wiersz-moj' : ''}>
                      <td>{b.od}–{b.do}</td>
                      <td>{b.nr}</td>
                      <td>{b.osoba}{b.moje ? ' (Ty)' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <p className="cichy mini">
          Pełne receptury, oś czasu i naważki — w aplikacji Planer Produkcji (podgląd,
          edycja tylko dla Właściciela i kierowników).
        </p>
      </div>
    </div>
  )
}
