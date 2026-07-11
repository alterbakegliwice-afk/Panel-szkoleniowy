import { useState } from 'react'

// Kolejka „Do oceny" — pytania otwarte/praktyczne (i jednokrotne bez opcji w pilocie)
// czekają na Mentora. Aplikacja NIE zamyka ich automatem (spec.md §3).
export default function ReviewQueue({ kolejka, pytania, pracownicy, onOcena }) {
  if (!kolejka.length) {
    return (
      <div className="karta">
        <h1>Do oceny</h1>
        <p className="cichy">Kolejka pusta — wszystkie odpowiedzi ocenione. ✓</p>
      </div>
    )
  }
  return (
    <div className="ocena">
      <div className="karta">
        <h1>Do oceny ({kolejka.length})</h1>
        <p className="cichy">
          Porównaj odpowiedź z wzorcem i zaznacz zaliczył/nie. Przy CCP pamiętaj: próg 100%,
          bez kompromisu.
        </p>
      </div>
      {kolejka.map((wpis) => (
        <PozycjaOceny
          key={wpis.id}
          wpis={wpis}
          pytanie={pytania.find((p) => p.id === wpis.id_pytania)}
          pracownik={pracownicy.find((p) => p.id_prac === wpis.id_prac)}
          onOcena={onOcena}
        />
      ))}
    </div>
  )
}

function PozycjaOceny({ wpis, pytanie, pracownik, onOcena }) {
  const [notatka, setNotatka] = useState('')
  if (!pytanie) return null
  return (
    <div className={pytanie.ccp ? 'karta pozycja pozycja-ccp' : 'karta pozycja'}>
      <div className="pozycja-gora">
        <div>
          <strong>{pracownik?.imie || wpis.id_prac}</strong>
          <span className="cichy"> · {pytanie.tom} · {pytanie.poziom} · {pytanie.typ}</span>
        </div>
        {pytanie.ccp && <span className="ccp-tag brak">CCP · próg 100%</span>}
      </div>
      <h3 className="pozycja-pytanie">{pytanie.pytanie}</h3>

      <div className="pozycja-blok">
        <div className="etykieta-blok">Odpowiedź pracownika{pytanie.typ === 'praktyczny' ? ' / notatka' : ''}</div>
        <div className="odp-pracownika">
          {wpis.odpowiedz ? wpis.odpowiedz : <em className="cichy">
            {pytanie.typ === 'praktyczny' ? '(demonstracja na stanowisku)' : '(brak treści)'}
          </em>}
        </div>
      </div>

      <div className="pozycja-blok">
        <div className="etykieta-blok">Wzorzec (referencja Mentora)</div>
        <div className="wzorzec">{pytanie.wzorzec}</div>
        <div className="cichy mini">Źródło: {pytanie.zrodlo}</div>
      </div>

      <input
        className="pole"
        placeholder="Notatka do oceny (opcjonalnie)"
        value={notatka}
        onChange={(e) => setNotatka(e.target.value)}
      />
      <div className="rzad">
        <button className="glowny" onClick={() => onOcena(wpis.id, true, notatka)}>
          ✓ Zaliczył
        </button>
        <button className="odrzuc" onClick={() => onOcena(wpis.id, false, notatka)}>
          ✗ Nie zaliczył
        </button>
      </div>
    </div>
  )
}
