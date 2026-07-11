import { useState } from 'react'
import { eksportPanelM5 } from '../logic/export.js'
import {
  ROLE,
  walidujBank,
  nastepneIdPracownika,
  eksportKopii,
  walidujKopie,
  teraz
} from '../logic/store.js'

// Panel Właściciela: progi (KONFIG), pracownicy, bank pytań, eksport do Panelu M5.
// PROG_CCP nie jest edytowalny — 100% nienegocjowalne (AI_BATON §4).
export default function OwnerPanel({ stan, bank, onKonfig, onPracownicy, onBank, onPrzywrocSeed, onReset, onKopia }) {
  const konfig = { PROG_CCP: 1, ...stan.konfig }

  const pobierz = (obiekt, nazwa) => {
    const blob = new Blob([JSON.stringify(obiekt, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nazwa
    a.click()
    URL.revokeObjectURL(url)
  }

  const eksportuj = () => {
    const dane = eksportPanelM5(bank.pytania, stan.wyniki, stan.pracownicy, konfig, teraz())
    pobierz(dane, `alterbake_eksport_panel_M5_${teraz().slice(0, 10)}.json`)
  }

  return (
    <div className="konfig">
      <Progi konfig={konfig} onKonfig={onKonfig} />
      <Pracownicy pracownicy={stan.pracownicy} onPracownicy={onPracownicy} />
      <BankPytan bank={bank} wgrany={!!stan.bank} onBank={onBank} onPrzywrocSeed={onPrzywrocSeed} pobierz={pobierz} />

      <div className="karta">
        <h2>Eksport do Panelu Piekarni M5</h2>
        <p className="cichy">
          Profile + aktualny postęp per tom + status CCP. Jedno kliknięcie — plik gotowy do zassania
          przez Panel (struktura ze schema.md). To eksport pliku, nie integracja live.
        </p>
        <button className="glowny" onClick={eksportuj}>⬇ Eksportuj dla Panelu M5 (JSON)</button>
      </div>

      <KopiaZapasowa stan={stan} pobierz={pobierz} onKopia={onKopia} />

      <div className="karta strefa-ryzyka">
        <h2>Reset danych</h2>
        <p className="cichy">
          Reset przywraca stan przykładowy — użyj tylko świadomie (cała historia wyników zostanie
          skasowana). Najpierw zrób kopię zapasową powyżej.
        </p>
        <button className="odrzuc" onClick={() => {
          if (confirm('Skasować wszystkie dane lokalne i wrócić do stanu przykładowego?')) onReset()
        }}>Reset do stanu przykładowego</button>
      </div>
    </div>
  )
}

function KopiaZapasowa({ stan, pobierz, onKopia }) {
  const [blad, setBlad] = useState('')
  const [info, setInfo] = useState('')

  const zrobKopie = () => {
    pobierz(eksportKopii(stan), `alterbake_kopia_${teraz().slice(0, 10)}.json`)
    setInfo('Kopia zapisana. Przechowaj plik poza tym komputerem (dysk/chmura).')
    setBlad('')
  }

  const wczytaj = (e) => {
    const plik = e.target.files?.[0]
    if (!plik) return
    const czyt = new FileReader()
    czyt.onload = () => {
      try {
        const obiekt = JSON.parse(czyt.result)
        const err = walidujKopie(obiekt)
        if (err) { setBlad(err); setInfo(''); return }
        const ile = obiekt.wyniki.length
        if (confirm(`Wczytać kopię? Zastąpi bieżące dane (${ile} wyników w pliku). Zostaniesz wylogowany.`)) {
          onKopia(obiekt)
        }
      } catch {
        setBlad('Plik nie jest poprawnym JSON.')
        setInfo('')
      }
    }
    czyt.readAsText(plik)
    e.target.value = ''
  }

  return (
    <div className="karta">
      <h2>Kopia zapasowa (cały stan)</h2>
      <p className="cichy">
        Wyniki, pracownicy, konfiguracja i bank żyją w tej przeglądarce. Kopia to jedyna ochrona
        historii ewaluacji przed czyszczeniem cache lub zmianą urządzenia — rób ją regularnie.
      </p>
      <div className="rzad">
        <button className="glowny" onClick={zrobKopie}>⬇ Pobierz kopię zapasową</button>
        <label className="drugi jako-przycisk">
          Wczytaj kopię zapasową
          <input type="file" accept="application/json,.json" hidden onChange={wczytaj} />
        </label>
      </div>
      {info && <p className="info-ok">{info}</p>}
      {blad && <p className="blad">{blad}</p>}
      <p className="cichy mini">
        Kopia zawiera pełny log append-only — po wczytaniu na innym komputerze historia jest
        identyczna. To NIE to samo co eksport M5 (ten jest tylko dla Panelu, bez pełnego logu).
      </p>
    </div>
  )
}

function Progi({ konfig, onKonfig }) {
  const [prog, setProg] = useState(Math.round((konfig.PROG_ZALICZENIA ?? 0.8) * 100))
  return (
    <div className="karta">
      <h2>Progi zaliczenia</h2>
      <label className="pole-etykieta">
        Próg opanowania poziomu: <strong>{prog}%</strong>
        <input
          type="range" min={50} max={100} step={5} value={prog}
          onChange={(e) => {
            const v = Number(e.target.value)
            setProg(v)
            onKonfig({ PROG_ZALICZENIA: v / 100 })
          }}
        />
      </label>
      <p className="cichy mini">
        Próg CCP = 100% i jest zablokowany — bezpieczeństwo żywności nie podlega negocjacji.
      </p>
    </div>
  )
}

function Pracownicy({ pracownicy, onPracownicy }) {
  const [nowy, setNowy] = useState({ imie: '', rola: 'Piekarz', poziom_docelowy: 'SAMODZIELNY', pin: '' })

  const dodaj = () => {
    if (!nowy.imie.trim()) return
    onPracownicy([
      ...pracownicy,
      {
        id_prac: nastepneIdPracownika(pracownicy),
        imie: nowy.imie.trim(),
        rola: nowy.rola,
        data_startu: teraz().slice(0, 10),
        poziom_docelowy: nowy.poziom_docelowy,
        pin: nowy.pin.trim()
      }
    ])
    setNowy({ imie: '', rola: 'Piekarz', poziom_docelowy: 'SAMODZIELNY', pin: '' })
  }

  const usun = (id) => {
    if (confirm('Usunąć profil? Wyniki w logu zostaną, ale profil zniknie z list.')) {
      onPracownicy(pracownicy.filter((p) => p.id_prac !== id))
    }
  }

  return (
    <div className="karta">
      <h2>Pracownicy</h2>
      <div className="tabela-otoczka">
        <table className="tabela">
          <thead>
            <tr><th>ID</th><th>Imię</th><th>Rola</th><th>Cel</th><th>PIN</th><th></th></tr>
          </thead>
          <tbody>
            {pracownicy.map((p) => (
              <tr key={p.id_prac}>
                <td>{p.id_prac}</td>
                <td>{p.imie}</td>
                <td>{p.rola}</td>
                <td>{p.poziom_docelowy || '—'}</td>
                <td>{p.pin ? '🔒' : '—'}</td>
                <td><button className="link-odrzuc" onClick={() => usun(p.id_prac)}>usuń</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dodaj-prac">
        <input className="pole" placeholder="Imię" value={nowy.imie}
          onChange={(e) => setNowy({ ...nowy, imie: e.target.value })} />
        <select className="pole" value={nowy.rola} onChange={(e) => setNowy({ ...nowy, rola: e.target.value })}>
          {ROLE.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className="pole" value={nowy.poziom_docelowy}
          onChange={(e) => setNowy({ ...nowy, poziom_docelowy: e.target.value })}>
          <option>JUNIOR</option><option>SAMODZIELNY</option><option>MENTOR</option>
        </select>
        <input className="pole waski" placeholder="PIN" inputMode="numeric" maxLength={4} value={nowy.pin}
          onChange={(e) => setNowy({ ...nowy, pin: e.target.value.replace(/\D/g, '') })} />
        <button className="glowny" onClick={dodaj}>Dodaj</button>
      </div>
    </div>
  )
}

function BankPytan({ bank, wgrany, onBank, onPrzywrocSeed, pobierz }) {
  const [blad, setBlad] = useState('')
  const [info, setInfo] = useState('')

  const wczytaj = (e) => {
    const plik = e.target.files?.[0]
    if (!plik) return
    const czyt = new FileReader()
    czyt.onload = () => {
      try {
        const obiekt = JSON.parse(czyt.result)
        const err = walidujBank(obiekt)
        if (err) { setBlad(err); setInfo(''); return }
        onBank(obiekt)
        setBlad('')
        setInfo(`Wczytano bank: ${obiekt.pytania.length} pytań.`)
      } catch {
        setBlad('Plik nie jest poprawnym JSON.')
        setInfo('')
      }
    }
    czyt.readAsText(plik)
    e.target.value = ''
  }

  const liczbaCcp = bank.pytania.filter((p) => p.ccp).length
  return (
    <div className="karta">
      <h2>Bank pytań</h2>
      <p className="cichy">
        Aktualnie: <strong>{bank.pytania.length}</strong> pytań ({liczbaCcp} CCP),
        źródło: {wgrany ? 'plik wgrany ręcznie' : 'seed z repozytorium'}. Bank rośnie bez zmiany kodu —
        treść żyje w xlsx technologa, tu wgrywasz wyeksportowany JSON.
      </p>
      <div className="rzad">
        <label className="glowny jako-przycisk">
          Wgraj bank (JSON)
          <input type="file" accept="application/json,.json" hidden onChange={wczytaj} />
        </label>
        <button className="drugi" onClick={() => pobierz(bank, 'bank_pytan_aktualny.json')}>
          Pobierz aktualny bank
        </button>
        {wgrany && <button className="drugi" onClick={onPrzywrocSeed}>Przywróć seed</button>}
      </div>
      {info && <p className="info-ok">{info}</p>}
      {blad && <p className="blad">{blad}</p>}
      <p className="cichy mini">
        Nie twórz pytań w kodzie ani ręcznie „na oko". Nowe pytania i format opcji auto-oceny
        wymagają akceptacji technologa/Piotra (patrz README → propozycja formatu opcje[]).
      </p>
    </div>
  )
}
