// Zasady awansu — widok w aplikacji (blind spot #4: sam pomiar nie deleguje).
// Kryteria muszą być widoczne TAM, gdzie zapada decyzja — nie tylko w repozytorium.
// Pełna wersja: docs/POLITYKA_AWANSU.md. Ten widok to jej operacyjne streszczenie.
export default function PromotionPolicy({ prog = 0.8 }) {
  const progProc = Math.round(prog * 100)
  return (
    <div className="polityka">
      <div className="karta">
        <span className="eyebrow">Kryterium obiektywne i delegowalne</span>
        <h1>Zasady awansu</h1>
        <p className="cichy">
          Awans nie zależy od wyczucia — zależy od trzech mierzalnych osi. Ten ekran jest
          streszczeniem operacyjnym; pełna polityka żyje w <code>docs/POLITYKA_AWANSU.md</code>.
        </p>
      </div>

      <div className="karta">
        <h2>Trzy osie awansu na Samodzielnego (wszystkie wymagane)</h2>
        <ol className="polityka-osie">
          <li>
            <strong>Wiedza</strong> — w każdym tomie poziom Junior i Samodzielny na ≥ {progProc}%.
            Liczy się <strong>egzamin</strong> (bez podpowiedzi, losowa próbka, przetasowane opcje),
            nie ćwiczenie. Ćwiczenie uczy i nie jest zapisywane.
          </li>
          <li>
            <strong>CCP — bezpieczeństwo żywności</strong> — próg <strong>100%</strong>, liczony
            osobno, nigdy w średniej. Oblane jedno pytanie CCP = blokada, niezależnie od procentu ogólnego.
          </li>
          <li>
            <strong>Potwierdzenie praktyczne</strong> — Mentor/Właściciel widział wykonanie na
            stanowisku i potwierdził je w zakładce „Zespół". Wiedza z testu ≠ samodzielna zmiana.
          </li>
        </ol>
        <p className="cichy mini">
          Dla poziomu Junior wymagane są osie 1 i 2 (praktyka jeszcze nie — junior się uczy).
        </p>
      </div>

      <div className="karta">
        <h2>Co uruchamia awans</h2>
        <p>
          Zielony status = spełnione kryteria, <strong>nie</strong> automatyczny awans. Po zieleni:
        </p>
        <ol className="polityka-osie">
          <li>Zweryfikuj <strong>historię podejść</strong> (log w „Zespół") — dowód, że wynik jest realny.</li>
          <li>Krótka rozmowa + <strong>formalna zmiana</strong> (stawka / zakres / grafik).</li>
          <li>Wpis daty awansu do dokumentacji kadrowej.</li>
        </ol>
      </div>

      <div className="karta">
        <h2>Kto decyduje</h2>
        <ul className="polityka-osie">
          <li>Praktyka i awans na <strong>Samodzielnego</strong>: Mentor lub Właściciel.</li>
          <li>Awans na <strong>Mentora</strong>: wyłącznie Właściciel (decyzja ludzka).</li>
          <li>Utrzymanie treści (akceptacja tomów): patrz <code>docs/RUNBOOK_TRESC.md</code>.</li>
        </ul>
        <p className="cichy mini">
          Panel nie jest rejestrem HACCP ani umową — quiz CCP sprawdza wiedzę o progach, formalny
          awans żyje w kadrach.
        </p>
      </div>
    </div>
  )
}
