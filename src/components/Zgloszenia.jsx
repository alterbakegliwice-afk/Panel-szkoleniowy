import { useState } from 'react'
import {
  TYPY_ZGLOSZEN,
  wczytajZgloszenia,
  noweZgloszenie,
  dodajZgloszenie,
  ustawStatusZgloszenia
} from '../logic/integracja.js'

const ETYKIETY_STATUSU = { nowe: 'nowe', przyjete: 'przyjęte', zamkniete: 'zamknięte' }

function nazwaTypu(klucz) {
  const t = TYPY_ZGLOSZEN.find((x) => x.klucz === klucz)
  return t ? t.nazwa.split(' (')[0] : klucz
}

// Zgłoszenia potrzeb i uwag. Log append-only we wspólnym localStorage
// (alterbake_zgloszenia_v1) — czytany też przez AI Command Center.
// tryb 'pracownik': formularz + własne zgłoszenia. tryb 'zarzad': skrzynka
// (Właściciel/Mentor) — zmiana statusu i odpowiedź, bez edycji treści.
export default function Zgloszenia({ tryb, pracownik, onAktualizacja = () => {} }) {
  const [zgloszenia, setZgloszenia] = useState(wczytajZgloszenia)
  // onAktualizacja: App odświeża licznik „nowych" na zakładce — zmiany robimy
  // lokalnym setState, więc bez sygnału badge pokazywałby starą liczbę.
  const zastosuj = (lista) => {
    setZgloszenia(lista)
    onAktualizacja()
  }

  if (tryb === 'pracownik') {
    return (
      <Formularz
        pracownik={pracownik}
        zgloszenia={zgloszenia.filter((z) => z.id_prac === pracownik.id_prac)}
        onNowe={(wpis) => zastosuj(dodajZgloszenie(wpis))}
      />
    )
  }
  return <Skrzynka zgloszenia={zgloszenia} onZmiana={zastosuj} />
}

function Formularz({ pracownik, zgloszenia, onNowe }) {
  const [typ, setTyp] = useState('potrzeba')
  const [tresc, setTresc] = useState('')
  const [info, setInfo] = useState('')

  const wyslij = () => {
    if (!tresc.trim()) return
    onNowe(noweZgloszenie({ id_prac: pracownik.id_prac, imie: pracownik.imie, typ, tresc }))
    setTresc('')
    setInfo('Zgłoszenie zapisane — Właściciel zobaczy je w Panelu i w AI Command Center.')
  }

  return (
    <div className="zgloszenia">
      <div className="karta">
        <h2>Zgłoś potrzebę lub uwagę</h2>
        <p className="cichy">
          Brakuje surowca? Coś nie działa? Masz pomysł na usprawnienie? Napisz —
          zgłoszenie trafia do Właściciela i kierowników.
        </p>
        <label className="pole-etykieta">
          Rodzaj
          <select className="pole" value={typ} onChange={(e) => setTyp(e.target.value)}>
            {TYPY_ZGLOSZEN.map((t) => (
              <option key={t.klucz} value={t.klucz}>{t.nazwa}</option>
            ))}
          </select>
        </label>
        <label className="pole-etykieta">
          Treść
          <textarea
            className="pole"
            rows={3}
            placeholder="np. Kończy się pistacja — zostały 2 kg"
            value={tresc}
            onChange={(e) => { setTresc(e.target.value); setInfo('') }}
          />
        </label>
        <button className="glowny" onClick={wyslij} disabled={!tresc.trim()}>Wyślij zgłoszenie</button>
        {info && <p className="info-ok">{info}</p>}
      </div>

      <div className="karta">
        <h2>Moje zgłoszenia</h2>
        {zgloszenia.length === 0 && <p className="cichy">Nie masz jeszcze zgłoszeń.</p>}
        <ul className="lista-zgloszen">
          {[...zgloszenia].reverse().map((z) => (
            <li key={z.id}>
              <div className="rzad">
                <strong>{nazwaTypu(z.typ)}</strong>
                <span className={'status-zgloszenia status-' + z.status}>{ETYKIETY_STATUSU[z.status]}</span>
                <span className="cichy mini">{z.data.slice(0, 10)}</span>
              </div>
              <p>{z.tresc}</p>
              {z.odpowiedz && <p className="odpowiedz-zgloszenia">↳ {z.odpowiedz}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Skrzynka({ zgloszenia, onZmiana }) {
  const [filtr, setFiltr] = useState('nowe')
  const [odpowiedzi, setOdpowiedzi] = useState({}) // id -> szkic odpowiedzi

  const widoczne = [...zgloszenia]
    .reverse()
    .filter((z) => (filtr === 'wszystkie' ? true : z.status === filtr))

  const ustaw = (id, status) => {
    onZmiana(ustawStatusZgloszenia(id, status, odpowiedzi[id]))
  }

  return (
    <div className="zgloszenia">
      <div className="karta">
        <h2>Zgłoszenia zespołu</h2>
        <p className="cichy">
          Potrzeby i uwagi pracowników (append-only). Odpowiedź i status widzi autor
          w swojej aplikacji; skrzynka jest też w AI Command Center (moduł ZESPÓŁ).
        </p>
        <div className="rzad">
          {['nowe', 'przyjete', 'zamkniete', 'wszystkie'].map((f) => (
            <button
              key={f}
              className={filtr === f ? 'glowny' : 'drugi'}
              onClick={() => setFiltr(f)}
            >
              {f === 'wszystkie' ? 'wszystkie' : ETYKIETY_STATUSU[f]}
              {f !== 'wszystkie' ? ` (${zgloszenia.filter((z) => z.status === f).length})` : ''}
            </button>
          ))}
        </div>
        {widoczne.length === 0 && <p className="cichy">Brak zgłoszeń w tym widoku.</p>}
        <ul className="lista-zgloszen">
          {widoczne.map((z) => (
            <li key={z.id}>
              <div className="rzad">
                <strong>{z.imie}</strong>
                <span className="cichy">{nazwaTypu(z.typ)}</span>
                <span className={'status-zgloszenia status-' + z.status}>{ETYKIETY_STATUSU[z.status]}</span>
                <span className="cichy mini">{z.data.slice(0, 10)}</span>
              </div>
              <p>{z.tresc}</p>
              {z.odpowiedz && <p className="odpowiedz-zgloszenia">↳ {z.odpowiedz}</p>}
              {z.status !== 'zamkniete' && (
                <div className="rzad">
                  <input
                    className="pole"
                    placeholder="Odpowiedź dla pracownika (opcjonalnie)"
                    value={odpowiedzi[z.id] ?? ''}
                    onChange={(e) => setOdpowiedzi({ ...odpowiedzi, [z.id]: e.target.value })}
                  />
                  {z.status === 'nowe' && (
                    <button className="drugi" onClick={() => ustaw(z.id, 'przyjete')}>Przyjmij</button>
                  )}
                  <button className="drugi" onClick={() => ustaw(z.id, 'zamkniete')}>Zamknij</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
