import { useState } from 'react'

// Logowanie = prosty wybór profilu z listy + opcjonalny PIN (spec.md §2).
// Bez OAuth. Piekarnia, nie bank.
export default function ProfilePicker({ pracownicy, ownerPin = '', onWybor }) {
  const [pinDla, setPinDla] = useState(null) // profil wymagający PIN (pracownik lub właściciel)
  const [pin, setPin] = useState('')
  const [blad, setBlad] = useState('')

  const wybierz = (prac) => {
    if (prac.pin) {
      setPinDla(prac)
      setPin('')
      setBlad('')
    } else {
      onWybor({ rodzaj: 'pracownik', idPrac: prac.id_prac })
    }
  }

  const wejdzWlasciciel = () => {
    if (ownerPin) {
      setPinDla({ wlasciciel: true, imie: 'Właściciel (Piotr)', pin: ownerPin })
      setPin('')
      setBlad('')
    } else {
      onWybor({ rodzaj: 'wlasciciel' })
    }
  }

  const potwierdzPin = () => {
    if (pin !== pinDla.pin) {
      setBlad('Błędny PIN.')
    } else if (pinDla.wlasciciel) {
      onWybor({ rodzaj: 'wlasciciel' })
    } else {
      onWybor({ rodzaj: 'pracownik', idPrac: pinDla.id_prac })
    }
  }

  if (pinDla) {
    return (
      <div className="karta wybor">
        <h1>PIN dla: {pinDla.imie}</h1>
        <p className="cichy">Ten profil jest chroniony 4-cyfrowym PIN-em.</p>
        <input
          className="pin-input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          autoFocus
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''))
            setBlad('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && potwierdzPin()}
        />
        {blad && <p className="blad">{blad}</p>}
        <div className="rzad">
          <button className="glowny" onClick={potwierdzPin}>Wejdź</button>
          <button className="drugi" onClick={() => setPinDla(null)}>Wstecz</button>
        </div>
      </div>
    )
  }

  return (
    <div className="karta wybor">
      <div className="wybor-marka">Złoty Standard Piekarstwa</div>
      <h1>Kto się uczy?</h1>
      <p className="cichy">Wybierz swój profil, żeby zobaczyć swój poziom wiedzy i kolejny krok.</p>
      <div className="lista-profili">
        {pracownicy.map((p) => (
          <button key={p.id_prac} className="profil-kafel" onClick={() => wybierz(p)}>
            <span className="profil-imie">{p.imie}</span>
            <span className="profil-rola">{p.rola}{p.pin ? ' · 🔒' : ''}</span>
          </button>
        ))}
      </div>
      <div className="separator"><span>lub</span></div>
      <button
        className="glowny szeroki"
        onClick={wejdzWlasciciel}
      >
        Wejdź jako Właściciel (Piotr){ownerPin ? ' · 🔒' : ''}
      </button>
      <p className="cichy mini">
        Właściciel: pełny widok zespołu, ocena, konfiguracja progów i eksport do Panelu M5.
      </p>
      <p className="cichy mini kiosk-nota">
        To jest jedno stanowisko szkoleniowe — dane żyją w tej przeglądarce. Ustaw PIN-y profili
        (w Konfiguracji) i regularnie rób kopię zapasową, jeśli z urządzenia korzysta kilka osób.
      </p>
    </div>
  )
}
