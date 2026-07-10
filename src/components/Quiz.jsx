import { useMemo, useState } from 'react'
import { teraz } from '../logic/store.js'

// Quiz z jednego tomu. Typy pytań (spec.md §3):
//  - jednokrotny/wielokrotny Z POLEM opcje[] → auto-ocena (wszystkie trafione = zaliczone)
//  - jednokrotny/wielokrotny BEZ opcje[] (stan pilota) → odpowiedź tekstowa → kolejka Mentora
//    (nie zmyślamy opcji — treść żyje w xlsx, format opcji do akceptacji Piotra; patrz README)
//  - otwarty → tekst → kolejka Mentora
//  - praktyczny → demonstracja na stanowisku → kolejka Mentora
function autoOceniany(p) {
  return (p.typ === 'jednokrotny' || p.typ === 'wielokrotny') && Array.isArray(p.opcje) && p.opcje.length > 0
}

function idWpisu(idPrac, idPytania) {
  return `${idPrac}:${idPytania}:${teraz()}:${Math.random().toString(36).slice(2, 7)}`
}

export default function Quiz({ pracownik, tom, pytania, onWynik, onDoKolejki, onKoniec }) {
  const zestaw = useMemo(() => pytania.filter((p) => p.tom === tom), [pytania, tom])
  const [i, setI] = useState(0)
  const [odp, setOdp] = useState({}) // indeksy zaznaczone (auto) lub tekst
  const [wyniki, setWyniki] = useState([]) // {p, stan:'auto-ok'|'auto-zle'|'do-oceny'}
  const [sprawdzone, setSprawdzone] = useState(false) // czy bieżące pytanie już sprawdzone (feedback)
  const [zakonczony, setZakonczony] = useState(false)

  if (!zestaw.length) {
    return (
      <div className="karta">
        <p>Brak pytań dla tomu „{tom}".</p>
        <button className="drugi" onClick={onKoniec}>Wróć</button>
      </div>
    )
  }

  const p = zestaw[i]
  const ostatni = i === zestaw.length - 1
  const zazn = odp[p.id] || []
  const poprawne = p.poprawne || []
  const biezacyOk = zazn.length === poprawne.length && poprawne.every((idx) => zazn.includes(idx))

  const dalej = () => {
    if (ostatni) setZakonczony(true)
    else {
      setI(i + 1)
      setSprawdzone(false)
    }
  }

  // Auto-ocena: krok 1 „Sprawdź" (feedback natychmiast — domknięcie/nagroda przy ADHD),
  // krok 2 „Dalej". Wynik dopisujemy w momencie sprawdzenia.
  const sprawdz = () => {
    onWynik({
      data: teraz(),
      id_prac: pracownik.id_prac,
      id_pytania: p.id,
      zaliczyl: biezacyOk,
      oceniajacy: 'auto',
      notatka: ''
    })
    setWyniki((w) => [...w, { p, stan: biezacyOk ? 'auto-ok' : 'auto-zle', wybrane: zazn }])
    setSprawdzone(true)
  }

  // Pytania nie-auto (otwarty/praktyczny): jednym krokiem do kolejki Mentora.
  const zatwierdzNieAuto = () => {
    onDoKolejki({
      id: idWpisu(pracownik.id_prac, p.id),
      data: teraz(),
      id_prac: pracownik.id_prac,
      id_pytania: p.id,
      typ: p.typ,
      odpowiedz: (odp[p.id] || '').toString().trim()
    })
    setWyniki((w) => [...w, { p, stan: 'do-oceny' }])
    dalej()
  }

  if (zakonczony) {
    const auto = wyniki.filter((w) => w.stan.startsWith('auto'))
    const ok = auto.filter((w) => w.stan === 'auto-ok').length
    const doOceny = wyniki.filter((w) => w.stan === 'do-oceny').length
    return (
      <div className="karta podsumowanie">
        <h1>Quiz ukończony — {tom}</h1>
        {auto.length > 0 && (
          <div className="wynik-hero">
            <div className="wynik-liczba">{ok}<span className="z"> / {auto.length}</span></div>
            <div className="wynik-podpis">poprawnych odpowiedzi</div>
          </div>
        )}
        {doOceny > 0 && (
          <p className="cichy">
            ⏳ {doOceny} {doOceny === 1 ? 'odpowiedź trafiła' : 'odpowiedzi trafiło'} do kolejki
            „Do oceny" — Mentor porówna z wzorcem i zatwierdzi.
          </p>
        )}
        {auto.length > 0 && (
          <div className="przeglad">
            <h3>Przegląd odpowiedzi</h3>
            {auto.map(({ p, stan, wybrane }) => (
              <div key={p.id} className={stan === 'auto-ok' ? 'przeglad-poz ok' : 'przeglad-poz zle'}>
                <div className="przeglad-pyt">
                  <span className="przeglad-znak">{stan === 'auto-ok' ? '✓' : '✗'}</span>
                  {p.pytanie}
                  {p.ccp && <span className="ccp-tag brak">CCP</span>}
                </div>
                {stan === 'auto-zle' && (
                  <div className="przeglad-szczegol">
                    <div className="twoja">
                      Twoja odpowiedź: {(wybrane || []).map((i) => p.opcje[i]).join('; ') || '—'}
                    </div>
                    <div className="poprawna">
                      Poprawnie: {(p.poprawne || []).map((i) => p.opcje[i]).join('; ')}
                    </div>
                    <div className="cichy mini">Źródło: {p.zrodlo}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="glowny" onClick={onKoniec}>Wróć do „Mój poziom"</button>
      </div>
    )
  }

  // ADHD: nie pozwól „przeklikać" pustej odpowiedzi — jasny feedback, gdy nic nie wybrano.
  const odpowiedziano = autoOceniany(p)
    ? zazn.length > 0
    : p.typ === 'praktyczny'
      ? true
      : (odp[p.id] || '').toString().trim().length > 0

  // pasek postępu: sprawdzone pytanie liczy się jako ukończone
  const postep = ((i + (sprawdzone ? 1 : 0)) / zestaw.length) * 100

  return (
    <div className="karta quiz">
      <div className="quiz-progres-wrap">
        <div className="quiz-progres-info">
          <span className="quiz-krok">Pytanie {i + 1} z {zestaw.length} · {tom}</span>
          <div className="quiz-meta">
            <span className="plakietka toku">{p.poziom}</span>
            {p.ccp && <span className="ccp-tag brak">CCP · próg 100%</span>}
          </div>
        </div>
        <div className="quiz-progres">
          <div className="quiz-progres-fill" style={{ width: postep + '%' }} />
        </div>
      </div>

      <h2 className="quiz-pytanie">{p.pytanie}</h2>

      {autoOceniany(p) ? (
        <Opcje
          p={p}
          zazn={zazn}
          sprawdzone={sprawdzone}
          onZmiana={(v) => !sprawdzone && setOdp({ ...odp, [p.id]: v })}
        />
      ) : p.typ === 'praktyczny' ? (
        <div className="prakt">
          <p className="cichy">
            To pytanie praktyczne — wykonaj demonstrację na stanowisku. Mentor oceni wykonanie.
            Możesz dodać notatkę dla Mentora:
          </p>
          <textarea
            className="pole"
            rows={3}
            placeholder="np. na którym stanowisku / o której demonstracja"
            value={odp[p.id] || ''}
            onChange={(e) => setOdp({ ...odp, [p.id]: e.target.value })}
          />
        </div>
      ) : (
        <textarea
          className="pole"
          rows={5}
          placeholder="Twoja odpowiedź — Mentor porówna ją z wzorcem"
          value={odp[p.id] || ''}
          onChange={(e) => setOdp({ ...odp, [p.id]: e.target.value })}
        />
      )}

      {sprawdzone && autoOceniany(p) && (
        <div className={biezacyOk ? 'feedback ok' : 'feedback zle'}>
          <strong>{biezacyOk ? '✓ Dobrze!' : '✗ Niestety'}</strong>
          {biezacyOk
            ? (p.ccp ? ' Punkt krytyczny CCP potwierdzony.' : ' Tak trzymaj.')
            : ` Poprawna odpowiedź: ${poprawne.map((idx) => p.opcje[idx]).join('; ')}.`}
          {!biezacyOk && p.ccp && ' To pytanie CCP (bezpieczeństwo) — próg 100%, warto wrócić do źródła.'}
        </div>
      )}

      <p className="quiz-zrodlo">Źródło do nauki: {p.zrodlo}</p>

      <div className="quiz-akcje">
        <button className="cichy-link" onClick={onKoniec}>Przerwij</button>
        {autoOceniany(p) && !sprawdzone ? (
          <button className="glowny duzy-cta" onClick={sprawdz} disabled={!odpowiedziano}>
            Sprawdź
          </button>
        ) : autoOceniany(p) ? (
          <button className="glowny duzy-cta" onClick={dalej}>
            {ostatni ? 'Zakończ quiz →' : 'Dalej →'}
          </button>
        ) : (
          <button className="glowny duzy-cta" onClick={zatwierdzNieAuto} disabled={!odpowiedziano}>
            {ostatni ? 'Zakończ quiz →' : 'Dalej →'}
          </button>
        )}
      </div>
    </div>
  )
}

function Opcje({ p, zazn, sprawdzone, onZmiana }) {
  const wielo = p.typ === 'wielokrotny'
  const poprawne = p.poprawne || []
  const przelacz = (idx) => {
    if (sprawdzone) return
    if (wielo) {
      onZmiana(zazn.includes(idx) ? zazn.filter((x) => x !== idx) : [...zazn, idx])
    } else {
      onZmiana([idx])
    }
  }
  return (
    <div className={sprawdzone ? 'opcje sprawdzone' : 'opcje'}>
      {p.opcje.map((tekst, idx) => {
        const wybrana = zazn.includes(idx)
        let klasa = 'opcja' + (wybrana ? ' zazn' : '')
        if (sprawdzone) {
          if (poprawne.includes(idx)) klasa += ' poprawna'
          else if (wybrana) klasa += ' blledna'
        }
        return (
          <label key={idx} className={klasa}>
            <input
              type={wielo ? 'checkbox' : 'radio'}
              name={p.id}
              checked={wybrana}
              disabled={sprawdzone}
              onChange={() => przelacz(idx)}
            />
            <span className="opcja-litera">{String.fromCharCode(65 + idx)}</span>
            <span className="opcja-tekst">{tekst}</span>
            {sprawdzone && poprawne.includes(idx) && <span className="opcja-mark ok">✓</span>}
            {sprawdzone && wybrana && !poprawne.includes(idx) && <span className="opcja-mark zle">✗</span>}
          </label>
        )
      })}
      {wielo && !sprawdzone && <p className="cichy mini">Zaznacz wszystkie poprawne — komplet = zaliczone.</p>}
    </div>
  )
}
