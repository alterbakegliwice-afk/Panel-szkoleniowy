import { useState } from 'react'
import { TECHNIKA, maszynaTechniczna, postepTechniki, szukajObjawow } from '../logic/technika.js'
import { czyPrzerobiono } from '../logic/nauka.js'
import Learning from './Learning.jsx'
import Quiz from './Quiz.jsx'

// Panel Techniczny — park maszynowy na poziomie praktycznym: jak maszyna
// działa, jak czyta się jej zachowanie (objaw → diagnoza → działanie →
// granica serwisu). Nauka → quiz jak w tomach; diagnostyka dostępna ZAWSZE
// (objaw na hali nie czeka na zaliczenie quizu).
export default function Technika({ uczen, wyniki, nauka, konfig, onWynik, onPrzerobiony }) {
  const [widok, setWidok] = useState({ typ: 'lista' })
  const [fraza, setFraza] = useState('')
  const postep = postepTechniki(wyniki, uczen.id_prac, konfig?.PROG_ZALICZENIA ?? 0.8)
  const proc = (x) => Math.round(x * 100)
  const trafienia = szukajObjawow(fraza)

  if (widok.typ === 'nauka') {
    const m = maszynaTechniczna(widok.id)
    return (
      <Learning
        tytul={m.nazwa}
        material={m.nauka}
        przerobiony={czyPrzerobiono(nauka, uczen.id_prac, m.nazwa)}
        onWroc={() => setWidok({ typ: 'lista' })}
        onGotowe={() => {
          onPrzerobiony(m.nazwa)
          setWidok({ typ: 'quiz', id: m.id })
        }}
      />
    )
  }

  if (widok.typ === 'quiz') {
    const m = maszynaTechniczna(widok.id)
    return (
      <Quiz
        pracownik={uczen}
        tom={m.pytania[0].tom}
        pytania={m.pytania}
        onWynik={onWynik}
        onDoKolejki={() => {}}
        onKoniec={() => setWidok({ typ: 'lista' })}
      />
    )
  }

  if (widok.typ === 'diagnoza') {
    const m = maszynaTechniczna(widok.id)
    return (
      <div className="technika">
        <button className="cichy-link" onClick={() => setWidok({ typ: 'lista' })}>← Wróć do parku maszyn</button>
        <div className="karta nauka-naglowek">
          <span className="eyebrow">Diagnostyka · {m.kategoria}</span>
          <h1>{m.ikona} {m.nazwa}</h1>
          <p className="nauka-intro">{m.rola}</p>
        </div>

        {m.diagnostyka.map((d, i) => (
          <KartaDiagnozy key={i} d={d} />
        ))}

        <div className="karta">
          <h3>Konserwacja — kto, co, kiedy</h3>
          <div className="tabela-otoczka">
            <table className="tabela">
              <thead>
                <tr><th>Czynność</th><th>Kiedy</th><th>Kto</th></tr>
              </thead>
              <tbody>
                {m.konserwacja.map((k, i) => (
                  <tr key={i}>
                    <td>{k.co}</td>
                    <td>{k.kiedy}</td>
                    <td><span className={'diag-kto ' + (k.kto === 'serwis' || k.kto === 'serwis/dostawca' ? 'serwis' : '')}>{k.kto}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const nauczonych = TECHNIKA.maszyny.filter((m) => czyPrzerobiono(nauka, uczen.id_prac, m.nazwa)).length

  return (
    <div className="technika">
      <div className="karta naglowek-prof">
        <div>
          <span className="eyebrow">Park maszynowy — poziom praktyczny</span>
          <h1>{TECHNIKA.tytul}</h1>
          <p className="prof-purpose">{TECHNIKA.opis}</p>
        </div>
        <div className="ogolny">
          <div className="ogolny-liczba">{proc(postep.procent)}%</div>
          <div className="ogolny-etykieta">opanowanie techniki · nauka {nauczonych}/{TECHNIKA.maszyny.length}</div>
        </div>
      </div>

      <div className="karta diag-szukaj">
        <h3>🩺 Co się dzieje? — szybka diagnoza objawu</h3>
        <p className="cichy mini">
          Wpisz co widzisz/słyszysz (np. „blady spód", „pisk", „lód", „wycieka masłem"), a znajdziemy
          kartę diagnostyczną właściwej maszyny.
        </p>
        <input
          className="pole"
          type="search"
          placeholder="np. blady spód, agregat chodzi bez przerwy, pisk przy starcie…"
          value={fraza}
          onChange={(e) => setFraza(e.target.value)}
        />
        {fraza.trim().length >= 3 && !trafienia.length && (
          <p className="cichy mini">Brak dopasowań. Spróbuj innego słowa (np. „skórka", „temperatura", „olej") albo otwórz diagnostykę maszyny poniżej.</p>
        )}
        {trafienia.map(({ maszyna, diagnoza }, i) => (
          <KartaDiagnozy key={i} d={diagnoza} maszyna={maszyna} onOtworz={() => { setFraza(''); setWidok({ typ: 'diagnoza', id: maszyna.id }) }} />
        ))}
      </div>

      <div className="tomy-siatka">
        {postep.maszyny.map(({ maszyna: m, postep: pm }) => {
          const nauczony = czyPrzerobiono(nauka, uczen.id_prac, m.nazwa)
          return (
            <div key={m.id} className="karta tom">
              <div className="tom-gora">
                <h3>{m.ikona} {m.nazwa}</h3>
                <span className={pm.status === 'OPANOWANY' ? 'plakietka ok' : 'plakietka toku'}>{pm.status}</span>
              </div>
              <p className="cichy mini">{m.kategoria} · {m.rola}</p>
              <div className="postep-tor">
                <div className="postep-fill" style={{ width: proc(pm.procent) + '%' }} />
              </div>
              <div className="tom-dol">
                <span>{proc(pm.procent)}% · {pm.zaliczonych}/{pm.pytan} pytań</span>
                {nauczony && <span className="ccp-tag ok">nauka ✓</span>}
              </div>
              <div className="rzad">
                <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: m.id })}>
                  📖 Jak działa
                </button>
                <button className="drugi" onClick={() => setWidok({ typ: 'diagnoza', id: m.id })}>
                  🩺 Diagnostyka
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
                <p className="cichy mini">🔒 Quiz odblokuje się po przerobieniu „Jak działa". Diagnostyka jest zawsze dostępna.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RYZYKO = {
  jakość: { etykieta: 'ryzyko: jakość produktu', klasa: 'jakosc' },
  awaria: { etykieta: 'ryzyko: awaria maszyny', klasa: 'awaria' },
  bezpieczeństwo: { etykieta: 'ryzyko: bezpieczeństwo', klasa: 'bezp' }
}

function KartaDiagnozy({ d, maszyna, onOtworz }) {
  const r = RYZYKO[d.ryzyko] || RYZYKO['jakość']
  return (
    <div className="karta diag-karta">
      <div className="diag-gora">
        <h3>⚠ {d.objaw}</h3>
        <span className={'diag-ryzyko ' + r.klasa}>{r.etykieta}</span>
      </div>
      {maszyna && (
        <button className="cichy-link" onClick={onOtworz}>
          {maszyna.ikona} {maszyna.nazwa} — otwórz pełną diagnostykę →
        </button>
      )}
      <p className="diag-odczyt">{d.odczyt}</p>
      <div className="diag-sekcje">
        <div>
          <h4>Możliwe przyczyny</h4>
          <ul className="nauka-punkty">
            {d.przyczyny.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <div>
          <h4>Co robisz</h4>
          <ul className="nauka-punkty">
            {d.dzialania.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      </div>
      {d.serwis
        ? <p className="diag-serwis">🔧 Kiedy serwis: {d.serwis}</p>
        : <p className="diag-serwis ok">✓ Z tym poradzisz sobie bez serwisu.</p>}
    </div>
  )
}
