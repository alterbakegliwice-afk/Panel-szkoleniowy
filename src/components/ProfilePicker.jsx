import { useState } from 'react'
import { ROLA_GOSC } from '../logic/store.js'

// Logowanie = prosty wybór profilu z listy + opcjonalny PIN (spec.md §2).
// Bez OAuth. Piekarnia, nie bank.
export default function ProfilePicker({ pracownicy, pinWlasciciela = '', onWybor, onGosc }) {
  const [pinDla, setPinDla] = useState(null) // pracownik lub {wlasciciel:true} wymagający PIN
  const [pin, setPin] = useState('')
  const [blad, setBlad] = useState('')
  const [imieGoscia, setImieGoscia] = useState('')

  const wejdzJakoGosc = () => {
    const imie = imieGoscia.trim()
    if (imie) onGosc?.(imie)
  }

  const wybierz = (prac) => {
    if (prac.pin) {
      setPinDla(prac)
      setPin('')
      setBlad('')
    } else {
      onWybor({ rodzaj: 'pracownik', idPrac: prac.id_prac })
    }
  }

  const wybierzWlasciciela = () => {
    if (pinWlasciciela) {
      setPinDla({ wlasciciel: true, imie: 'Piotr (Właściciel)', pin: pinWlasciciela })
      setPin('')
      setBlad('')
    } else {
      onWybor({ rodzaj: 'wlasciciel' })
    }
  }

  const potwierdzPin = () => {
    if (pin === pinDla.pin) {
      onWybor(pinDla.wlasciciel ? { rodzaj: 'wlasciciel' } : { rodzaj: 'pracownik', idPrac: pinDla.id_prac })
    } else {
      setBlad('Błędny PIN.')
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
        {pracownicy.filter((p) => p.rola !== ROLA_GOSC).map((p) => (
          <button key={p.id_prac} className="profil-kafel" onClick={() => wybierz(p)}>
            <span className="profil-imie">{p.imie}</span>
            <span className="profil-rola">{p.rola}{p.pin ? ' · 🔒' : ''}</span>
          </button>
        ))}
      </div>
      {pracownicy.some((p) => p.rola === ROLA_GOSC) && (
        <>
          <div className="separator"><span>goście</span></div>
          <div className="lista-profili">
            {pracownicy.filter((p) => p.rola === ROLA_GOSC).map((p) => (
              <button key={p.id_prac} className="profil-kafel" onClick={() => wybierz(p)}>
                <span className="profil-imie">{p.imie}</span>
                <span className="profil-rola">{p.rola}{p.pin ? ' · 🔒' : ''}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="separator"><span>lub</span></div>
      <button className="glowny szeroki" onClick={wybierzWlasciciela}>
        Wejdź jako Właściciel (Piotr){pinWlasciciela ? ' 🔒' : ''}
      </button>
      <p className="cichy mini">
        Właściciel: pełny widok zespołu, ocena, konfiguracja progów i eksport do Panelu M5.
      </p>
      {onGosc && (
        <>
          <div className="separator"><span>spoza Alterbake?</span></div>
          <div className="rzad gosc-wejscie">
            <input
              className="pole"
              placeholder="Twoje imię"
              maxLength={40}
              value={imieGoscia}
              onChange={(e) => setImieGoscia(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && wejdzJakoGosc()}
            />
            <button className="drugi" onClick={wejdzJakoGosc} disabled={!imieGoscia.trim()}>
              🎒 Wypróbuj jako Gość
            </button>
          </div>
          <p className="cichy mini">
            Dla znajomych i testujących: pełny dostęp do nauki, quizów i testów Work Profile.
            Profil gościa żyje w tej przeglądarce i nie trafia do danych zespołu piekarni.
            To samo imię wraca na istniejący profil — jeśli ktoś już go użył, dopisz nazwisko.
          </p>
        </>
      )}
    </div>
  )
}
