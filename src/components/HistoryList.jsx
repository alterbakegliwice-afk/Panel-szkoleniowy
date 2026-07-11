// Lista podejść z logu append-only. Używana w „Mój poziom" (pracownik)
// i w widoku Zespołu (Mentor/Właściciel — dowód przy decyzji o awansie).

function formatData(d) {
  if (!d) return '—'
  return d.length > 10 ? d.slice(0, 10) + ' ' + d.slice(11, 16) : d
}

export default function HistoryList({ wpisy }) {
  if (!wpisy.length) return <p className="cichy mini">Brak podejść w historii.</p>
  return (
    <div className="historia">
      {wpisy.map((w, i) => (
        <div key={i} className="hist-wiersz">
          <span className={w.zaliczyl ? 'hist-znak ok' : 'hist-znak zle'}>
            {w.zaliczyl ? '✓' : '✗'}
          </span>
          <div className="hist-tresc">
            <div className="hist-gora">
              <span className="hist-pyt">{w.pytanie}</span>
              {w.ccp && <span className="ccp-tag brak">CCP</span>}
            </div>
            <div className="hist-meta cichy mini">
              {formatData(w.data)} · {w.tom} · {w.poziom} · ocena: {w.oceniajacy}
              {w.notatka ? ` · „${w.notatka}"` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
