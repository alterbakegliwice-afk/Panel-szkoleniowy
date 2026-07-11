import { DRAFTY, czyTomZatwierdzony } from '../logic/nauka.js'

// Tomy DO AKCEPTACJI — właściciel/technolog przegląda materiał i pytania
// przygotowane z dokumentów Złotego Standardu, a następnie AKTYWUJE tom dla zespołu.
// Do czasu zatwierdzenia draft jest niewidoczny dla pracowników.
export default function DraftReview({ zatwierdzone, onZatwierdz, onCofnij }) {
  return (
    <div className="drafty">
      <div className="karta">
        <span className="eyebrow">Tomy do akceptacji technologa</span>
        <h1>Materiał z dokumentów — do zatwierdzenia</h1>
        <p className="cichy">
          Poniższe tomy przygotowano z dokumentów „Złotego Standardu". Przejrzyj materiał do nauki
          i pytania. Po kliknięciu <strong>„Zatwierdź i aktywuj"</strong> tom staje się widoczny dla
          zespołu (nauka + sprawdzenie wiedzy). Do tego czasu jest nieaktywny.
        </p>
        <p className="cichy mini">
          Zasada bezpieczeństwa: drafty zawierają wyłącznie pytania wiedzy/jakości (bez CCP). Ewaluacja
          punktów krytycznych (≥92°C) pozostaje w zwalidowanym pilocie IV Wypiek. Zatwierdzenie potwierdza,
          że treść jest zgodna z dokumentem technologa.
        </p>
      </div>

      {DRAFTY.map((d) => {
        const aktywny = czyTomZatwierdzony(zatwierdzone, d.tom)
        return (
          <div key={d.tom} className={aktywny ? 'karta draft draft-ok' : 'karta draft'}>
            <div className="draft-gora">
              <div>
                <h2>{d.tom}</h2>
                <p className="cichy mini">{d.obszar}</p>
              </div>
              <span className={aktywny ? 'plakietka ok' : 'plakietka toku'}>
                {aktywny ? 'AKTYWNY ✓' : 'DO AKCEPTACJI'}
              </span>
            </div>

            <details>
              <summary>Materiał do nauki ({d.nauka.karty.length} kart)</summary>
              <p className="nauka-intro">{d.nauka.intro}</p>
              {d.nauka.karty.map((k, i) => (
                <div key={i} className="draft-karta">
                  <h3>{k.tytul}</h3>
                  <ul className="nauka-punkty">
                    {k.punkty.map((p, j) => <li key={j}>{p}</li>)}
                  </ul>
                  <div className="nauka-zrodlo">Źródło: {k.zrodlo}</div>
                </div>
              ))}
            </details>

            <details>
              <summary>Pytania sprawdzające ({d.pytania.length})</summary>
              {d.pytania.map((p) => (
                <div key={p.id} className="draft-pyt">
                  <div className="draft-pyt-tresc">
                    <strong>{p.poziom}</strong> · {p.pytanie}
                  </div>
                  <div className="poprawna">
                    Poprawnie: {p.poprawne.map((i) => p.opcje[i]).join('; ')}
                  </div>
                  <div className="cichy mini">Źródło: {p.zrodlo}</div>
                </div>
              ))}
            </details>

            <div className="rzad">
              {aktywny ? (
                <button className="drugi" onClick={() => onCofnij(d.tom)}>Cofnij aktywację</button>
              ) : (
                <button
                  className="glowny"
                  onClick={() => {
                    if (confirm(`Aktywować tom „${d.tom}" dla zespołu? Potwierdzasz zgodność treści z dokumentem technologa.`)) {
                      onZatwierdz(d.tom)
                    }
                  }}
                >
                  ✓ Zatwierdź i aktywuj
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
