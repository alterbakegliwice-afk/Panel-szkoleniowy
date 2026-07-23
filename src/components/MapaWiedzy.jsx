// Rozproszona mapa myśli wiedzy — czysty SVG, zero zależności.
// Węzeł centralny (uczeń, poziom ogólny) + powiązane tematy w trzech sektorach:
// tomy wiedzy (góra), praktyka: Technika/Sprzątanie (prawy dół), Rozwój (lewy dół).
// Każdy węzeł: pierścień postępu + % + etykieta; klik = przejście do pracy.
// Layout deterministyczny (bez losowości) z lekkim „rozproszeniem" promienia,
// żeby mapa czytała się organicznie, a nie jak sztywny diagram.

const SEKTORY = {
  tomy: { od: -172, do: -35 }, // szeroki łuk górny — tomów będzie przybywać
  praktyka: { od: 18, do: 72 }, // odsunięte od końca łuku tomów (bez kolizji etykiet)
  rozwoj: { od: 108, do: 162 }
}

const KOLORY = {
  ok: 'var(--ok)',
  toku: 'var(--toku)',
  blok: 'var(--brak)',
  info: 'var(--cichy)'
}

const SZER = 920
const WYS = 470
const CX = SZER / 2
const CY = WYS / 2 - 10

function pozycje(wezly) {
  // Węzły grupy rozmieszczone równomiernie w sektorze; promień przeplatany
  // (bliżej/dalej) = rozproszenie bez kolizji etykiet.
  const wynik = []
  for (const [grupa, zakres] of Object.entries(SEKTORY)) {
    const grupowe = wezly.filter((n) => n.grupa === grupa)
    grupowe.forEach((n, i) => {
      const krok = (zakres.do - zakres.od) / Math.max(1, grupowe.length - 1 || 1)
      const kat = grupowe.length === 1
        ? (zakres.od + zakres.do) / 2
        : zakres.od + i * krok
      const rad = (kat * Math.PI) / 180
      const promien = 150 + (i % 2) * 42 // przeplot: 150 / 192
      wynik.push({
        ...n,
        x: CX + Math.cos(rad) * promien * 1.55, // elipsa — ekran jest szerszy niż wyższy
        y: CY + Math.sin(rad) * promien
      })
    })
  }
  return wynik
}

function Wezel({ n, onAkcja }) {
  const r = 26
  const obwod = 2 * Math.PI * (r + 5)
  const p = typeof n.procent === 'number' ? Math.max(0, Math.min(1, n.procent)) : null
  const kolor = KOLORY[n.stan] || KOLORY.info
  // bez onAkcja mapa jest statycznym przeglądem (np. widok Zespołu u Właściciela)
  const klikalna = typeof onAkcja === 'function'
  const interakcje = klikalna
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: () => onAkcja(n.akcja),
        onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onAkcja(n.akcja)
      }
    : {}
  return (
    <g
      className={'mapa-wezel' + (klikalna ? '' : ' mapa-wezel-statyczny')}
      transform={`translate(${n.x} ${n.y})`}
      aria-label={`${n.pelna || n.etykieta}${p !== null ? ` — ${Math.round(p * 100)}%` : ''}`}
      {...interakcje}
    >
      <title>{n.pelna || n.etykieta}</title>
      {/* pierścień postępu */}
      <circle r={r + 5} fill="none" stroke="var(--karta-inset)" strokeWidth="5" />
      {p !== null && p > 0 && (
        <circle
          r={r + 5}
          fill="none"
          stroke={kolor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${obwod * p} ${obwod}`}
          transform="rotate(-90)"
        />
      )}
      <circle r={r} className={`mapa-kolo mapa-${n.stan}`} />
      <text className="mapa-procent" textAnchor="middle" dy="4">
        {n.stan === 'blok' ? '⚠' : p !== null ? Math.round(p * 100) + '%' : '?'}
      </text>
      <text className="mapa-etykieta" textAnchor="middle" y={r + 22}>
        {n.etykieta}
      </text>
    </g>
  )
}

export default function MapaWiedzy({ centrum, wezly, onAkcja }) {
  const ulozone = pozycje(wezly)
  const pc = Math.max(0, Math.min(1, centrum.procent || 0))
  const rC = 42
  const obwodC = 2 * Math.PI * (rC + 6)
  return (
    <svg
      className="mapa-wiedzy"
      viewBox={`0 0 ${SZER} ${WYS}`}
      role="img"
      aria-label="Mapa wiedzy: wszystkie obszary nauki i ich postęp"
    >
      {/* powiązania: łagodne łuki od centrum do tematów */}
      {ulozone.map((n) => {
        const mx = (CX + n.x) / 2
        const my = (CY + n.y) / 2 - 24 // kontrolny punkt lekko w górę = organiczny łuk
        return (
          <path
            key={'l:' + n.id}
            className="mapa-nic"
            d={`M ${CX} ${CY} Q ${mx} ${my} ${n.x} ${n.y}`}
          />
        )
      })}

      {/* centrum: uczeń + poziom ogólny */}
      <g className="mapa-centrum">
        <circle cx={CX} cy={CY} r={rC + 6} fill="none" stroke="var(--karta-inset)" strokeWidth="6" />
        {pc > 0 && (
          <circle
            cx={CX}
            cy={CY}
            r={rC + 6}
            fill="none"
            stroke="var(--akcent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${obwodC * pc} ${obwodC}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        )}
        <circle cx={CX} cy={CY} r={rC} className="mapa-kolo-centrum" />
        <text x={CX} y={CY - 2} textAnchor="middle" className="mapa-centrum-proc">
          {Math.round(pc * 100)}%
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" className="mapa-centrum-podpis">
          {centrum.etykieta}
        </text>
      </g>

      {ulozone.map((n) => (
        <Wezel key={n.id} n={n} onAkcja={onAkcja} />
      ))}
    </svg>
  )
}
