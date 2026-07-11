import { draftyWgBlokow, czyTomZatwierdzony } from '../logic/nauka.js'

// Kolejność pytań w podglądzie: od najprostszego (1) do najtrudniejszego (3),
// tak jak zobaczy je pracownik w quizie.
const RANGA_POZIOMU = { JUNIOR: 1, SAMODZIELNY: 2, MENTOR: 3 }
function wgPoziomu(pytania) {
  return [...pytania].sort((a, b) => (RANGA_POZIOMU[a.poziom] || 9) - (RANGA_POZIOMU[b.poziom] || 9))
}
// Ile pytań na każdym poziomie — właściciel widzi od razu, czy tom pokrywa 1/2/3.
function rozklad(pytania) {
  return ['JUNIOR', 'SAMODZIELNY', 'MENTOR']
    .map((poz) => `${poz[0]}${poz.slice(1).toLowerCase()}: ${pytania.filter((p) => p.poziom === poz).length}`)
    .join(' · ')
}

// Tomy DO AKCEPTACJI — właściciel/technolog przegląda materiał i pytania
// przygotowane z dokumentów Złotego Standardu, a następnie AKTYWUJE tom dla zespołu.
// Do czasu zatwierdzenia draft jest niewidoczny dla pracowników. Tomy pogrupowano
// w bloki merytoryczne (ścieżka nauki ponad podziałem na tomy).
export default function DraftReview({ zatwierdzone, onZatwierdz, onCofnij }) {
  const grupy = draftyWgBlokow()
  return (
    <div className="drafty">
      <div className="karta">
        <span className="eyebrow">Tomy do akceptacji technologa</span>
        <h1>Materiał z dokumentów — do zatwierdzenia</h1>
        <p className="cichy">
          Poniższe tomy przygotowano z dokumentów „Złotego Standardu”. Przejrzyj materiał do nauki
          i pytania. Po kliknięciu <strong>„Zatwierdź i aktywuj”</strong> tom staje się widoczny dla
          zespołu (nauka + sprawdzenie wiedzy). Do tego czasu jest nieaktywny.
        </p>
        <p className="cichy mini">
          Pytania w każdym tomie pokrywają trzy poziomy (Junior → Samodzielny → Mentor) i są tak
          ułożone w quizie. Tomy zebrano w bloki merytoryczne — spójne ścieżki nauki ponad podziałem
          na pojedyncze tomy.
        </p>
        <p className="cichy mini">
          Zasada bezpieczeństwa: drafty zawierają wyłącznie pytania wiedzy/jakości (bez CCP). Ewaluacja
          punktów krytycznych (≥92°C) pozostaje w zwalidowanym pilocie IV Wypiek. Zatwierdzenie potwierdza,
          że treść jest zgodna z dokumentem technologa.
        </p>
      </div>

      {grupy.map(({ blok, tomy }) => (
        <section key={blok.id} className="blok">
          <div className="blok-naglowek">
            <h2 className="blok-nazwa">{blok.nazwa}</h2>
            {blok.opis && <p className="cichy mini">{blok.opis}</p>}
          </div>

          {tomy.map((d) => {
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
                  <summary>Pytania sprawdzające ({d.pytania.length}) — {rozklad(d.pytania)}</summary>
                  {wgPoziomu(d.pytania).map((p) => (
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
                        if (confirm(`Aktywować tom „${d.tom}” dla zespołu? Potwierdzasz zgodność treści z dokumentem technologa.`)) {
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
        </section>
      ))}
    </div>
  )
}
