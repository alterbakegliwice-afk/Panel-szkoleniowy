import { useMemo, useRef, useState } from 'react'
import {
  ROZWOJ,
  NARZEDZIA,
  TALENTY_NAZWY,
  obszar,
  obszarNauki,
  walidujWynikWp,
  rekordProfilu,
  czyDuplikatProfilu,
  postepRozwoju,
  czekajaceWyniki,
  nazwaNarzedzia,
  imionaPasuja
} from '../logic/rozwoj.js'
import { czyPrzerobiono } from '../logic/nauka.js'
import { teraz } from '../logic/store.js'
import Learning from './Learning.jsx'

// Zakładka ROZWÓJ — most między testami Work Profile a szkoleniem.
// Pętla: test diagnozuje → moduły rozwijają najsłabsze obszary → RETEST
// jest ewaluacją (panel liczy deltę względem poprzedniego podejścia tego
// samego narzędzia). Wyniki wpadają same przez wspólny localStorage
// (ten sam origin GitHub Pages) albo z pliku JSON pobranego w raporcie testu.
export default function Rozwoj({ pracownik, profile, nauka, onDodajProfil, onPrzerobiony }) {
  const [widok, setWidok] = useState({ typ: 'lista' })
  const [komunikat, setKomunikat] = useState(null)
  const [odswiez, setOdswiez] = useState(0)
  const plikRef = useRef(null)

  const postep = useMemo(
    () => postepRozwoju(profile, pracownik.id_prac),
    [profile, pracownik.id_prac]
  )
  const czekajace = useMemo(
    () => czekajaceWyniki(profile, pracownik.id_prac),
    // odswiez: ręczne „sprawdź ponownie" po wykonaniu testu w drugiej karcie
    [profile, pracownik.id_prac, odswiez] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const przyjmij = (surowy, zrodlo) => {
    const blad = walidujWynikWp(surowy)
    if (blad) {
      setKomunikat({ typ: 'blad', tekst: blad })
      return
    }
    if (czyDuplikatProfilu(profile, pracownik.id_prac, surowy)) {
      setKomunikat({ typ: 'blad', tekst: 'Ten wynik jest już przypisany do Twojego profilu.' })
      return
    }
    // Log jest wspólny dla całego stanowiska — nie pozwól jednym klikiem
    // przypisać sobie wyniku podpisanego cudzym imieniem.
    const imieWyniku = (surowy.osoba?.imie || '').trim()
    if (imieWyniku && !imionaPasuja(imieWyniku, pracownik.imie)) {
      const zgoda = window.confirm(
        `Ten wynik jest podpisany „${imieWyniku}", a Ty pracujesz jako „${pracownik.imie}". ` +
        'Przypisać go mimo to do Twojego profilu?'
      )
      if (!zgoda) return
    }
    onDodajProfil(rekordProfilu(surowy, pracownik.id_prac, teraz()))
    setKomunikat({
      typ: 'ok',
      tekst: `Wynik testu „${nazwaNarzedzia(surowy.narzedzie)}" (${zrodlo}) przypisany. ` +
        'Poniżej zobaczysz obszary do rozwoju' +
        (postep ? ' i porównanie z poprzednim podejściem.' : '.')
    })
  }

  const MAKS_PLIK = 512 * 1024 // wynik testu ma ~1 KB; większy plik to pomyłka
  const importujPlik = (e) => {
    const plik = e.target.files?.[0]
    if (!plik) return
    if (plik.size > MAKS_PLIK) {
      setKomunikat({ typ: 'blad', tekst: 'Plik jest za duży jak na wynik testu (limit 512 KB).' })
      e.target.value = ''
      return
    }
    const czytnik = new FileReader()
    czytnik.onload = () => {
      try {
        przyjmij(JSON.parse(czytnik.result), 'z pliku')
      } catch {
        setKomunikat({ typ: 'blad', tekst: 'To nie jest poprawny plik JSON.' })
      }
    }
    czytnik.readAsText(plik)
    e.target.value = ''
  }

  if (widok.typ === 'nauka') {
    const o = obszar(widok.id)
    return (
      <Learning
        tytul={o.nazwa}
        material={o.nauka}
        przerobiony={czyPrzerobiono(nauka, pracownik.id_prac, obszarNauki(o.id))}
        onWroc={() => setWidok({ typ: 'lista' })}
        onGotowe={() => {
          onPrzerobiony(obszarNauki(o.id))
          setWidok({ typ: 'lista' })
          setKomunikat({
            typ: 'ok',
            tekst: `Materiał „${o.nazwa}" przerobiony. Teraz mikropraktyki w codziennej pracy — ` +
              'a za 6–12 tygodni ponowny test Work Profile jako ewaluacja postępu.'
          })
        }}
        ctaOpis={'Ten moduł nie kończy się quizem. Sprawdzeniem jest zachowanie: wdroż mikropraktyki z ostatniej karty, a po 6–12 tygodniach wykonaj ponownie test Work Profile — panel porówna wyniki.'}
        ctaTekst={'Przerobiłem materiał — wdrażam mikropraktyki →'}
      />
    )
  }

  const dataTestu = (iso) => (iso || '').slice(0, 10)
  const ostatnieNarzedzie = postep ? nazwaNarzedzia(postep.ostatni.narzedzie) : null

  return (
    <div className="rozwoj">
      <div className="karta naglowek-prof">
        <div>
          <span className="eyebrow">Work Profile × Panel szkoleniowy</span>
          <h1>Rozwój kompetencji</h1>
          <p className="prof-purpose">
            Test Work Profile pokazuje Twoje mocne strony i obszary do wzmocnienia. Tu rozwijasz je
            konkretnymi materiałami i mikropraktykami, a ewaluacją szkolenia jest ponowne wykonanie
            testu — panel porówna wyniki i pokaże postęp.
          </p>
        </div>
        {postep && (
          <div className="ogolny">
            <div className="ogolny-liczba">{postep.liczbaTestow}</div>
            <div className="ogolny-etykieta">
              {postep.liczbaTestow === 1 ? 'wykonany test' : 'wykonane testy'}
            </div>
            <div className="cichy mini">
              ostatni: {ostatnieNarzedzie}, {dataTestu(postep.ostatni.data)}
            </div>
          </div>
        )}
      </div>

      {komunikat && (
        <div className={komunikat.typ === 'ok' ? 'karta ccp ccp-ok' : 'karta ccp ccp-brak'}>
          <div className="ccp-ikona">{komunikat.typ === 'ok' ? '✓' : '⚠'}</div>
          <div>
            <div className="ccp-opis">{komunikat.tekst}</div>
          </div>
        </div>
      )}

      {/* Wyniki czekające we wspólnej pamięci przeglądarki (testy zapisują je same) */}
      {czekajace.length > 0 && (
        <div className="karta nastepny">
          <h3>Znaleziono {czekajace.length === 1 ? 'nowy wynik testu' : `${czekajace.length} nowe wyniki testów`}</h3>
          <p className="cichy mini">
            Test wykonany w tej przeglądarce zapisał wynik automatycznie. Przypisz go do swojego profilu:
          </p>
          {czekajace.map((w, i) => (
            <div key={i} className="rzad">
              <span>
                <strong>{nazwaNarzedzia(w.narzedzie)}</strong>
                {w.osoba?.imie ? ` · ${w.osoba.imie}` : ''} · {dataTestu(w.data)}
              </span>
              <button className="glowny" onClick={() => przyjmij(w, 'z tej przeglądarki')}>
                Przypisz do mnie
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Start / retest + import z pliku */}
      <div className="karta">
        <h3>{postep ? 'Ewaluacja postępu — powtórz test' : 'Zacznij od diagnozy — wykonaj test'}</h3>
        <p className="cichy mini">
          {postep
            ? 'Po przerobieniu modułów i 6–12 tygodniach praktyki wykonaj test ponownie (najlepiej to samo narzędzie co ostatnio — tylko wtedy panel policzy porównanie).'
            : 'Wykonaj test Work Profile, a wynik pojawi się tu automatycznie (ta sama przeglądarka) albo zaimportujesz go z pliku JSON pobranego w raporcie testu.'}
        </p>
        <div className="rzad">
          {Object.entries(NARZEDZIA).map(([id, n]) => (
            <a
              key={id}
              className={
                'jako-przycisk ' +
                (postep && postep.ostatni.narzedzie === id ? 'glowny' : 'drugi')
              }
              href={n.url}
              target="_blank"
              rel="noreferrer"
            >
              {postep && postep.ostatni.narzedzie === id ? '🔁 ' : '🧭 '}
              {n.nazwa}
            </a>
          ))}
          <button className="drugi" onClick={() => setOdswiez((x) => x + 1)}>
            ⟳ Sprawdź, czy jest nowy wynik
          </button>
          <button className="drugi" onClick={() => plikRef.current?.click()}>
            📄 Importuj wynik z pliku (JSON)
          </button>
          <input
            ref={plikRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={importujPlik}
          />
        </div>
      </div>

      {/* Obszary rozwojowe */}
      {postep ? (
        <>
          <div className="karta nastepny">
            <h3>Następny krok</h3>
            <p>
              {postep.poprzedni
                ? 'Masz już porównanie z poprzednim testem — strzałki przy obszarach pokazują zmianę. Pracuj dalej nad priorytetami i utrwal to, co wzrosło.'
                : `Twoje priorytety rozwojowe to ${postep.obszary
                    .filter((o) => postep.priorytety.includes(o.id))
                    .map((o) => `„${o.nazwa}"`)
                    .join(', ')}. Przerób te moduły, wdroż mikropraktyki — a ponowny test będzie Twoją ewaluacją.`}
            </p>
          </div>

          <div className="tomy-siatka">
            {postep.obszary
              .slice()
              .sort((a, b) => (a.aktualny ?? 101) - (b.aktualny ?? 101))
              .map((o) => {
                const priorytet = postep.priorytety.includes(o.id)
                const def = obszar(o.id)
                const nauczony = czyPrzerobiono(nauka, pracownik.id_prac, obszarNauki(o.id))
                return (
                  <div key={o.id} className={'karta tom' + (priorytet ? ' rozwoj-priorytet' : '')}>
                    <div className="tom-gora">
                      <h3>{o.nazwa}</h3>
                      {priorytet
                        ? <span className="plakietka toku">PRIORYTET</span>
                        : <span className="plakietka ok">MOCNA STRONA</span>}
                    </div>
                    <p className="cichy mini">{o.opis}</p>
                    <div className="postep-tor">
                      <div className="postep-fill" style={{ width: (o.aktualny ?? 0) + '%' }} />
                    </div>
                    <div className="tom-dol">
                      <span>
                        {o.aktualny === null ? 'brak danych' : o.aktualny + ' / 100'}
                        {o.delta !== null && (o.delta === 0
                          ? <span className="cichy mini"> = bez zmian</span>
                          : <span className={o.delta > 0 ? 'delta-plus' : 'delta-minus'}>
                              {' '}{o.delta > 0 ? '▲ +' : '▼ '}{o.delta} od poprzedniego testu
                            </span>)}
                      </span>
                      {nauczony && <span className="ccp-tag ok">nauka ✓</span>}
                    </div>
                    <p className="cichy mini">
                      Talenty (Mapa Potencjału): {def.talenty.map((t) => TALENTY_NAZWY[t]).join(', ')}
                    </p>
                    <div className="rzad">
                      <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: o.id })}>
                        📖 {nauczony ? 'Powtórz materiał' : 'Ucz się'}
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>

          <details className="karta historia-karta">
            <summary>Historia testów ({postep.seria.length})</summary>
            <div className="tabela-otoczka">
            <table className="tabela">
              <thead>
                <tr><th>Data</th><th>Narzędzie</th><th>Obszary (0–100)</th></tr>
              </thead>
              <tbody>
                {postep.seria.slice().reverse().map((s) => (
                  <tr key={s.id}>
                    <td>{dataTestu(s.data)}</td>
                    <td>{nazwaNarzedzia(s.narzedzie)}</td>
                    <td className="mini">
                      {ROZWOJ.obszary
                        .map((o) => `${o.nazwa}: ${s.obszary[o.id] ?? '—'}`)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>
        </>
      ) : (
        <div className="tomy-siatka">
          {ROZWOJ.obszary.map((o) => (
            <div key={o.id} className="karta tom">
              <div className="tom-gora">
                <h3>{o.nazwa}</h3>
              </div>
              <p className="cichy mini">{o.opis}</p>
              <div className="rzad">
                <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: o.id })}>
                  📖 Ucz się
                </button>
              </div>
              <p className="cichy mini">
                🧭 Wykonaj test Work Profile, aby zobaczyć swój wynik w tym obszarze.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
