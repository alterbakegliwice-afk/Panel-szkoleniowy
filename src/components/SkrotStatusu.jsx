import { profilPracownika, podsumowaniePowtorek } from '../logic/progress.js'
import { glownaAkcja } from '../logic/mapaWiedzy.js'

// Pasek „stan w jednej linii" na landing page „Mój dzień".
// Po co: landing to zadania z Planera — bez tego paska blokada CCP albo
// zaległe powtórki byłyby niewidoczne, dopóki ktoś nie kliknie „Mój poziom".
// Kluczowe sygnały + JEDEN przycisk głównej akcji prowadzący do pulpitu.
export default function SkrotStatusu({ pracownik, pytania, wyniki, konfig, onPokazPoziom }) {
  const prof = profilPracownika(pytania, wyniki, pracownik.id_prac, konfig, pracownik.poziom_docelowy)
  const powtorki = podsumowaniePowtorek(pytania, wyniki, pracownik.id_prac)
  const akcja = glownaAkcja(prof, powtorki)
  const pilne = akcja.stan === 'blok'

  return (
    <div className={'karta skrot-statusu' + (pilne ? ' skrot-pilny' : '')}>
      <div className="status-chipy skrot-chipy">
        <span className="chip-status neutral" title="Średnia opanowania wszystkich tomów (bez CCP)">
          📊 poziom <strong>{Math.round(prof.poziomOgolny * 100)}%</strong>
        </span>
        <span className={`chip-status ${prof.ccpOk ? 'ok' : 'brak'}`} title="Bezpieczeństwo żywności — punkty krytyczne, próg 100%">
          {prof.ccpOk ? '✓ CCP zaliczone' : '⚠ CCP — blokada'}
        </span>
        {powtorki.liczba > 0 && (
          <span className={`chip-status ${powtorki.ccp > 0 ? 'brak' : 'toku'}`}>
            🔁 do powtórki: {powtorki.liczba}{powtorki.ccp > 0 ? ` (${powtorki.ccp} CCP)` : ''}
          </span>
        )}
      </div>
      {akcja.przycisk ? (
        <button className={pilne ? 'glowny' : 'drugi'} onClick={onPokazPoziom}>
          {akcja.naglowek} →
        </button>
      ) : (
        <span className="chip-status ok">✓ wszystko na bieżąco</span>
      )}
    </div>
  )
}
