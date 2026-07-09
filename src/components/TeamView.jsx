import { profilPracownika } from '../logic/progress.js'

// Widok Mentora/Właściciela: postęp całego zespołu + kryterium awansu (spec.md §2, §4).
// Awans na Samodzielnego = obiektywne kryterium (sedno M5). Awans na Mentora = decyzja ludzka.
export default function TeamView({ pracownicy, pytania, wyniki, konfig }) {
  const proc = (x) => Math.round(x * 100)
  const wiersze = pracownicy.map((prac) => ({
    prac,
    prof: profilPracownika(pytania, wyniki, prac.id_prac, konfig, prac.poziom_docelowy)
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
      </p>
    </div>
  )
}
