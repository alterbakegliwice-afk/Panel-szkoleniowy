import {
  ROZWOJ,
  obszar,
  obszarNauki,
  postepRozwoju,
  triangulacja,
  wskazowkiCharakteruZSerii,
  statusRetestu,
  mikropraktyki,
  postepPraktyk,
  kluczPraktyki,
  KIERUNKI_OBSERWACJI,
  nazwaNarzedzia
} from '../logic/rozwoj.js'
import { czyPrzerobiono } from '../logic/nauka.js'

// PLAN ROZWOJU do druku — jednostronicowa synteza na rozmowę rozwojową 1:1.
// Składa wszystko, co panel wie o pracowniku: priorytety (samoocena + obserwacja),
// jak go szkolić (charakter), status praktyk, termin ewaluacji. To „kartka na stół"
// podczas rozmowy Mentor–pracownik — domyka pętlę: dane → rozmowa → działanie.
export default function PlanRozwoju({ pracownik, profile, nauka, praktyki, obserwacje, onWroc }) {
  const postep = postepRozwoju(profile, pracownik.id_prac)
  const charakter = wskazowkiCharakteruZSerii(profile, pracownik.id_prac)
  const retest = statusRetestu(nauka, pracownik.id_prac, profile)
  const dzis = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  const data = (iso) => (iso || '').slice(0, 10)

  const triang = postep ? triangulacja(postep, obserwacje || [], pracownik.id_prac) : []
  const priorytety = postep
    ? triang.filter((o) => postep.priorytety.includes(o.id))
    : []

  return (
    <div className="plan-rozwoju">
      <div className="plan-akcje bez-druku">
        <button className="cichy-link" onClick={onWroc}>← Wróć</button>
        <button className="glowny" onClick={() => window.print()}>🖨 Drukuj / Zapisz PDF</button>
      </div>

      <div className="plan-arkusz">
        <header className="plan-naglowek">
          <div>
            <div className="eyebrow">Plan rozwoju — rozmowa rozwojowa</div>
            <h1>{pracownik.imie}</h1>
            <p className="cichy mini">
              {pracownik.rola}
              {pracownik.poziom_docelowy ? ` · cel: ${pracownik.poziom_docelowy}` : ''} · {dzis}
            </p>
          </div>
          {postep && (
            <div className="plan-meta">
              <div>{postep.liczbaTestow} {postep.liczbaTestow === 1 ? 'test' : 'testy/-ów'}</div>
              <div className="cichy mini">
                ostatni: {nazwaNarzedzia(postep.ostatni.narzedzie)}, {data(postep.ostatni.data)}
              </div>
            </div>
          )}
        </header>

        {!postep ? (
          <p className="cichy">
            Brak wyniku testu Work Profile. Poproś o wykonanie testu (Profil Pracy lub Mapa
            Potencjału) — dopiero wtedy plan ma z czego powstać.
          </p>
        ) : (
          <>
            <section className="plan-sekcja">
              <h2>1. Priorytety rozwojowe</h2>
              {priorytety.length === 0 ? (
                <p className="cichy mini">Brak wyraźnych obszarów do wzmocnienia — utrwalaj mocne strony.</p>
              ) : (
                <ul className="plan-lista">
                  {priorytety.map((o) => {
                    const nauczony = czyPrzerobiono(nauka, pracownik.id_prac, obszarNauki(o.id))
                    return (
                      <li key={o.id}>
                        <strong>{o.nazwa}</strong> — {o.aktualny ?? '—'}/100
                        {o.delta !== null && o.delta !== 0 && (
                          <span> ({o.delta > 0 ? '▲ +' : '▼ '}{o.delta} od poprzedniego testu)</span>
                        )}
                        {o.obserwacja && (
                          <span> · obserwacja Mentora: {KIERUNKI_OBSERWACJI[o.obserwacja.kierunek].etykieta.toLowerCase()}</span>
                        )}
                        {o.rozjazd && o.typRozjazdu === 'zawyzona' && (
                          <span className="plan-flaga"> ⚠ samoocena wyżej niż obserwacja — omówcie konkrety z praktyki</span>
                        )}
                        {o.rozjazd && o.typRozjazdu === 'zanizona' && (
                          <span className="plan-flaga"> ⚠ pracownik niedocenia swój postęp — warto docenić</span>
                        )}
                        <div className="cichy mini">{obszar(o.id)?.opis} {nauczony ? '· materiał przerobiony ✓' : '· materiał do przerobienia'}</div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {charakter && (
              <section className="plan-sekcja">
                <h2>2. Jak szkolić tę osobę (z profilu charakteru)</h2>
                <ul className="plan-lista">
                  {charakter.wskazowki.slice(0, 4).map((w) => (
                    <li key={w.klucz}><strong>{w.biegun}:</strong> {w.jakSzkolic}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="plan-sekcja">
              <h2>3. Praktyka i ewaluacja</h2>
              <ul className="plan-lista">
                {priorytety.map((o) => {
                  const pp = postepPraktyk(praktyki, pracownik.id_prac, o.id)
                  if (!pp.wszystkie) return null
                  return (
                    <li key={o.id}>
                      Mikropraktyki „{o.nazwa}": <strong>{pp.zrobione}/{pp.wszystkie}</strong> wdrożonych
                    </li>
                  )
                })}
                <li>
                  {retest && !retest.zrobionyPoNauce
                    ? retest.dojrzaly
                      ? <><strong>Retest zalecany teraz</strong> — minęło ~{retest.tygodnie} tyg. od rozpoczęcia nauki.</>
                      : <>Retest (ewaluacja) zalecany od <strong>{data(retest.celData)}</strong>.</>
                    : 'Po przerobieniu materiału i wdrożeniu praktyk — ponowny test jako ewaluacja postępu.'}
                </li>
              </ul>
            </section>

            <section className="plan-sekcja plan-ustalenia">
              <h2>4. Ustalenia (do wypełnienia na rozmowie)</h2>
              <div className="plan-linie">
                <div className="plan-linia" />
                <div className="plan-linia" />
                <div className="plan-linia" />
              </div>
            </section>
          </>
        )}

        <footer className="plan-stopka cichy mini">
          Alterbake · Platforma Szkoleniowa · plan wygenerowany {dzis}. Samoocena Work Profile to
          hipoteza — konfrontuj ją z obserwacją i konkretami z praktyki.
        </footer>
      </div>
    </div>
  )
}
