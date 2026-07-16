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
import MojDzien from './components/MojDzien.jsx'
import Zgloszenia from './components/Zgloszenia.jsx'
import Technika from './components/Technika.jsx'
import Sprzatanie from './components/Sprzatanie.jsx'
import { materialTomu, ID_WLASCICIEL } from './logic/nauka.js'
import { pytaniaTechniki } from './logic/technika.js'
import { pytaniaSprzatania } from './logic/sprzatanie.js'
import { wczytajZgloszenia } from './logic/integracja.js'

// Właściciel jako „uczeń" paneli praktycznych (Technika/Sprzątanie) — wyniki
// logują się pod ID_WLASCICIEL, nie mieszają się z postępem zespołu.
const WLASCICIEL_UCZEN = { id_prac: ID_WLASCICIEL, imie: 'Właściciel', poziom_docelowy: 'MENTOR' }

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

  // Pytania WSZYSTKICH źródeł (bank + panele praktyczne) — wyłącznie do
  // opisywania wpisów historii (WYNIK trzyma tylko id_pytania). Progi, tomy
  // i CCP banku liczą się dalej z samego `pytania`.
  const pytaniaOpisowe = useMemo(
    () => [...pytania, ...pytaniaTechniki(), ...pytaniaSprzatania()],
    [pytania]
  )

  // Licznik „nowych" zgłoszeń: localStorage czytamy przy zmianie widoku
  // i po każdej akcji w skrzynce (znacznik), nie przy każdym renderze App.
  const [zgloszeniaZnacznik, setZgloszeniaZnacznik] = useState(0)
  const odswiezZgloszenia = () => setZgloszeniaZnacznik((n) => n + 1)
  const nowychZgloszen = useMemo(
    () => wczytajZgloszenia().filter((z) => z.status === 'nowe').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ekran.widok, zgloszeniaZnacznik]
  )

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

  // Obserwacja Mentora (triangulacja samooceny Work Profile) — append-only.
  const dodajObserwacje = (wpis) =>
    setStan((s) => ({ ...s, obserwacje: [...(s.obserwacje || []), wpis] }))

  // Odhaczenie/odznaczenie mikropraktyki rozwojowej (samoocena, toggle).
  const przelaczPraktyke = (klucz) =>
    setStan((s) => {
      const zbior = new Set(s.praktyki || [])
      if (zbior.has(klucz)) zbior.delete(klucz)
      else zbior.add(klucz)
      return { ...s, praktyki: [...zbior] }
    })

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

  // merge, nie zastąpienie: Progi wysyłają sam PROG_ZALICZENIA i nie mogą
  // skasować PIN_WLASCICIELA (i odwrotnie)
  const zapiszKonfig = (konfig) => setStan((s) => ({ ...s, konfig: { ...s.konfig, ...konfig } }))
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
          pinWlasciciela={stan.konfig.PIN_WLASCICIELA || ''}
          onWybor={(nowaSesja) => {
            setSesja(nowaSesja)
            setEkran({ widok: nowaSesja.rodzaj === 'wlasciciel' ? 'zespol' : 'dzien' })
          }}
        />
      </Powloka>
    )
  }

  const zakladki = []
  if (pracownik) {
    zakladki.push({ id: 'dzien', etykieta: 'Mój dzień' })
    zakladki.push({ id: 'profil', etykieta: 'Mój poziom' })
    zakladki.push({ id: 'rozwoj', etykieta: 'Rozwój' })
    zakladki.push({ id: 'technika', etykieta: 'Technika' })
    zakladki.push({ id: 'sprzatanie', etykieta: 'Sprzątanie' })
    zakladki.push({ id: 'zgloszenia', etykieta: 'Zgłoszenia' })
  }
  if (jestMentorem || jestWlascicielem) {
    zakladki.push({ id: 'zespol', etykieta: 'Zespół' })
    zakladki.push({
      id: 'ocena',
      etykieta: `Do oceny${stan.kolejka.length ? ` (${stan.kolejka.length})` : ''}`
    })
  }
  if (jestWlascicielem) {
    zakladki.push({ id: 'zgloszenia', etykieta: `Zgłoszenia${nowychZgloszen ? ` (${nowychZgloszen})` : ''}` })
    zakladki.push({ id: 'technika', etykieta: 'Technika' })
    zakladki.push({ id: 'sprzatanie', etykieta: 'Sprzątanie' })
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
      {ekran.widok === 'dzien' && pracownik && <MojDzien pracownik={pracownik} />}
      {ekran.widok === 'zgloszenia' && pracownik && (
        <Zgloszenia tryb="pracownik" pracownik={pracownik} onAktualizacja={odswiezZgloszenia} />
      )}
      {ekran.widok === 'zgloszenia' && jestWlascicielem && (
        <Zgloszenia tryb="zarzad" onAktualizacja={odswiezZgloszenia} />
      )}
      {ekran.widok === 'profil' && pracownik && (
        <EmployeeDashboard
          pracownik={pracownik}
          pytania={pytania}
          wyniki={stan.wyniki}
          kolejka={stan.kolejka}
          nauka={stan.nauka}
          konfig={{ ...stan.konfig, PROG_CCP: 1 }}
          pytaniaOpisowe={pytaniaOpisowe}
          onStartQuizu={(tom) => setEkran({ widok: 'quiz', tom })}
          onUczSie={(tom) => setEkran({ widok: 'nauka', tom })}
          onPowtorka={(idPytan) => setEkran({ widok: 'powtorka', idPytan })}
        />
      )}
      {ekran.widok === 'rozwoj' && pracownik && (
        <Rozwoj
          pracownik={pracownik}
          profile={stan.profile || []}
          nauka={stan.nauka}
          praktyki={stan.praktyki || []}
          obserwacje={stan.obserwacje || []}
          onDodajProfil={dodajProfil}
          onPrzerobiony={(obszar) => oznaczPrzerobiony(pracownik.id_prac, obszar)}
          onPraktyka={przelaczPraktyke}
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
      {(ekran.widok === 'technika' || ekran.widok === 'sprzatanie') &&
        (pracownik || jestWlascicielem) &&
        (() => {
          const uczen = pracownik || WLASCICIEL_UCZEN
          const Panel = ekran.widok === 'technika' ? Technika : Sprzatanie
          return (
            <Panel
              uczen={uczen}
              wyniki={stan.wyniki}
              nauka={stan.nauka}
              konfig={stan.konfig}
              onWynik={dodajWynik}
              onDoKolejki={dodajDoKolejki}
              onPrzerobiony={(obszar) => oznaczPrzerobiony(uczen.id_prac, obszar)}
            />
          )
        })()}
      {ekran.widok === 'powtorka' && pracownik && (
        <Quiz
          pracownik={pracownik}
          tytul="Powtórka (utrwalenie)"
          zestawPytan={ekran.idPytan.map((id) => pytania.find((p) => p.id === id)).filter(Boolean)}
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
          pytaniaOpisowe={pytaniaOpisowe}
          wyniki={stan.wyniki}
          konfig={{ ...stan.konfig, PROG_CCP: 1 }}
          profile={stan.profile || []}
          obserwacje={stan.obserwacje || []}
          oceniajacy={oceniajacy}
          onDodajProfil={dodajProfil}
          onDodajObserwacje={dodajObserwacje}
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
