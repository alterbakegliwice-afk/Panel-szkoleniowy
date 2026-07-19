import { useState } from 'react'
import { listaTomow } from '../logic/progress.js'
import { TECHNIKA } from '../logic/technika.js'
import { SPRZATANIE } from '../logic/sprzatanie.js'

const ETYKIETY_STATUSU = { nowe: 'nowe', odpowiedziane: 'odpowiedziane' }

// Pytania pracowników — pogłębianie wiedzy TEORETYCZNEJ (logic/pytaniaMistrza.js).
// tryb 'pracownik': formularz (dowolny temat lub „ogólne") + własne pytania
// z odpowiedziami. tryb 'zarzad' (tylko Właściciel — jak w Zgloszeniach):
// skrzynka, odpowiedź, oznaczenie „do rozszerzenia materiału" tego tomu.
export default function PytaniaMistrza({ tryb, pracownik, pytania, pytaniaBank, onDodaj, onOdpowiedz, onPrzelaczFlage }) {
  const tematy = [
    ...listaTomow(pytaniaBank || []),
    ...TECHNIKA.maszyny.map((m) => m.nazwa),
    ...SPRZATANIE.strefy.map((s) => s.nazwa)
  ]

  if (tryb === 'pracownik') {
    return (
      <Formularz
        pracownik={pracownik}
        tematy={tematy}
        pytania={pytania.filter((p) => p.id_prac === pracownik.id_prac)}
        onDodaj={onDodaj}
      />
    )
  }
  return <Skrzynka pytania={pytania} onOdpowiedz={onOdpowiedz} onPrzelaczFlage={onPrzelaczFlage} />
}

function Formularz({ pracownik, tematy, pytania, onDodaj }) {
  const [temat, setTemat] = useState('')
  const [tresc, setTresc] = useState('')
  const [info, setInfo] = useState('')

  const wyslij = () => {
    if (!tresc.trim()) return
    onDodaj({ id_prac: pracownik.id_prac, imie: pracownik.imie, tom: temat, tresc })
    setTresc('')
    setInfo('Pytanie zapisane — Właściciel/Mentor odpowie, zobaczysz odpowiedź poniżej.')
  }

  return (
    <div className="zgloszenia">
      <div className="karta">
        <h2>Zadaj pytanie</h2>
        <p className="cichy">
          Czegoś nie rozumiesz? Chcesz wiedzieć więcej niż jest w materiale? Zapytaj —
          dobre pytania stają się nowymi kartami wiedzy w Panelu.
        </p>
        <label className="pole-etykieta">
          Temat (opcjonalnie)
          <select className="pole" value={temat} onChange={(e) => setTemat(e.target.value)}>
            <option value="">— ogólne / inne —</option>
            {tematy.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="pole-etykieta">
          Pytanie
          <textarea
            className="pole"
            rows={3}
            placeholder="np. Dlaczego levain czasem nie rośnie mimo dobrej temperatury?"
            value={tresc}
            onChange={(e) => { setTresc(e.target.value); setInfo('') }}
          />
        </label>
        <button className="glowny" onClick={wyslij} disabled={!tresc.trim()}>Wyślij pytanie</button>
        {info && <p className="info-ok">{info}</p>}
      </div>

      <div className="karta">
        <h2>Moje pytania</h2>
        {pytania.length === 0 && <p className="cichy">Nie masz jeszcze pytań.</p>}
        <ul className="lista-zgloszen">
          {[...pytania].reverse().map((p) => (
            <li key={p.id}>
              <div className="rzad">
                <strong>{p.tom || 'Ogólne'}</strong>
                <span className={'status-zgloszenia status-' + (p.status === 'nowe' ? 'nowe' : 'zamkniete')}>
                  {ETYKIETY_STATUSU[p.status]}
                </span>
                <span className="cichy mini">{p.data.slice(0, 10)}</span>
              </div>
              <p>{p.tresc}</p>
              {p.odpowiedz && <p className="odpowiedz-zgloszenia">↳ {p.odpowiedz}</p>}
              {p.dodacDoMaterialu && (
                <span className="ccp-tag ok">📌 wejdzie do materiału „{p.tom || 'Ogólne'}"</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Skrzynka({ pytania, onOdpowiedz, onPrzelaczFlage }) {
  const [filtr, setFiltr] = useState('nowe')
  const [odpowiedzi, setOdpowiedzi] = useState({})
  const [flagi, setFlagi] = useState({})

  const widoczne = [...pytania].reverse().filter((p) => (filtr === 'wszystkie' ? true : p.status === filtr))

  const odpowiedz = (p) => {
    onOdpowiedz(p.id, (odpowiedzi[p.id] || '').trim(), !!flagi[p.id])
  }

  return (
    <div className="zgloszenia">
      <div className="karta">
        <h2>Pytania zespołu</h2>
        <p className="cichy">
          Pytania pracowników pogłębiające wiedzę teoretyczną. Odpowiedziane i oznaczone
          „do rozszerzenia materiału" to kolejka kandydatów na nowe karty wiedzy w danym
          tomie — samo dopisanie karty to osobny, ręczny krok (poza tą wersją Panelu).
        </p>
        <div className="rzad">
          {['nowe', 'odpowiedziane', 'wszystkie'].map((f) => (
            <button key={f} className={filtr === f ? 'glowny' : 'drugi'} onClick={() => setFiltr(f)}>
              {f === 'wszystkie' ? 'wszystkie' : ETYKIETY_STATUSU[f]}
              {f !== 'wszystkie' ? ` (${pytania.filter((p) => p.status === f).length})` : ''}
            </button>
          ))}
        </div>
        {widoczne.length === 0 && <p className="cichy">Brak pytań w tym widoku.</p>}
        <ul className="lista-zgloszen">
          {widoczne.map((p) => (
            <li key={p.id}>
              <div className="rzad">
                <strong>{p.imie}</strong>
                <span className="cichy">{p.tom || 'Ogólne'}</span>
                <span className={'status-zgloszenia status-' + (p.status === 'nowe' ? 'nowe' : 'zamkniete')}>
                  {ETYKIETY_STATUSU[p.status]}
                </span>
                <span className="cichy mini">{p.data.slice(0, 10)}</span>
              </div>
              <p>{p.tresc}</p>
              {p.odpowiedz && <p className="odpowiedz-zgloszenia">↳ {p.odpowiedz}</p>}
              {p.status === 'nowe' ? (
                <div className="rzad">
                  <input
                    className="pole"
                    placeholder="Odpowiedź dla pracownika"
                    value={odpowiedzi[p.id] ?? ''}
                    onChange={(e) => setOdpowiedzi({ ...odpowiedzi, [p.id]: e.target.value })}
                  />
                  <label className="kierownik-przelacznik">
                    <input
                      type="checkbox"
                      checked={!!flagi[p.id]}
                      onChange={(e) => setFlagi({ ...flagi, [p.id]: e.target.checked })}
                    />
                    📌 do rozszerzenia materiału
                  </label>
                  <button className="drugi" onClick={() => odpowiedz(p)} disabled={!(odpowiedzi[p.id] || '').trim()}>
                    Odpowiedz
                  </button>
                </div>
              ) : (
                <label className="kierownik-przelacznik">
                  <input type="checkbox" checked={!!p.dodacDoMaterialu} onChange={() => onPrzelaczFlage(p.id)} />
                  📌 do rozszerzenia materiału „{p.tom || 'Ogólne'}"
                </label>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
