import { useState } from 'react'

// Ekran NAUKI (merytoryka). Uniwersalny: tomy piekarza, moduły przedsiębiorcy,
// moduły rozwoju kompetencji (Work Profile) i panele praktyczne (Technika,
// Sprzątanie).
// Zasada Piotra: najpierw materiał, DOPIERO potem sprawdzenie wiedzy.
// ctaTekst/ctaOpis: moduły rozwojowe nie kończą się quizem — ewaluacją jest
// ponowne wykonanie testu Work Profile, więc przycisk mówi co innego.
// onZadajPytanie (opcjonalny): rodzic wie już, kim jest uczący się i jaki to
// tom — Learning tylko zbiera treść pytania (warstwa teoretyczna, patrz
// logic/pytaniaMistrza.js).
export default function Learning({ tytul, material, przerobiony, onGotowe, onWroc, ctaTekst, ctaOpis, onZadajPytanie }) {
  if (!material) {
    return (
      <div className="karta">
        <p>Materiał do nauki dla „{tytul}" jest w przygotowaniu.</p>
        <button className="drugi" onClick={onWroc}>← Wróć</button>
        {onZadajPytanie && <PytanieBox onZadajPytanie={onZadajPytanie} />}
      </div>
    )
  }
  return (
    <div className="nauka-ekran">
      <button className="cichy-link" onClick={onWroc}>← Wróć</button>

      <div className="karta nauka-naglowek">
        <span className="eyebrow">Materiał do nauki</span>
        <h1>{tytul}</h1>
        <p className="nauka-intro">{material.intro}</p>
      </div>

      {material.karty.map((k, i) => (
        <div key={i} className="karta nauka-karta">
          <h3>{k.tytul}</h3>
          <ul className="nauka-punkty">
            {k.punkty.map((p, j) => <li key={j}>{p}</li>)}
          </ul>
          <div className="nauka-zrodlo">Źródło: {k.zrodlo}</div>
        </div>
      ))}

      <div className="karta nauka-cta">
        {przerobiony && <span className="cel-plakietka ok">✓ Materiał już przerobiony</span>}
        <p className="cichy">
          {ctaOpis ||
            'Przeczytałeś materiał? Sprawdź, ile już wiesz — spokojnie, z natychmiastową informacją zwrotną po każdej odpowiedzi.'}
        </p>
        <button className="glowny duzy-cta szeroki" onClick={onGotowe}>
          {ctaTekst || 'Przerobiłem materiał — przejdź do sprawdzenia →'}
        </button>
      </div>

      {onZadajPytanie && <PytanieBox onZadajPytanie={onZadajPytanie} />}
    </div>
  )
}

function PytanieBox({ onZadajPytanie }) {
  const [tresc, setTresc] = useState('')
  const [wyslane, setWyslane] = useState(false)

  const wyslij = () => {
    if (!tresc.trim()) return
    onZadajPytanie(tresc)
    setTresc('')
    setWyslane(true)
  }

  return (
    <div className="karta">
      <h3>❓ Masz pytanie o ten materiał?</h3>
      <p className="cichy mini">
        Czegoś brakuje albo chcesz wiedzieć więcej? Zapytaj — Właściciel/Mentor odpowie,
        a dobre pytanie może rozszerzyć ten dział o nową kartę wiedzy.
      </p>
      <textarea
        className="pole"
        rows={2}
        placeholder="np. Co zrobić, jeśli zakwas nie ma zapachu w ogóle?"
        value={tresc}
        onChange={(e) => { setTresc(e.target.value); setWyslane(false) }}
      />
      <button className="drugi" onClick={wyslij} disabled={!tresc.trim()}>Wyślij pytanie</button>
      {wyslane && <p className="info-ok">Pytanie zapisane — odpowiedź zobaczysz w zakładce „Pytania".</p>}
    </div>
  )
}
