import { useMemo, useState } from 'react'
import { szukajObjawow, postepPozycji } from '../logic/panelPraktyczny.js'
import { czyPrzerobiono } from '../logic/nauka.js'
import Learning from './Learning.jsx'
import Quiz from './Quiz.jsx'

// Wspólny „panel praktyczny" (Technika, Sprzątanie): siatka pozycji
// (maszyn/stref) z nauką, kartami diagnostycznymi (objaw → odczyt →
// przyczyny → działania → granica serwisu), rytmem konserwacji i quizem.
// Nauka → quiz jak w tomach; diagnostyka dostępna ZAWSZE (objaw na hali
// nie czeka na zaliczenie quizu). Teksty domeny przychodzą w `etykiety`.
export default function PanelPraktyczny({
  tytul, opis, pozycje, etykiety: e,
  uczen, wyniki, nauka, konfig, onWynik, onDoKolejki = () => {}, onPrzerobiony, onZadajPytanie
}) {
  const [widok, setWidok] = useState({ typ: 'lista' })
  const [fraza, setFraza] = useState('')
  const prog = konfig?.PROG_ZALICZENIA ?? 0.8
  // postęp nie zależy od frazy szukania — bez memo każda literka w polu
  // sortowałaby od nowa cały append-only log wyników
  const postep = useMemo(
    () => postepPozycji(pozycje, wyniki, uczen.id_prac, prog),
    [pozycje, wyniki, uczen.id_prac, prog]
  )
  const proc = (x) => Math.round(x * 100)
  const trafienia = szukajObjawow(fraza, pozycje)
  const pozycja = (id) => pozycje.find((m) => m.id === id) || null

  if (widok.typ === 'nauka') {
    const m = pozycja(widok.id)
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
        onZadajPytanie={onZadajPytanie && ((tresc) => onZadajPytanie(m.nazwa, tresc))}
      />
    )
  }

  if (widok.typ === 'quiz') {
    const m = pozycja(widok.id)
    return (
      <Quiz
        pracownik={uczen}
        tom={m.pytania[0]?.tom}
        pytania={m.pytania}
        onWynik={onWynik}
        onDoKolejki={onDoKolejki}
        onKoniec={() => setWidok({ typ: 'lista' })}
        koniecTekst={e.wrocLista.replace('← ', '')}
      />
    )
  }

  if (widok.typ === 'diagnoza') {
    const m = pozycja(widok.id)
    const nauczony = czyPrzerobiono(nauka, uczen.id_prac, m.nazwa)
    return (
      <div className="technika">
        <div className="rzad bez-druku">
          <button className="cichy-link" onClick={() => setWidok({ typ: 'lista' })}>{e.wrocLista}</button>
          <button className="cichy-link" onClick={() => window.print()}>{e.drukBtn}</button>
        </div>
        <div className="karta nauka-naglowek">
          <span className="eyebrow">{e.eyebrowDiagnoza} · {m.kategoria}</span>
          <h1>{m.ikona} {m.nazwa}</h1>
          <p className="nauka-intro">{m.rola}</p>
        </div>

        {m.diagnostyka.map((d, i) => (
          <KartaDiagnozy key={i} d={d} />
        ))}

        {m.dokumentacja?.length > 0 && (
          <div className="karta">
            <h3>{e.dokTytul}</h3>
            <p className="cichy mini">{e.dokOpis}</p>
            <ul className="nauka-punkty">
              {m.dokumentacja.map((d, i) => (
                <li key={i}>
                  <a href={d.url} target="_blank" rel="noreferrer">{d.tytul}</a>
                  {d.typ && <span className="cichy mini"> · {d.typ}</span>}
                  {d.uwaga && <span className="cichy mini"> — {d.uwaga}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="karta">
          <h3>{e.konserwacjaTytul}</h3>
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
                    <td><span className={'diag-kto ' + (czyZewnetrzny(k.kto) ? 'serwis' : '')}>{String(k.kto || '—')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="karta nauka-cta bez-druku">
          <p className="cichy">{nauczony ? e.ctaNauczony : e.ctaBrak}</p>
          <div className="rzad">
            <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: m.id })}>{e.naukaBtn}</button>
            <button className="glowny" disabled={!nauczony || !m.pytania.length} onClick={() => setWidok({ typ: 'quiz', id: m.id })}>
              Sprawdź wiedzę →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const nauczonych = pozycje.filter((m) => czyPrzerobiono(nauka, uczen.id_prac, m.nazwa)).length

  return (
    <div className="technika">
      <div className="karta naglowek-prof">
        <div>
          <span className="eyebrow">{e.eyebrowLista}</span>
          <h1>{tytul}</h1>
          <p className="prof-purpose">{opis}</p>
        </div>
        <div className="ogolny">
          <div className="ogolny-liczba">{proc(postep.procent)}%</div>
          <div className="ogolny-etykieta">{e.postepEtykieta} · nauka {nauczonych}/{pozycje.length}</div>
        </div>
      </div>

      <div className="karta diag-szukaj">
        <h3>{e.szukajTytul}</h3>
        <p className="cichy mini">{e.szukajOpis}</p>
        <input
          className="pole"
          type="search"
          placeholder={e.szukajPlaceholder}
          value={fraza}
          onChange={(ev) => setFraza(ev.target.value)}
        />
        {fraza.trim().length >= 3 && !trafienia.length && (
          <p className="cichy mini">{e.szukajBrak}</p>
        )}
        {trafienia.map(({ maszyna, diagnoza }, i) => (
          <KartaDiagnozy key={i} d={diagnoza} maszyna={maszyna} otworzTekst={e.otworzTekst}
            onOtworz={() => { setFraza(''); setWidok({ typ: 'diagnoza', id: maszyna.id }) }} />
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
                {pm.ccpPytan > 0 && (
                  <span className={pm.ccpOk ? 'ccp-tag ok' : 'ccp-tag brak'}>
                    CCP {pm.ccpOk ? 'OK' : 'DO ZALICZENIA'}
                  </span>
                )}
                {nauczony && <span className="ccp-tag ok">nauka ✓</span>}
              </div>
              <div className="rzad">
                <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: m.id })}>
                  {e.naukaBtn}
                </button>
                <button className="drugi" onClick={() => setWidok({ typ: 'diagnoza', id: m.id })}>
                  {e.diagBtn}
                </button>
                <button
                  className="glowny"
                  disabled={!nauczony || !m.pytania.length}
                  onClick={() => setWidok({ typ: 'quiz', id: m.id })}
                >
                  Sprawdź wiedzę
                </button>
              </div>
              {!nauczony && (
                <p className="cichy mini">{e.quizLockInfo}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// „Kto" to wolny tekst z danych (bywa mieszany: „kierownik/serwis",
// „kierownik/firma DDD"); wyróżniamy każdy wpis angażujący wykonawcę
// zewnętrznego — to informacja o granicy kompetencji pracownika.
// Odporne na brak pola (String(undefined) nie rzuca).
function czyZewnetrzny(kto) {
  return /serwis|ddd|dostawc|hydraulik|firma/i.test(String(kto || ''))
}

const RYZYKO = {
  jakość: { etykieta: 'ryzyko: jakość produktu', klasa: 'jakosc' },
  awaria: { etykieta: 'ryzyko: awaria maszyny', klasa: 'awaria' },
  bezpieczeństwo: { etykieta: 'ryzyko: bezpieczeństwo', klasa: 'bezp' }
}

function KartaDiagnozy({ d, maszyna, onOtworz, otworzTekst }) {
  const r = RYZYKO[d.ryzyko] || RYZYKO['jakość']
  return (
    <div className="karta diag-karta">
      <div className="diag-gora">
        <h3>⚠ {d.objaw}</h3>
        <span className={'diag-ryzyko ' + r.klasa}>{r.etykieta}</span>
      </div>
      {maszyna && (
        <button className="cichy-link" onClick={onOtworz}>
          {maszyna.ikona} {maszyna.nazwa} {otworzTekst}
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
