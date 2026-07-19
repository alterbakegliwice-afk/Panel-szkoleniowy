import { useMemo, useRef, useState } from 'react'
import {
  ROZWOJ,
  NARZEDZIA,
  TALENTY_NAZWY,
  obszar,
  obszarNauki,
  rekordProfilu,
  przygotujPrzypisanie,
  postepRozwoju,
  czekajaceWyniki,
  nazwaNarzedzia,
  imionaPasuja,
  wskazowkiCharakteruZSerii,
  trendObszarow,
  mikropraktyki,
  kluczPraktyki,
  postepPraktyk,
  statusRetestu,
  triangulacja,
  KIERUNKI_OBSERWACJI
} from '../logic/rozwoj.js'
import { czyPrzerobiono } from '../logic/nauka.js'
import { teraz } from '../logic/store.js'
import Learning from './Learning.jsx'
import Sparkline from './Sparkline.jsx'
import PlanRozwoju from './PlanRozwoju.jsx'

// Zakładka ROZWÓJ — most między testami Work Profile a szkoleniem.
// Pętla: test diagnozuje → moduły rozwijają najsłabsze obszary → RETEST
// jest ewaluacją (panel liczy deltę względem poprzedniego podejścia tego
// samego narzędzia). Wyniki wpadają same przez wspólny localStorage
// (ten sam origin GitHub Pages) albo z pliku JSON pobranego w raporcie testu.
export default function Rozwoj({ pracownik, profile, nauka, praktyki, obserwacje, onDodajProfil, onPrzerobiony, onPraktyka, onZadajPytanie }) {
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
  // triangulacja: samoocena (delta) obok obserwacji Mentora, per obszar.
  // MUSI być przed wczesnym return dla widoku nauki (kolejność hooków).
  const triangMap = useMemo(() => {
    const m = {}
    for (const o of triangulacja(postep, obserwacje || [], pracownik.id_prac)) m[o.id] = o
    return m
  }, [postep, obserwacje, pracownik.id_prac])

  const przyjmij = (surowy, zrodlo) => {
    const gotowe = przygotujPrzypisanie(surowy, pracownik, profile)
    if (!gotowe.ok) {
      setKomunikat({ typ: 'blad', tekst: gotowe.blad })
      return
    }
    // Log jest wspólny dla całego stanowiska — nie pozwól jednym klikiem
    // przypisać sobie wyniku podpisanego cudzym imieniem.
    if (gotowe.ostrzezenieImienia) {
      const zgoda = window.confirm(
        `Ten wynik jest podpisany „${gotowe.ostrzezenieImienia}", a Ty pracujesz jako „${pracownik.imie}". ` +
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

  if (widok.typ === 'plan') {
    return (
      <PlanRozwoju
        pracownik={pracownik}
        profile={profile}
        nauka={nauka}
        praktyki={praktyki}
        obserwacje={obserwacje}
        onWroc={() => setWidok({ typ: 'lista' })}
      />
    )
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
        onZadajPytanie={onZadajPytanie && ((tresc) => onZadajPytanie(o.nazwa, tresc))}
      />
    )
  }

  const dataTestu = (iso) => (iso || '').slice(0, 10)
  const ostatnieNarzedzie = postep ? nazwaNarzedzia(postep.ostatni.narzedzie) : null
  const charakter = wskazowkiCharakteruZSerii(profile, pracownik.id_prac)
  const trend = trendObszarow(profile, pracownik.id_prac)
  const retest = statusRetestu(nauka, pracownik.id_prac, profile)

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
          {postep && (
            <button className="drugi" onClick={() => setWidok({ typ: 'plan' })}>
              🖨 Plan rozwoju (druk)
            </button>
          )}
          <input
            ref={plikRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={importujPlik}
          />
        </div>
      </div>

      {/* Jak najlepiej się uczysz — z profilu charakteru (Mapa Potencjału) */}
      {charakter && (
        <div className="karta charakter-karta">
          <h3>Jak najlepiej się uczysz</h3>
          <p className="cichy mini">
            Na podstawie profilu charakteru z Mapy Potencjału. To nie ocena — pokazuje, którą
            drogą wiedza wchodzi u Ciebie najszybciej. Pokaż to swojemu Mentorowi.
          </p>
          <div className="charakter-lista">
            {charakter.wskazowki.map((w) => (
              <div key={w.klucz} className="charakter-wiersz">
                <span className="charakter-biegun">{w.biegun}</span>
                <span className="charakter-tip">{w.jakSzkolic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Przypomnienie o reteście — domyka pętlę nauka → praktyka → ewaluacja */}
      {retest && !retest.zrobionyPoNauce && (
        <div className={retest.dojrzaly ? 'karta ccp ccp-brak' : 'karta nastepny'}>
          <div className={retest.dojrzaly ? 'ccp-ikona' : ''}>{retest.dojrzaly ? '⏰' : ''}</div>
          <div>
            {retest.dojrzaly ? (
              <>
                <div className="ccp-tytul">Czas na retest — ewaluację postępu</div>
                <div className="ccp-opis">
                  Materiał przerabiasz od {dataTestu(retest.naukaOd)}, minęło zalecane {retest.tygodnie} tyg.
                  praktyki. Wykonaj ponownie test Work Profile — panel pokaże, czy szkolenie zadziałało.
                </div>
              </>
            ) : (
              <p className="cichy mini" style={{ margin: 0 }}>
                📅 Retest (ewaluacja) zalecany od <strong>{dataTestu(retest.celData)}</strong> —
                to ok. {retest.tygodnie} tyg. wdrażania mikropraktyk od rozpoczęcia nauki.
              </p>
            )}
          </div>
        </div>
      )}

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
                    {triangMap[o.id]?.obserwacja && (
                      <p className={'obs-inline' + (triangMap[o.id].rozjazd ? ' obs-inline-rozjazd' : '')}>
                        👁 Mentor w praktyce: {KIERUNKI_OBSERWACJI[triangMap[o.id].obserwacja.kierunek].etykieta.toLowerCase()}
                        {triangMap[o.id].rozjazd && triangMap[o.id].typRozjazdu === 'zawyzona' &&
                          ' — Twoja samoocena rośnie szybciej; pogadajcie o konkretach z praktyki.'}
                        {triangMap[o.id].rozjazd && triangMap[o.id].typRozjazdu === 'zanizona' &&
                          ' — oceniasz się surowiej, niż widać w praktyce. Doceń swój postęp.'}
                      </p>
                    )}
                    <p className="cichy mini">
                      Talenty (Mapa Potencjału): {def.talenty.map((t) => TALENTY_NAZWY[t]).join(', ')}
                    </p>
                    {nauczony && (() => {
                      const lista = mikropraktyki(o.id)
                      const pp = postepPraktyk(praktyki, pracownik.id_prac, o.id)
                      if (!lista.length) return null
                      return (
                        <details className="praktyki-blok" open={pp.zrobione < pp.wszystkie}>
                          <summary>
                            Mikropraktyki ({pp.zrobione}/{pp.wszystkie})
                            {pp.zrobione === pp.wszystkie && ' ✓'}
                          </summary>
                          <ul className="praktyki-lista">
                            {lista.map((p, i) => {
                              const k = kluczPraktyki(pracownik.id_prac, o.id, i)
                              const zrobiona = (praktyki || []).includes(k)
                              return (
                                <li key={i} className={zrobiona ? 'praktyka zrobiona' : 'praktyka'}>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={zrobiona}
                                      onChange={() => onPraktyka(k)}
                                    />
                                    <span>{p}</span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        </details>
                      )
                    })()}
                    <div className="rzad">
                      <button className="drugi" onClick={() => setWidok({ typ: 'nauka', id: o.id })}>
                        📖 {nauczony ? 'Powtórz materiał' : 'Ucz się'}
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>

          {trend && (
            <div className="karta">
              <h3>Trend w czasie ({trend.punkty.length} podejść)</h3>
              <p className="cichy mini">
                Kierunek zmian od pierwszego do ostatniego testu. Linia łączy podejścia
                z {trend.punkty.map((p) => dataTestu(p.data)).join(' → ')}. Różne narzędzia
                mierzą nieco inaczej — patrz na kierunek, nie pojedynczy punkt.
              </p>
              <div className="trend-siatka">
                {trend.obszary
                  .slice()
                  .sort((a, b) => (a.zmianaOgolna ?? 0) - (b.zmianaOgolna ?? 0))
                  .map((o) => (
                    <div key={o.id} className="trend-wiersz">
                      <span className="trend-nazwa">{o.nazwa}</span>
                      <Sparkline wartosci={o.wartosci} />
                      {o.zmianaOgolna !== null && (
                        <span
                          className={
                            o.zmianaOgolna > 0 ? 'delta-plus' : o.zmianaOgolna < 0 ? 'delta-minus' : 'cichy mini'
                          }
                        >
                          {o.zmianaOgolna > 0 ? '▲ +' : o.zmianaOgolna < 0 ? '▼ ' : '= '}
                          {o.zmianaOgolna !== 0 ? o.zmianaOgolna : 'bez zmian'}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

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
