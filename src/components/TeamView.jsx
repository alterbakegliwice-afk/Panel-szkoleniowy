import { profilPracownika, historiaPracownika, tomCelOsiagniety } from '../logic/progress.js'
import HistoryList from './HistoryList.jsx'

// Widok Mentora/Właściciela: postęp całego zespołu + kryterium awansu (spec.md §2, §4).
// Awans na Samodzielnego = obiektywne kryterium (sedno M5). Awans na Mentora = decyzja ludzka.
export default function TeamView({ pracownicy, pytania, wyniki, praktyka = [], konfig, onPotwierdzPraktyke }) {
  const proc = (x) => Math.round(x * 100)
  const wiersze = pracownicy.map((prac) => ({
    prac,
    prof: profilPracownika(pytania, wyniki, prac.id_prac, konfig, prac.poziom_docelowy, praktyka)
  }))

  return (
    <div className="zespol">
      <div className="karta">
        <h1>Postęp zespołu</h1>
        <p className="cichy">
          Kryterium awansu Junior → Samodzielny jest obiektywne i delegowalne: progi + komplet CCP.
          Awans na Mentora pozostaje decyzją Właściciela.
        </p>
      </div>

      <div className="tabela-otoczka">
        <table className="tabela">
          <thead>
            <tr>
              <th>Pracownik</th>
              <th>Rola</th>
              <th>Ogólny</th>
              {pytania.length > 0 &&
                [...new Set(pytania.map((p) => p.tom))].map((tom) => <th key={tom}>{tom}</th>)}
              <th>CCP</th>
              <th>Cel / gotowość</th>
            </tr>
          </thead>
          <tbody>
            {wiersze.map(({ prac, prof }) => (
              <tr key={prac.id_prac}>
                <td>
                  <strong>{prac.imie}</strong>
                  <div className="cichy mini">{prac.id_prac} · cel: {prac.poziom_docelowy || '—'}</div>
                </td>
                <td>{prac.rola}</td>
                <td><strong>{proc(prof.poziomOgolny)}%</strong></td>
                {prof.tomy.map((t) => (
                  <td key={t.tom}>
                    <div className="komorka-tom">
                      <div className="mini-pasek">
                        <div className="mini-wypelnienie" style={{ width: proc(t.procent) + '%' }} />
                      </div>
                      <span className="mini-proc">{proc(t.procent)}%</span>
                    </div>
                  </td>
                ))}
                <td>
                  <span className={prof.ccpOk ? 'ccp-tag ok' : 'ccp-tag brak'}>
                    {prof.ccpOk ? 'OK' : 'BRAK'}
                  </span>
                </td>
                <td>
                  {prof.cel.osiagniety ? (
                    <span className="plakietka ok">{prof.cel.poziomDocelowy} ✓</span>
                  ) : (
                    <span className="plakietka toku">→ {prof.cel.poziomDocelowy}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="cichy mini">
        Kolumna „Cel / gotowość" pokazuje status względem <em>poziomu docelowego</em> pracownika
        (Pomocnik → JUNIOR, Piekarz → SAMODZIELNY itd.). „✓" = kryteria spełnione w systemie;
        formalne nadanie statusu to akcja Właściciela. Brak CCP blokuje niezależnie od procentu ogólnego.
        Kolumna CCP potwierdza <strong>wiedzę</strong> o progach — nie zastępuje rejestru HACCP
        (udokumentowany pomiar temperatur i działania korygujące w produkcji).
      </p>

      {onPotwierdzPraktyke && (
        <div className="karta">
          <h2>Potwierdzenia praktyczne (oś praktyczna)</h2>
          <p className="cichy mini">
            Wiedza z testu to nie to samo co samodzielna zmiana. Potwierdzaj <strong>tylko to, co
            realnie widziałeś/aś</strong> na stanowisku. Wymagane do awansu na Samodzielnego/Mentora,
            obok wiedzy i CCP.
          </p>
          {wiersze.filter(({ prof }) => prof.praktykaWymagana).length === 0 && (
            <p className="cichy mini">Żaden pracownik nie ma celu wymagającego potwierdzenia praktycznego.</p>
          )}
          {wiersze
            .filter(({ prof }) => prof.praktykaWymagana)
            .map(({ prac, prof }) => {
              const cel = prac.poziom_docelowy || 'SAMODZIELNY'
              const gotowe = prof.tomy.filter((t) => tomCelOsiagniety(t, cel))
              return (
                <div key={prac.id_prac} className="prakt-prac">
                  <h3>{prac.imie} <span className="cichy mini">· cel {cel}</span></h3>
                  {gotowe.length === 0 ? (
                    <p className="cichy mini">Brak tomów gotowych merytorycznie (wiedza + CCP) do potwierdzenia.</p>
                  ) : (
                    <ul className="prakt-lista">
                      {gotowe.map((t) => (
                        <li key={t.tom} className="prakt-poz">
                          <span className="prakt-tom">{t.tom}</span>
                          {t.praktyka.potwierdzona ? (
                            <span className="prakt-akcje">
                              <span className="ccp-tag ok">
                                Potwierdzone{t.praktyka.oceniajacy ? ` · ${t.praktyka.oceniajacy}` : ''}
                              </span>
                              <button className="cichy-link" onClick={() => onPotwierdzPraktyke(prac.id_prac, t.tom, false)}>
                                Cofnij
                              </button>
                            </span>
                          ) : (
                            <button className="drugi maly" onClick={() => onPotwierdzPraktyke(prac.id_prac, t.tom, true)}>
                              ✓ Potwierdź pokaz
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
        </div>
      )}

      <div className="karta">
        <h2>Historia podejść (dowód przy awansie)</h2>
        <p className="cichy mini">
          Pełny log ocen — kiedy, co, kto ocenił, z jaką notatką. To obiektywna podstawa decyzji
          o awansie, niezależna od „wyczucia".
        </p>
        {pracownicy.map((prac) => {
          const wpisy = historiaPracownika(wyniki, pytania, prac.id_prac)
          return (
            <details key={prac.id_prac} className="historia-karta">
              <summary>{prac.imie} — {prac.rola} ({wpisy.length} podejść)</summary>
              <HistoryList wpisy={wpisy} />
            </details>
          )
        })}
      </div>
    </div>
  )
}
