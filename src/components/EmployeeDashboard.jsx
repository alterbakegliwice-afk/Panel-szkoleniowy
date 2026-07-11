import { profilPracownika, historiaPracownika } from '../logic/progress.js'
import { czyPrzerobiono, materialTomu, grupujWgBlokow } from '../logic/nauka.js'
import HistoryList from './HistoryList.jsx'

// Widok „MÓJ POZIOM" — najważniejszy ekran dla pracownika (spec.md §6).
// Bez żargonu. Status CCP zawsze osobno, na czerwono jeśli brak — nigdy w średniej.
export default function EmployeeDashboard({ pracownik, pytania, wyniki, kolejka, nauka, konfig, onStartQuizu, onUczSie }) {
  const prof = profilPracownika(pytania, wyniki, pracownik.id_prac, konfig, pracownik.poziom_docelowy)
  const historia = historiaPracownika(wyniki, pytania, pracownik.id_prac)
  const proc = (x) => Math.round(x * 100)
  const przerobiony = (tom) => czyPrzerobiono(nauka, pracownik.id_prac, tom)
  const wKolejce = (tom) =>
    kolejka.filter(
      (k) => k.id_prac === pracownik.id_prac && pytania.find((p) => p.id === k.id_pytania)?.tom === tom
    ).length

  return (
    <div className="dashboard">
      <div className="karta naglowek-prof">
        <div>
          <h1>{pracownik.imie}</h1>
          <p className="cichy">
            {pracownik.rola}
            {pracownik.data_startu ? ` · start: ${pracownik.data_startu}` : ''}
            {pracownik.poziom_docelowy ? ` · cel: ${pracownik.poziom_docelowy}` : ''}
          </p>
          <p className="prof-purpose">
            To, co tu opanujesz, wprost przekłada się na bezpieczeństwo naszych klientów
            i Twoją drogę do samodzielności. Każde zaliczone pytanie się liczy.
          </p>
        </div>
        <div className="ogolny">
          <div className="ogolny-liczba">{proc(prof.poziomOgolny)}%</div>
          <div className="ogolny-etykieta">ogólny poziom wiedzy</div>
          {pracownik.poziom_docelowy && (
            <div className={prof.cel.osiagniety ? 'cel-plakietka ok' : 'cel-plakietka toku'}>
              {prof.cel.osiagniety ? '✓ ' : ''}{prof.cel.etykieta}
            </div>
          )}
        </div>
      </div>

      {/* STATUS CCP — osobno, twardo, nigdy w średniej (AI_BATON §4) */}
      <div className={prof.ccpOk ? 'karta ccp ccp-ok' : 'karta ccp ccp-brak'}>
        <div className="ccp-ikona">{prof.ccpOk ? '✓' : '⚠'}</div>
        <div>
          <div className="ccp-tytul">
            Bezpieczeństwo żywności (CCP): {prof.ccpOk ? 'ZALICZONE' : 'NIEZALICZONE — BLOKADA'}
          </div>
          <div className="ccp-opis">
            {prof.ccpOk
              ? 'Wszystkie punkty krytyczne (temperatura rdzenia pieczywa, krem) potwierdzone.'
              : 'Punkty krytyczne wymagają 100%. Bez kompletu CCP nie ma statusu „Samodzielny" — niezależnie od procentu ogólnego.'}
          </div>
        </div>
      </div>

      {/* Ścieżka nauki: tomy pogrupowane w bloki merytoryczne. */}
      {grupujWgBlokow(prof.tomy).map(({ blok, tomy }) => {
        const opanowane = tomy.filter((t) => t.status === 'OPANOWANY').length
        return (
          <section key={blok.id} className="blok blok-nauka">
            <div className="blok-naglowek">
              <h2 className="blok-nazwa">{blok.nazwa}</h2>
              <span className="blok-licznik">{opanowane}/{tomy.length} opanowane</span>
            </div>
            <div className="tomy-siatka">
              {tomy.map((t) => (
                <div key={t.tom} className="karta tom">
                  <div className="tom-gora">
                    <h3>{t.tom}</h3>
                    <span className={t.status === 'OPANOWANY' ? 'plakietka ok' : 'plakietka toku'}>
                      {t.status}
                    </span>
                  </div>
                  <div className="postep-tor">
                    <div className="postep-fill" style={{ width: proc(t.procent) + '%' }} />
                  </div>
                  <div className="tom-dol">
                    <span>{proc(t.procent)}% · {t.zaliczonych}/{t.pytan} pytań</span>
                    {t.ccp.pytania.length > 0 && (
                      <span className={t.ccp.status === 'OK' ? 'ccp-tag ok' : 'ccp-tag brak'}>
                        CCP {t.ccp.status === 'OK' ? 'OK' : 'BRAK'}
                      </span>
                    )}
                  </div>
                  {wKolejce(t.tom) > 0 && (
                    <p className="cichy mini">⏳ {wKolejce(t.tom)} odp. czeka na ocenę Mentora</p>
                  )}
                  <div className="rzad tom-akcje">
                    <button className="drugi" onClick={() => onUczSie(t.tom)}>
                      📖 Ucz się{materialTomu(t.tom) ? '' : ' (wkrótce)'}
                    </button>
                    <button
                      className="drugi"
                      disabled={!przerobiony(t.tom)}
                      onClick={() => onStartQuizu(t.tom, 'cwiczenie')}
                    >
                      Ćwicz
                    </button>
                    <button
                      className="glowny"
                      disabled={!przerobiony(t.tom)}
                      onClick={() => onStartQuizu(t.tom, 'egzamin')}
                      title="Podejście na ocenę — bez podpowiedzi, liczy się do awansu"
                    >
                      Egzamin
                    </button>
                  </div>
                  {!przerobiony(t.tom) && (
                    <p className="cichy mini">🔒 Najpierw przerób materiał — potem ćwiczenie i egzamin.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <div className="karta nastepny">
        <h3>Następny krok</h3>
        <p className={prof.nastepnyKrok.typ === 'CCP' ? 'krok-ccp' : ''}>
          {prof.nastepnyKrok.tekst}
        </p>
      </div>

      <details className="karta historia-karta">
        <summary>Moja historia podejść ({historia.length})</summary>
        <HistoryList wpisy={historia} />
      </details>
    </div>
  )
}
