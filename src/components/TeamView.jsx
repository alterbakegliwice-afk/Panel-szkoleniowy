import { profilPracownika, historiaPracownika, podsumowaniePowtorek } from '../logic/progress.js'
import { podsumowanieZespolu, nazwaNarzedzia, obszar, wskazowkiCharakteruZSerii } from '../logic/rozwoj.js'
import HistoryList from './HistoryList.jsx'
import ImportWyniku from './ImportWyniku.jsx'
import ObserwacjeMentora from './ObserwacjeMentora.jsx'

// Widok Mentora/Właściciela: postęp całego zespołu + kryterium awansu (spec.md §2, §4).
// Awans na Samodzielnego = obiektywne kryterium (sedno M5). Awans na Mentora = decyzja ludzka.
export default function TeamView({ pracownicy, pytania, wyniki, konfig, profile, obserwacje, oceniajacy, onDodajProfil, onDodajObserwacje }) {
  const proc = (x) => Math.round(x * 100)
  const rozwoj = podsumowanieZespolu(profile || [], pracownicy)
  const wiersze = pracownicy.map((prac) => ({
    prac,
    prof: profilPracownika(pytania, wyniki, prac.id_prac, konfig, prac.poziom_docelowy),
    powtorki: podsumowaniePowtorek(pytania, wyniki, prac.id_prac)
  }))
  // Zaległe powtórki CCP w całym zespole = sygnał bezpieczeństwa żywności dla właściciela.
  const zalegleCcp = wiersze.reduce((s, w) => s + w.powtorki.ccp, 0)

  return (
    <div className="zespol">
      <div className="karta">
        <h1>Postęp zespołu</h1>
        <p className="cichy">
          Kryterium awansu Junior → Samodzielny jest obiektywne i delegowalne: progi + komplet CCP.
          Awans na Mentora pozostaje decyzją Właściciela.
        </p>
      </div>

      {zalegleCcp > 0 && (
        <div className="karta ccp ccp-brak">
          <div className="ccp-ikona">⚠</div>
          <div>
            <div className="ccp-tytul">Wiedza CCP do odświeżenia w zespole: {zalegleCcp}</div>
            <div className="ccp-opis">
              Pytania o bezpieczeństwo żywności zaliczone dawno temu wymagają powtórki — wiedza
              zanika. Kolumna „Do powtórki" wskazuje, kto i ile. To nie oblane CCP (status wyżej),
              tylko sygnał do zaplanowania krótkiego odświeżenia, zanim stanie się luką.
            </div>
          </div>
        </div>
      )}

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
              <th>Do powtórki</th>
              <th>Cel / gotowość</th>
            </tr>
          </thead>
          <tbody>
            {wiersze.map(({ prac, prof, powtorki }) => (
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
                  {powtorki.liczba === 0 ? (
                    <span className="cichy mini">—</span>
                  ) : powtorki.ccp > 0 ? (
                    <span className="ccp-tag brak" title="Wiedza CCP wymaga odświeżenia — ryzyko bezpieczeństwa">
                      {powtorki.liczba} · {powtorki.ccp} CCP
                    </span>
                  ) : (
                    <span className="plakietka toku">{powtorki.liczba}</span>
                  )}
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
      </p>

      <div className="karta">
        <h2>Rozwój kompetencji (Work Profile)</h2>
        <p className="cichy mini">
          Wyniki testów Work Profile per pracownik: priorytety rozwojowe z ostatniego podejścia
          i średnia zmiana po reteście (ewaluacja szkolenia). Pracownik przypisuje sobie wynik
          w zakładce „Rozwój".
        </p>
        <div className="tabela-otoczka">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pracownik</th>
                <th>Testy</th>
                <th>Ostatni test</th>
                <th>Priorytety rozwojowe</th>
                <th>Zmiana po reteście</th>
              </tr>
            </thead>
            <tbody>
              {rozwoj.map(({ prac, postep, sredniaZmiana }) => (
                <tr key={prac.id_prac}>
                  <td><strong>{prac.imie}</strong></td>
                  {postep ? (
                    <>
                      <td>{postep.liczbaTestow}</td>
                      <td>
                        {nazwaNarzedzia(postep.ostatni.narzedzie)}
                        <div className="cichy mini">{(postep.ostatni.data || '').slice(0, 10)}</div>
                      </td>
                      <td className="mini">
                        {postep.priorytety.map((id) => obszar(id)?.nazwa).join(' · ')}
                      </td>
                      <td>
                        {sredniaZmiana === null ? (
                          <span className="cichy mini">pierwsze podejście — retest będzie ewaluacją</span>
                        ) : sredniaZmiana === 0 ? (
                          <span className="cichy">= bez zmian</span>
                        ) : (
                          <span className={sredniaZmiana > 0 ? 'delta-plus' : 'delta-minus'}>
                            {sredniaZmiana > 0 ? '▲ +' : '▼ '}{sredniaZmiana} śr. / obszar
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="cichy mini">brak testu Work Profile</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {onDodajProfil && (
        <ImportWyniku
          pracownicy={pracownicy}
          profile={profile || []}
          onDodajProfil={onDodajProfil}
        />
      )}

      {onDodajObserwacje && (
        <ObserwacjeMentora
          pracownicy={pracownicy}
          profile={profile || []}
          obserwacje={obserwacje || []}
          oceniajacy={oceniajacy}
          onDodajObserwacje={onDodajObserwacje}
        />
      )}

      <div className="karta">
        <h2>Jak szkolić — profil charakteru zespołu</h2>
        <p className="cichy mini">
          Dopasowanie <em>formy</em> szkolenia do charakteru pracownika (z Mapy Potencjału).
          To nie ocena — te same treści, inna droga dotarcia. Widoczne dla pracowników,
          którzy wykonali Mapę Potencjału.
        </p>
        {pracownicy.map((prac) => {
          const ch = wskazowkiCharakteruZSerii(profile || [], prac.id_prac)
          return (
            <details key={prac.id_prac} className="historia-karta">
              <summary>
                {prac.imie} — {prac.rola}
                {ch ? ` (${ch.wskazowki.length} wskazówek)` : ' (brak Mapy Potencjału)'}
              </summary>
              {ch ? (
                <div className="charakter-lista">
                  {ch.wskazowki.map((w) => (
                    <div key={w.klucz} className="charakter-wiersz">
                      <span className="charakter-biegun">{w.nazwa}: {w.biegun}</span>
                      <span className="charakter-tip">{w.jakSzkolic}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cichy mini">
                  Ten pracownik nie ma jeszcze wyniku Mapy Potencjału (Profil Pracy nie mierzy
                  charakteru). Poproś o wykonanie testu Mapa Potencjału, by zobaczyć wskazówki.
                </p>
              )}
            </details>
          )
        })}
      </div>

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
