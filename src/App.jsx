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
import DraftReview from './components/DraftReview.jsx'
import PromotionPolicy from './components/PromotionPolicy.jsx'
import { materialTomu, ID_WLASCICIEL, pytaniaZatwierdzone, DRAFTY } from './logic/nauka.js'

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
  // Bank efektywny = bank bazowy + pytania z tomów-draftów zatwierdzonych przez właściciela.
  const pytania = [...bank.pytania, ...pytaniaZatwierdzone(stan.zatwierdzone)]

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

  // Potwierdzenie praktyczne (oś praktyczna #3) — Mentor/Właściciel poświadcza pokaz
  // na stanowisku. Log append-only; potwierdzil=false = cofnięcie.
  const potwierdzPraktyke = (idPrac, tom, potwierdzil, notatka = '') =>
    setStan((s) => ({
      ...s,
      praktyka: [
        ...s.praktyka,
        { id_prac: idPrac, tom, potwierdzil, data: teraz(), oceniajacy, notatka }
      ]
    }))

  // Przydział nauki z terminem (adopcja) — log append-only; usunięcie = wpis usuniete:true.
  const przypiszTom = (idPrac, tom, termin) =>
    setStan((s) => ({
      ...s,
      przypisania: [...s.przypisania, { id_prac: idPrac, tom, termin, utworzono: teraz(), przez: oceniajacy }]
    }))
  const usunPrzypisanie = (idPrac, tom) =>
    setStan((s) => ({
      ...s,
      przypisania: [...s.przypisania, { id_prac: idPrac, tom, usuniete: true, utworzono: teraz(), przez: oceniajacy }]
    }))

  const zatwierdzTom = (tom) =>
    setStan((s) => (s.zatwierdzone.includes(tom) ? s : { ...s, zatwierdzone: [...s.zatwierdzone, tom] }))
  const cofnijTom = (tom) =>
    setStan((s) => ({ ...s, zatwierdzone: s.zatwierdzone.filter((t) => t !== tom) }))

  // Scala pola konfiguracji (nie zastępuje całości) — inaczej suwak progu kasowałby
  // PIN właściciela i datę ostatniej kopii.
  const zapiszKonfig = (czesc) => setStan((s) => ({ ...s, konfig: { ...s.konfig, ...czesc } }))
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
          ownerPin={stan.konfig.PIN_WLASCICIELA || ''}
          onWybor={(nowaSesja) => {
            setSesja(nowaSesja)
            setEkran({ widok: nowaSesja.rodzaj === 'wlasciciel' ? 'zespol' : 'profil' })
          }}
        />
      </Powloka>
    )
  }

  const zakladki = []
  if (pracownik) zakladki.push({ id: 'profil', etykieta: 'Mój poziom' })
  if (jestMentorem || jestWlascicielem) {
    zakladki.push({ id: 'zespol', etykieta: 'Zespół' })
    zakladki.push({
      id: 'ocena',
      etykieta: `Do oceny${stan.kolejka.length ? ` (${stan.kolejka.length})` : ''}`
    })
    zakladki.push({ id: 'zasady', etykieta: 'Zasady awansu' })
  }
  if (jestWlascicielem) {
    const doAkceptacji = DRAFTY.filter((d) => !stan.zatwierdzone.includes(d.tom)).length
    zakladki.push({ id: 'przedsiebiorca', etykieta: 'Moduł Przedsiębiorcy' })
    zakladki.push({
      id: 'akceptacja',
      etykieta: `Do akceptacji${doAkceptacji ? ` (${doAkceptacji})` : ''}`
    })
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
          praktyka={stan.praktyka}
          przypisania={stan.przypisania}
          konfig={{ ...stan.konfig, PROG_CCP: 1 }}
          onStartQuizu={(tom, tryb = 'cwiczenie') => setEkran({ widok: 'quiz', tom, tryb })}
          onUczSie={(tom) => setEkran({ widok: 'nauka', tom })}
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
            setEkran({ widok: 'quiz', tom: ekran.tom, tryb: 'cwiczenie' })
          }}
        />
      )}
      {ekran.widok === 'quiz' && pracownik && (
        <Quiz
          pracownik={pracownik}
          tom={ekran.tom}
          pytania={pytania}
          tryb={ekran.tryb || 'cwiczenie'}
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
      {ekran.widok === 'akceptacja' && jestWlascicielem && (
        <DraftReview
          zatwierdzone={stan.zatwierdzone}
          onZatwierdz={zatwierdzTom}
          onCofnij={cofnijTom}
        />
      )}
      {ekran.widok === 'zespol' && (jestMentorem || jestWlascicielem) && (
        <TeamView
          pracownicy={stan.pracownicy}
          pytania={pytania}
          wyniki={stan.wyniki}
          praktyka={stan.praktyka}
          przypisania={stan.przypisania}
          nauka={stan.nauka}
          konfig={{ ...stan.konfig, PROG_CCP: 1 }}
          onPotwierdzPraktyke={jestWlascicielem || jestMentorem ? potwierdzPraktyke : null}
          onPrzypisz={jestWlascicielem || jestMentorem ? przypiszTom : null}
          onUsunPrzypisanie={jestWlascicielem || jestMentorem ? usunPrzypisanie : null}
        />
      )}
      {ekran.widok === 'zasady' && (jestMentorem || jestWlascicielem) && (
        <PromotionPolicy prog={stan.konfig.PROG_ZALICZENIA} />
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
        Złoty Standard Piekarstwa · pilot: Tom II Zakwas, IV Wypiek, V DDT · CCP = próg 100%, liczony osobno · quiz CCP to szkolenie wiedzy, nie rejestr HACCP
      </footer>
    </div>
  )
}
