import { profilPracownika, historiaPracownika, podsumowaniePowtorek, interwalyPowtorek } from '../logic/progress.js'
import { czyPrzerobiono, materialTomu } from '../logic/nauka.js'
import { glownaAkcja, budujMapeWiedzy } from '../logic/mapaWiedzy.js'
import MapaWiedzy from './MapaWiedzy.jsx'
import HistoryList from './HistoryList.jsx'

// Widok „MÓJ POZIOM" — pulpit pracownika (spec.md §6), układ pod skanowanie
// wzrokiem (ADHD): odwrócona piramida ważności.
//  1. CO TERAZ — jedna rekomendowana akcja z przyciskiem (zero szukania).
//  2. Pasek chipów statusu — całość stanu w jednej linii (2 sekundy skanu).
//  3. Alarm CCP — WYŁĄCZNIE gdy jest blokada; stan OK to chip, nie krzycząca
//     karta (czerwień i rozmiar zarezerwowane dla realnych alarmów).
//  4. Powtórki (spaced retrieval) — gdy są zaległe.
//  5. Mapa wiedzy — rozproszona mapa myśli wszystkich obszarów; klik = praca.
//  6. Tomy — posortowane od najpilniejszych (CCP → w toku wg %, opanowane na końcu).
//  7. Historia — schowana w rozwijanym szczególe.
export default function EmployeeDashboard({ pracownik, pytania, pytaniaOpisowe, wyniki, kolejka, nauka, konfig, profile, onStartQuizu, onUczSie, onPowtorka, onNav }) {
  const prof = profilPracownika(pytania, wyniki, pracownik.id_prac, konfig, pracownik.poziom_docelowy)
  // historia opisuje wpisy pełnym zbiorem pytań (bank + Technika/Sprzątanie),
  // żeby quizy paneli praktycznych nie renderowały się jako „spoza banku"
  const historia = historiaPracownika(wyniki, pytaniaOpisowe || pytania, pracownik.id_prac)
  const powtorki = podsumowaniePowtorek(pytania, wyniki, pracownik.id_prac, null, interwalyPowtorek(konfig))
  const proc = (x) => Math.round(x * 100)
  const przerobiony = (tom) => czyPrzerobiono(nauka, pracownik.id_prac, tom)
  const wKolejce = (tom) =>
    kolejka.filter(
      (k) => k.id_prac === pracownik.id_prac && pytania.find((p) => p.id === k.id_pytania)?.tom === tom
    ).length
  const wKolejceRazem = kolejka.filter((k) => k.id_prac === pracownik.id_prac).length

  const akcja = glownaAkcja(prof, powtorki)
  const mapa = budujMapeWiedzy({
    prof,
    wyniki,
    idPrac: pracownik.id_prac,
    profile,
    prog: konfig.PROG_ZALICZENIA ?? 0.8
  })

  // Wspólna obsługa akcji: hero i mapa prowadzą w to samo miejsce.
  const wykonaj = (a) => {
    if (!a) return
    if (a.typ === 'powtorka') onPowtorka?.(powtorki.pozycje.map((p) => p.id))
    else if (a.typ === 'tom') (przerobiony(a.tom) ? onStartQuizu : onUczSie)(a.tom)
    else if (a.typ === 'nav') onNav?.(a.cel)
  }

  // Tomy wg pilności: blokada CCP → w toku (najniższy % pierwszy) → opanowane.
  const tomyWgPilnosci = prof.tomy.slice().sort((a, b) => {
    const ranga = (t) => (t.ccp.status === 'BRAK' ? 0 : t.status !== 'OPANOWANY' ? 1 : 2)
    return ranga(a) - ranga(b) || a.procent - b.procent
  })

  return (
    <div className="dashboard">
      {/* 1. CO TERAZ — jeden punkt skupienia z przyciskiem */}
      <div className={`karta co-teraz co-teraz-${akcja.stan}`}>
        <div className="co-teraz-tresc">
          <span className="eyebrow">Co teraz?</span>
          <h2>{akcja.naglowek}</h2>
          <p className="co-teraz-opis">{akcja.opis}</p>
          {akcja.przycisk && (
            <button className="glowny duzy-cta" onClick={() => wykonaj(akcja.akcja)}>
              {akcja.przycisk}
            </button>
          )}
        </div>

        {/* 2. Chipy statusu — cały stan w jednej skanowalnej linii */}
        <div className="status-chipy">
          <span className="chip-status neutral" title="Średnia opanowania wszystkich tomów (bez CCP)">
            📊 poziom <strong>{proc(prof.poziomOgolny)}%</strong>
          </span>
          <span className={`chip-status ${prof.ccpOk ? 'ok' : 'brak'}`} title="Bezpieczeństwo żywności — punkty krytyczne, próg 100%">
            {prof.ccpOk ? '✓ CCP zaliczone' : '⚠ CCP — blokada'}
          </span>
          {pracownik.poziom_docelowy && (
            <span className={`chip-status ${prof.cel.osiagniety ? 'ok' : 'neutral'}`}>
              🎯 {prof.cel.osiagniety ? `cel ${prof.cel.poziomDocelowy} ✓` : `cel: ${prof.cel.poziomDocelowy}`}
            </span>
          )}
          {powtorki.liczba > 0 && (
            <span className={`chip-status ${powtorki.ccp > 0 ? 'brak' : 'toku'}`}>
              🔁 do powtórki: {powtorki.liczba}{powtorki.ccp > 0 ? ` (${powtorki.ccp} CCP)` : ''}
            </span>
          )}
          {wKolejceRazem > 0 && (
            <span className="chip-status neutral">⏳ u Mentora: {wKolejceRazem}</span>
          )}
        </div>
      </div>

      {/* 3. Alarm CCP — tylko gdy realna blokada */}
      {!prof.ccpOk && (
        <div className="karta ccp ccp-brak">
          <div className="ccp-ikona">⚠</div>
          <div>
            <div className="ccp-tytul">Bezpieczeństwo żywności (CCP): NIEZALICZONE — BLOKADA</div>
            <div className="ccp-opis">
              Punkty krytyczne wymagają 100%. Bez kompletu CCP nie ma statusu „Samodzielny" —
              niezależnie od procentu ogólnego.
            </div>
          </div>
        </div>
      )}

      {/* 4. SPACED RETRIEVAL — utrwalenie wiedzy, która zaczyna zanikać.
          Otwarte, gdy powtórka jest główną akcją LUB zalega CCP (bezpieczeństwo). */}
      {powtorki.liczba > 0 && onPowtorka && (
        <details className="karta powtorki-karta" open={akcja.typ.startsWith('POWTORKA') || powtorki.ccp > 0}>
          <summary>
            🔁 Do powtórki — utrwalenie wiedzy
            <span className={powtorki.ccp > 0 ? 'ccp-tag brak' : 'ccp-tag ok'}>
              {powtorki.liczba} {powtorki.liczba === 1 ? 'pytanie' : 'pytań'}
              {powtorki.ccp > 0 ? ` · ${powtorki.ccp} CCP` : ''}
            </span>
          </summary>
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
                <span className="powtorki-pytanie">
                  {poz.pytanie.length > 64 ? poz.pytanie.slice(0, 64) + '…' : poz.pytanie}
                </span>
                <span className="cichy mini">ostatnio {poz.dniOdOstatniej} dni temu</span>
              </li>
            ))}
            {powtorki.liczba > 5 && <li className="cichy mini">…i {powtorki.liczba - 5} więcej</li>}
          </ul>
          <button className="glowny szeroki" onClick={() => onPowtorka(powtorki.pozycje.map((p) => p.id))}>
            Powtórz teraz ({powtorki.liczba}) →
          </button>
        </details>
      )}

      {/* 5. MAPA WIEDZY — rozproszona mapa myśli wszystkich obszarów */}
      <div className="karta mapa-karta tylko-desktop">
        <div className="tom-gora">
          <h3>🗺 Mapa Twojej wiedzy</h3>
          <span className="cichy mini">klik w temat = przejście do pracy · pierścień = postęp</span>
        </div>
        <MapaWiedzy centrum={mapa.centrum} wezly={mapa.wezly} onAkcja={wykonaj} />
        <p className="cichy mini mapa-legenda">
          <span className="legenda-kropka ok" /> opanowane · <span className="legenda-kropka toku" /> w toku ·{' '}
          <span className="legenda-kropka blok" /> blokada CCP · <span className="legenda-kropka info" /> nierozpoczęte
        </p>
      </div>

      {/* 5b. MAPA WIEDZY — wariant mobilny: te same węzły i akcje jako zwarta
          lista (SVG na wąskim ekranie robi się nieczytelny — spec ADHD:
          czytelność ponad efekt). */}
      <div className="karta mapa-lista-karta tylko-mobile">
        <div className="tom-gora">
          <h3>🗺 Mapa Twojej wiedzy</h3>
          <span className="cichy mini">dotknij temat = przejście do pracy</span>
        </div>
        <ul className="mapa-lista">
          {mapa.wezly.map((w) => (
            <li key={w.id}>
              <button className={`mapa-lista-wiersz mapa-lw-${w.stan}`} onClick={() => wykonaj(w.akcja)}>
                <span className={`legenda-kropka ${w.stan === 'toku' ? 'toku' : w.stan}`} />
                <span className="mapa-lista-nazwa">{w.pelna}</span>
                <span className="mapa-lista-procent">{w.procent}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 6. TOMY — od najpilniejszych */}
      <h2 className="sekcja-tytul">Tomy wiedzy <span className="cichy mini">— od najpilniejszych</span></h2>
      <div className="tomy-siatka">
        {tomyWgPilnosci.map((t) => (
          <div key={t.tom} className={'karta tom' + (t.ccp.status === 'BRAK' ? ' tom-pilny' : '')}>
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

      {/* 7. Historia — szczegół na życzenie */}
      <details className="karta historia-karta">
        <summary>Moja historia podejść ({historia.length})</summary>
        <HistoryList wpisy={historia} />
      </details>
    </div>
  )
}
