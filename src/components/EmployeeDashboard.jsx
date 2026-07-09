import { profilPracownika } from '../logic/progress.js'

// Widok „MÓJ POZIOM" — najważniejszy ekran dla pracownika (spec.md §6).
// Bez żargonu. Status CCP zawsze osobno, na czerwono jeśli brak — nigdy w średniej.
export default function EmployeeDashboard({ pracownik, pytania, wyniki, kolejka, konfig, onStartQuizu }) {
  const prof = profilPracownika(pytania, wyniki, pracownik.id_prac, konfig, pracownik.poziom_docelowy)
  const proc = (x) => Math.round(x * 100)
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

      <div className="tomy-siatka">
        {prof.tomy.map((t) => (
          <div key={t.tom} className="karta tom">
            <div className="tom-gora">
              <h3>{t.tom}</h3>
              <span className={t.status === 'OPANOWANY' ? 'plakietka ok' : 'plakietka toku'}>
                {t.status}
              </span>
            </div>
            <div className="pasek">
              <div className="pasek-wypelnienie" style={{ width: proc(t.procent) + '%' }} />
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
            <button className="glowny szeroki" onClick={() => onStartQuizu(t.tom)}>
              Rozwiąż quiz
            </button>
          </div>
        ))}
      </div>

      <div className="karta nastepny">
        <h3>Następny krok</h3>
        <p className={prof.nastepnyKrok.typ === 'CCP' ? 'krok-ccp' : ''}>
          {prof.nastepnyKrok.tekst}
        </p>
      </div>
    </div>
  )
}
