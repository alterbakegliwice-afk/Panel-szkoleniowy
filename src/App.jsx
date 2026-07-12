import { useEffect, useMemo, useState } from 'react'
import {
  wczytajStan,
  zapiszStan,
  bankPytan,
  domyslnyStan,
  kopieDoStanu,
  teraz
} from './logic/store.js'
import ProfilePicker from './components/ProfilePicker.jsx'
import EmployeeDashboard from './components/EmployeeDashboard.jsx'
import Quiz from './components/Quiz.jsx'
import TeamView from './components/TeamView.jsx'
import ReviewQueue from './components/ReviewQueue.jsx'
import OwnerPanel from './components/OwnerPanel.jsx'
import Learning from './components/Learning.jsx'
import EntrepreneurPanel from './components/EntrepreneurPanel.jsx'
import Rozwoj from './components/Rozwoj.jsx'
import { materialTomu, ID_WLASCICIEL } from './logic/nauka.js'

export default function App() {
  const [stan, setStan] = useState(wczytajStan)
  // sesja: {rodzaj:'pracownik', idPrac} | {rodzaj:'wlasciciel'}
  const [sesja, setSesja] = useState(null)
  const [ekran, setEkran] = useState({ widok: 'profil' }) // profil | quiz | zespol | ocena | konfiguracja
  const [bankZewnetrzny, setBankZewnetrzny] = useState(null)

  useEffect(() => zapiszStan(stan), [stan])

  // Bank może być podmieniony bez rebuilda: plik data/bank_pytan_seed.json obok
  // index.html ma pierwszeństwo przed kopią wbudowaną w build (fetch pada przy
  // otwarciu z dysku file:// — wtedy działa kopia wbudowana).
  useEffect(() => {
    fetch('data/bank_pytan_seed.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b && Array.isArray(b.pytania)) setBankZewnetrzny(b)
      })
      .catch(() => {})
  }, [])

  const bank = stan.bank || bankZewnetrzny || bankPytan(stan)
  const pytania = bank.pytania

  const pracownik = useMemo(
    () =>
      sesja?.rodzaj === 'pracownik'
        ? stan.pracownicy.find((p) => p.id_prac === sesja.idPrac)
        : null,
    [sesja, stan.pracownicy]
  )
  const jestMentorem = pracownik?.rola === 'Mentor'
  const jestWlascicielem = sesja?.rodzaj === 'wlasciciel'
  const oceniajacy = jestWlascicielem ? 'Piotr (Właściciel)' : pracownik?.imie

  // --- akcje (WYNIK: wyłącznie dopisywanie — log append-only) ---
  const dodajWynik = (wpis) =>
    setStan((s) => ({ ...s, wyniki: [...s.wyniki, wpis] }))

  const dodajDoKolejki = (wpis) =>
    setStan((s) => ({ ...s, kolejka: [...s.kolejka, wpis] }))

  // Wynik testu Work Profile (zakładka Rozwój) — log append-only jak WYNIK.
  const dodajProfil = (wpis) =>
    setStan((s) => ({ ...s, profile: [...(s.profile || []), wpis] }))

  // Oznacz materiał jako przerobiony (odblokowuje sprawdzenie wiedzy).
  const oznaczPrzerobiony = (idUcznia, obszar) =>
    setStan((s) =>
      s.nauka.some((n) => n.id_prac === idUcznia && n.obszar === obszar)
        ? s
        : { ...s, nauka: [...s.nauka, { id_prac: idUcznia, obszar, data: teraz() }] }
    )

  const ocenZKolejki = (idWpisu, zaliczyl, notatka) =>
    setStan((s) => {
      const wpis = s.kolejka.find((k) => k.id === idWpisu)
      if (!wpis) return s
      return {
        ...s,
        kolejka: s.kolejka.filter((k) => k.id !== idWpisu),
        wyniki: [
          ...s.wyniki,
          {
            data: teraz(),
            id_prac: wpis.id_prac,
            id_pytania: wpis.id_pytania,
            zaliczyl,
            oceniajacy,
            notatka: notatka || ''
          }
        ]
      }
    })

  const zapiszKonfig = (konfig) => setStan((s) => ({ ...s, konfig }))
  const zapiszPracownikow = (pracownicy) => setStan((s) => ({ ...s, pracownicy }))
  const wgrajBank = (nowyBank) => setStan((s) => ({ ...s, bank: nowyBank }))
  const przywrocSeed = () => setStan((s) => ({ ...s, bank: null }))
  const resetujWszystko = () => {
    setStan(domyslnyStan())
    setSesja(null)
    setEkran({ widok: 'profil' })
  }

  const wczytajKopie = (obiekt) => {
    setStan(kopieDoStanu(obiekt))
    setSesja(null)
    setEkran({ widok: 'profil' })
  }

  const wyloguj = () => {
    setSesja(null)
    setEkran({ widok: 'profil' })
  }

  if (!sesja) {
    return (
      <Powloka naglowek={null}>
        <ProfilePicker
          pracownicy={stan.pracownicy}
          onWybor={(nowaSesja) => {
            setSesja(nowaSesja)
            setEkran({ widok: nowaSesja.rodzaj === 'wlasciciel' ? 'zespol' : 'profil' })
          }}
        />
      </Powloka>
    )
  }

  const zakladki = []
  if (pracownik) {
    zakladki.push({ id: 'profil', etykieta: 'Mój poziom' })
    zakladki.push({ id: 'rozwoj', etykieta: 'Rozwój' })
  }
  if (jestMentorem || jestWlascicielem) {
    zakladki.push({ id: 'zespol', etykieta: 'Zespół' })
    zakladki.push({
      id: 'ocena',
      etykieta: `Do oceny${stan.kolejka.length ? ` (${stan.kolejka.length})` : ''}`
    })
  }
  if (jestWlascicielem) {
    zakladki.push({ id: 'przedsiebiorca', etykieta: 'Moduł Przedsiębiorcy' })
    zakladki.push({ id: 'konfiguracja', etykieta: 'Konfiguracja i eksport' })
  }

  return (
    <Powloka
      naglowek={
        <div className="pasek">
          <div className="pasek-kto">
            <strong>{jestWlascicielem ? 'Piotr (Właściciel)' : pracownik?.imie}</strong>
            <span className="pasek-rola">{jestWlascicielem ? 'pełny dostęp' : pracownik?.rola}</span>
          </div>
          <nav className="zakladki">
            {zakladki.map((z) => (
              <button
                key={z.id}
                className={ekran.widok === z.id ? 'zakladka aktywna' : 'zakladka'}
                onClick={() => setEkran({ widok: z.id })}
              >
                {z.etykieta}
              </button>
            ))}
          </nav>
          <button className="drugi" onClick={wyloguj}>Zmień profil</button>
        </div>
      }
    >
      {ekran.widok === 'profil' && pracownik && (
        <EmployeeDashboard
          pracownik={pracownik}
          pytania={pytania}
          wyniki={stan.wyniki}
          kolejka={stan.kolejka}
          nauka={stan.nauka}
          konfig={{ ...stan.konfig, PROG_CCP: 1 }}
          onStartQuizu={(tom) => setEkran({ widok: 'quiz', tom })}
          onUczSie={(tom) => setEkran({ widok: 'nauka', tom })}
        />
      )}
      {ekran.widok === 'rozwoj' && pracownik && (
        <Rozwoj
          pracownik={pracownik}
          profile={stan.profile || []}
          nauka={stan.nauka}
          onDodajProfil={dodajProfil}
          onPrzerobiony={(obszar) => oznaczPrzerobiony(pracownik.id_prac, obszar)}
        />
      )}
      {ekran.widok === 'nauka' && pracownik && (
        <Learning
          tytul={ekran.tom}
          material={materialTomu(ekran.tom)}
          przerobiony={stan.nauka.some((n) => n.id_prac === pracownik.id_prac && n.obszar === ekran.tom)}
          onWroc={() => setEkran({ widok: 'profil' })}
          onGotowe={() => {
            oznaczPrzerobiony(pracownik.id_prac, ekran.tom)
            setEkran({ widok: 'quiz', tom: ekran.tom })
          }}
        />
      )}
      {ekran.widok === 'quiz' && pracownik && (
        <Quiz
          pracownik={pracownik}
          tom={ekran.tom}
          pytania={pytania}
          wyniki={stan.wyniki}
          kolejka={stan.kolejka}
          onWynik={dodajWynik}
          onDoKolejki={dodajDoKolejki}
          onKoniec={() => setEkran({ widok: 'profil' })}
        />
      )}
      {ekran.widok === 'przedsiebiorca' && jestWlascicielem && (
        <EntrepreneurPanel
          stan={stan}
          onWynik={dodajWynik}
          onPrzerobiony={(obszar) => oznaczPrzerobiony(ID_WLASCICIEL, obszar)}
        />
      )}
      {ekran.widok === 'zespol' && (jestMentorem || jestWlascicielem) && (
        <TeamView
          pracownicy={stan.pracownicy}
          pytania={pytania}
          wyniki={stan.wyniki}
          konfig={{ ...stan.konfig, PROG_CCP: 1 }}
          profile={stan.profile || []}
        />
      )}
      {ekran.widok === 'ocena' && (jestMentorem || jestWlascicielem) && (
        <ReviewQueue
          kolejka={stan.kolejka}
          pytania={pytania}
          pracownicy={stan.pracownicy}
          onOcena={ocenZKolejki}
        />
      )}
      {ekran.widok === 'konfiguracja' && jestWlascicielem && (
        <OwnerPanel
          stan={stan}
          bank={bank}
          onKonfig={zapiszKonfig}
          onPracownicy={zapiszPracownikow}
          onBank={wgrajBank}
          onPrzywrocSeed={przywrocSeed}
          onReset={resetujWszystko}
          onKopia={wczytajKopie}
        />
      )}
    </Powloka>
  )
}

function Powloka({ naglowek, children }) {
  return (
    <div className="aplikacja">
      <header className="naglowek">
        <div className="logo">
          <span className="logo-znak">🥖</span>
          <div>
            <div className="logo-nazwa">Alterbake</div>
            <div className="logo-pod">Platforma Szkoleniowa</div>
          </div>
        </div>
        {naglowek}
      </header>
      <main className="tresc">{children}</main>
      <footer className="stopka">
        Złoty Standard Piekarstwa · pilot: Tom II Zakwas, IV Wypiek, V DDT · CCP = próg 100%, liczony osobno
      </footer>
    </div>
  )
}
