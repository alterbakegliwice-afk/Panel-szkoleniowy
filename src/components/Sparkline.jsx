// Mini-wykres trendu obszaru (0–100) w czasie. Czysty SVG, bez zależności.
// null = brak pomiaru danym narzędziem → punkt pomijany (linia go przeskakuje).
export default function Sparkline({ wartosci, szer = 132, wys = 34, min = 0, max = 100 }) {
  const pad = 4
  const w = szer - pad * 2
  const h = wys - pad * 2
  const n = wartosci.length
  const x = (i) => (n <= 1 ? pad : pad + (i / (n - 1)) * w)
  const y = (v) => pad + h - ((v - min) / (max - min)) * h

  const punkty = wartosci
    .map((v, i) => (v === null || v === undefined ? null : { i, v, x: x(i), y: y(v) }))
    .filter(Boolean)
  if (!punkty.length) return null

  const d = punkty.map((p, k) => (k === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ')
  const ostatni = punkty[punkty.length - 1]
  const pierwszy = punkty[0]
  // kolor kierunku: wzrost = ok, spadek = brak, płasko = akcent
  const kierunek = ostatni.v - pierwszy.v
  const kolor = kierunek > 0 ? 'var(--ok)' : kierunek < 0 ? 'var(--brak)' : 'var(--akcent)'

  return (
    <svg
      className="sparkline"
      width={szer}
      height={wys}
      viewBox={`0 0 ${szer} ${wys}`}
      role="img"
      aria-label={`Trend: ${punkty.map((p) => p.v).join(', ')}`}
    >
      <line x1={pad} y1={y(50)} x2={szer - pad} y2={y(50)} className="sparkline-os" />
      <path d={d} fill="none" stroke={kolor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {punkty.map((p) => (
        <circle key={p.i} cx={p.x} cy={p.y} r={p === ostatni ? 3 : 2} fill={kolor} />
      ))}
    </svg>
  )
}
