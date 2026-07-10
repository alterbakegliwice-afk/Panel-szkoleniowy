// Ekran NAUKI (merytoryka). Uniwersalny: tomy piekarza i moduły przedsiębiorcy.
// Zasada Piotra: najpierw materiał, DOPIERO potem sprawdzenie wiedzy.
export default function Learning({ tytul, material, przerobiony, onGotowe, onWroc }) {
  if (!material) {
    return (
      <div className="karta">
        <p>Materiał do nauki dla „{tytul}" jest w przygotowaniu.</p>
        <button className="drugi" onClick={onWroc}>← Wróć</button>
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
          Przeczytałeś materiał? Sprawdź, ile już wiesz — spokojnie, z natychmiastową informacją zwrotną
          po każdej odpowiedzi.
        </p>
        <button className="glowny duzy-cta szeroki" onClick={onGotowe}>
          Przerobiłem materiał — przejdź do sprawdzenia →
        </button>
      </div>
    </div>
  )
}
