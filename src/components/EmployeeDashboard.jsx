import { profilPracownika, historiaPracownika, podsumowaniePowtorek } from '../logic/progress.js'
import { czyPrzerobiono, materialTomu } from '../logic/nauka.js'
import HistoryList from './HistoryList.jsx'

// Widok „MÓJ POZIOM" — najważniejszy ekran dla pracownika (spec.md §6).
// Bez żargonu. Status CCP zawsze osobno, na czerwono jeśli brak — nigdy w średniej.
export default function EmployeeDashboard({ pracownik, pytania, pytaniaOpisowe, wyniki, kolejka, nauka, konfig, onStartQuizu, onUczSie, onPowtorka }) {
  const prof = profilPracownika(pytania, wyniki, pracownik.id_prac, konfig, pracownik.poziom_docelowy)
  // historia opisuje wpisy pełnym zbiorem pytań (bank + Technika/Sprzątanie),
  // żeby quizy paneli praktycznych nie renderowały się jako „spoza banku"
  const historia = historiaPracownika(wyniki, pytaniaOpisowe || pytania, pracownik.id_prac)
  // pytaniaOpisowe też tu: inaczej CCP4/CCP1 z Techniki nigdy nie „dojrzeją" do powtórki
  const powtorki = podsumowaniePowtorek(pytaniaOpisowe || pytania, wyniki, pracownik.id_prac)
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

      {/* SPACED RETRIEVAL — utrwalenie wiedzy, która zaczyna zanikać */}
      {powtorki.liczba > 0 && onPowtorka && (
        <div className="karta powtorki-karta">
          <div className="tom-gora">
            <h3>🔁 Do powtórki — utrwalenie wiedzy</h3>
            <span className={powtorki.ccp > 0 ? 'ccp-tag brak' : 'ccp-tag ok'}>
              {powtorki.liczba} {powtorki.liczba === 1 ? 'pytanie' : 'pytań'}
              {powtorki.ccp > 0 ? ` · ${powtorki.ccp} CCP` : ''}
            </span>
          </div>
          <p className="cichy mini">
            Te pytania zaliczyłeś jakiś czas temu — wiedza zanika, jeśli jej nie odświeżasz.
            Krótka powtórka teraz utrwala ją na długo (dowód: rozłożone powtarzanie daje 2–3× lepszą
            retencję).{powtorki.ccp > 0 && ' Pytania CCP (bezpieczeństwo żywności) są pierwsze — to najważniejsze.'}
          </p>
          <ul className="powtorki-lista">
            {powtorki.pozycje.slice(0, 5).map((poz) => (
              <li key={poz.id}>
                <span className="powtorki-tom">{poz.tom}</span>
                {poz.ccp && <span className="ccp-tag brak">CCP</span>}
                <span className="cichy mini">ostatnio {poz.dniOdOstatniej} dni temu</span>
              </li>
            ))}
            {powtorki.liczba > 5 && <li className="cichy mini">…i {powtorki.liczba - 5} więcej</li>}
          </ul>
          <button className="glowny szeroki" onClick={() => onPowtorka(powtorki.pozycje.map((p) => p.id))}>
            Powtórz teraz ({powtorki.liczba}) →
          </button>
        </div>
      )}

      <div className="tomy-siatka">
        {prof.tomy.map((t) => (
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
                className="glowny"
                disabled={!przerobiony(t.tom)}
                onClick={() => onStartQuizu(t.tom)}
              >
                Sprawdź wiedzę
              </button>
            </div>
            {!przerobiony(t.tom) && (
              <p className="cichy mini">🔒 Najpierw przerób materiał — potem sprawdzenie wiedzy.</p>
            )}
          </div>
        ))}
      </div>

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
