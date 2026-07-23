import { useState } from 'react'
import {
  PRZEDSIEBIORCA,
  ID_WLASCICIEL,
  czyPrzerobiono,
  postepPrzedsiebiorcy
} from '../logic/nauka.js'
import Learning from './Learning.jsx'
import Quiz from './Quiz.jsx'
import { kartyTomu } from '../logic/rozszerzenia.js'

// Moduł Przedsiębiorcy — tylko dla właściciela. Każdy moduł: najpierw nauka,
// potem sprawdzenie wiedzy. Wyniki logują się pod osobnym id (WLASCICIEL),
// więc nie mieszają się z postępem zespołu.
export default function EntrepreneurPanel({ stan, onWynik, onPrzerobiony, onZadajPytanie, rozszerzenia = [] }) {
  const [widok, setWidok] = useState({ typ: 'lista' })
  const owner = { id_prac: ID_WLASCICIEL, imie: 'Właściciel', poziom_docelowy: 'MENTOR' }
  const postep = postepPrzedsiebiorcy(stan.wyniki, ID_WLASCICIEL, stan.konfig?.PROG_ZALICZENIA ?? 0.8)
  const proc = (x) => Math.round(x * 100)
  const modul = (id) => PRZEDSIEBIORCA.moduly.find((m) => m.id === id)

  if (widok.typ === 'nauka') {
    const m = modul(widok.id)
    return (
      <Learning
        tytul={m.tytul}
        material={m.nauka}
        kartyDodatkowe={kartyTomu(m.tytul, rozszerzenia)}
        przerobiony={czyPrzerobiono(stan.nauka, ID_WLASCICIEL, m.tytul)}
        onWroc={() => setWidok({ typ: 'lista' })}
        onGotowe={() => {
          onPrzerobiony(m.tytul)
          setWidok({ typ: 'quiz', id: m.id })
        }}
        onZadajPytanie={onZadajPytanie && ((tresc) => onZadajPytanie(m.tytul, tresc))}
      />
    )
  }

  if (widok.typ === 'quiz') {
    const m = modul(widok.id)
    return (
      <Quiz
        pracownik={owner}
        tom={m.tytul}
        pytania={m.pytania}
        onWynik={onWynik}
        onDoKolejki={() => {}}
        onKoniec={() => setWidok({ typ: 'lista' })}
      />
    )
  }

  return (
    <div className="przedsiebiorca">
      <div className="karta naglowek-prof">
        <div>
          <span className="eyebrow">Kompendium tylko dla właściciela</span>
          <h1>{PRZEDSIEBIORCA.tytul}</h1>
          <p className="prof-purpose">{PRZEDSIEBIORCA.opis}</p>
        </div>
        <div className="ogolny">
          <div className="ogolny-liczba">{proc(postep.procent)}%</div>
          <div className="ogolny-etykieta">opanowanie modułu</div>
        </div>
      </div>

      <div className="tomy-siatka">
        {postep.moduly.map(({ modul: m, postep: pm }) => {
          const nauczony = czyPrzerobiono(stan.nauka, ID_WLASCICIEL, m.tytul)
          return (
            <div key={m.id} className="karta tom">
              <div className="tom-gora">
                <h3>{m.tytul}</h3>
                <span className={pm.status === 'OPANOWANY' ? 'plakietka ok' : 'plakietka toku'}>{pm.status}</span>
              </div>
              <p className="cichy mini">{m.obszar}</p>
              <div className="postep-tor">
                <div className="postep-fill" style={{ width: proc(pm.procent) + '%' }} />
              </div>
              <div className="tom-dol">
                <span>{proc(pm.procent)}% · {pm.zaliczonych}/{pm.pytan} pytań</span>
                {nauczony && <span className="ccp-tag ok">nauka ✓</span>}
              </div>
              <div className="rzad">
                <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: m.id })}>
                  📖 Ucz się
                </button>
                <button
                  className="glowny"
                  disabled={!nauczony}
                  onClick={() => setWidok({ typ: 'quiz', id: m.id })}
                >
                  Sprawdź wiedzę
                </button>
              </div>
              {!nauczony && (
                <p className="cichy mini">🔒 Sprawdzenie odblokuje się po przerobieniu materiału.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
