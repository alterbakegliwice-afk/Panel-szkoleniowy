// LOGIKA POMIARU — rdzeń platformy (spec.md §4, AI_BATON.md §4)
//
// REGUŁA NIENARUSZALNA — CCP:
// Pytania ccp=true (bezpieczeństwo żywności: CCP1 ≥92°C pieczywo, CCP5 ≥85°C/1min krem)
// mają próg 100% i NIE uśredniają się z wynikiem ogólnym. Pracownik z 95% ogólnie,
// ale z oblanym choć jednym CCP → status bezpieczeństwa = BRAK (blokada Samodzielnego),
// wyświetlany OSOBNO. Wszystkie funkcje procentowe w tym pliku liczą WYŁĄCZNIE
// pytania ccp=false; ścieżka CCP jest osobna i binarna.

export const DOMYSLNA_KONFIG = {
  PROG_ZALICZENIA: 0.8, // próg opanowania poziomu (KONFIG w xlsx)
  PROG_CCP: 1.0 // nienegocjowalny — nie wystawiaj do edycji
}

export const POZIOMY = ['JUNIOR', 'SAMODZIELNY', 'MENTOR']

// Ranga poziomów — do liczenia „celu" pracownika (poziom_docelowy).
const RANGA = { JUNIOR: 1, SAMODZIELNY: 2, MENTOR: 3 }

// Poziomy, które trzeba opanować, by osiągnąć poziom docelowy
// (JUNIOR → tylko JUNIOR; SAMODZIELNY → JUNIOR+SAMODZIELNY; MENTOR → wszystkie).
export function poziomyDoCelu(poziomDocelowy) {
  const r = RANGA[poziomDocelowy] || RANGA.SAMODZIELNY
  return POZIOMY.filter((p) => RANGA[p] <= r)
}

// WYNIK to log append-only: aktualny stan = ostatni wpis per (pracownik, pytanie).
// „Ostatni" liczymy po znaczniku czasu `data` (stabilnie — przy równych czasach
// wygrywa późniejszy w tablicy). Dzięki temu stan jest poprawny nawet gdy log
// zostanie zaimportowany/scalony poza kolejnością chronologiczną.
export function ostatnieWyniki(wyniki) {
  const posortowane = wyniki
    .map((w, i) => [w, i])
    .sort((a, b) => {
      const da = a[0].data || ''
      const db = b[0].data || ''
      if (da < db) return -1
      if (da > db) return 1
      return a[1] - b[1] // równy czas → kolejność dopisania
    })
  const mapa = new Map()
  for (const [w] of posortowane) mapa.set(w.id_prac + '|' + w.id_pytania, w)
  return mapa
}

// true = zaliczone, false = niezaliczone, null = brak podejścia
export function stanPytania(ostatnie, idPrac, idPytania) {
  const w = ostatnie.get(idPrac + '|' + idPytania)
  return w ? !!w.zaliczyl : null
}

// CCP — osobna, twarda ścieżka. Zwraca OK tylko gdy KAŻDE pytanie CCP tomu
// ma ostatni wynik zaliczony. Tom bez pytań CCP → OK (nie ma czego blokować).
export function ccpStatusTomu(pytania, ostatnie, idPrac, tom) {
  const ccp = pytania.filter((p) => p.tom === tom && p.ccp)
  const szczegoly = ccp.map((p) => ({
    id: p.id,
    pytanie: p.pytanie,
    stan: stanPytania(ostatnie, idPrac, p.id)
  }))
  const ok = szczegoly.every((s) => s.stan === true)
  return { status: ok ? 'OK' : 'BRAK', pytania: szczegoly }
}

// Opanowanie tomu na danym poziomie — tylko pytania ccp=false.
// Poziom bez pytań w banku → procent=null, opanowany=true (warunek pusty).
export function postepPoziomu(pytania, ostatnie, idPrac, tom, poziom, prog) {
  const zestaw = pytania.filter((p) => p.tom === tom && p.poziom === poziom && !p.ccp)
  const zaliczonych = zestaw.filter((p) => stanPytania(ostatnie, idPrac, p.id) === true).length
  const procent = zestaw.length ? zaliczonych / zestaw.length : null
  return {
    poziom,
    pytan: zestaw.length,
    zaliczonych,
    procent,
    opanowany: procent === null ? true : procent >= prog
  }
}

export function postepTomu(pytania, ostatnie, idPrac, tom, konfig) {
  const prog = konfig.PROG_ZALICZENIA
  const zestaw = pytania.filter((p) => p.tom === tom && !p.ccp)
  const zaliczonych = zestaw.filter((p) => stanPytania(ostatnie, idPrac, p.id) === true).length
  const procent = zestaw.length ? zaliczonych / zestaw.length : 0
  const poziomy = POZIOMY.map((poz) => postepPoziomu(pytania, ostatnie, idPrac, tom, poz, prog))
  const ccp = ccpStatusTomu(pytania, ostatnie, idPrac, tom)
  const [junior, samodzielny] = poziomy
  return {
    tom,
    pytan: zestaw.length,
    zaliczonych,
    procent,
    status: procent >= prog ? 'OPANOWANY' : 'W TOKU',
    poziomy,
    ccp,
    // Awans Junior → Samodzielny w tomie (spec.md §4 „Awans"):
    // JUNIOR ≥ próg AND SAMODZIELNY ≥ próg AND ccp=OK.
    // Samodzielny → Mentor to decyzja właściciela, nie automat.
    awansSamodzielny: junior.opanowany && samodzielny.opanowany && ccp.status === 'OK'
  }
}

export function listaTomow(pytania) {
  return [...new Set(pytania.map((p) => p.tom))]
}

// ─── SPACED RETRIEVAL — rozłożone powtórki wiedzy ─────────────────────────────
// Dowód: powtarzanie z rozłożeniem + aktywne przypominanie (spaced retrieval)
// daje 2–3× lepszą retencję niż nauka jednorazowa i jest zwalidowane w miejscu
// pracy (Cepeda i in. 2006; badania treningów sprzedażowych). Wiedza faktograficzna
// (parametry, CCP) zanika z czasem — „zaliczone raz” nie znaczy „umie na zawsze”.
//
// Harmonogram rozszerzający: po kolejnych zaliczeniach z rzędu odstęp rośnie.
// Pozycja wraca do powtórki, gdy od ostatniego zaliczenia minął odstęp dla jej
// „serii”. Oblanie kasuje serię (wraca do intensywnej nauki, nie powtórki).
export const INTERWALY_POWTOREK_DNI = [7, 30, 90, 180]

// Tylko pytania auto-oceniane da się samodzielnie powtórzyć bez Mentora —
// praktyczne/otwarte idą inną ścieżką i nie wchodzą do powtórek. Definicja
// MUSI zgadzać się z Quiz.autoOceniany (typ + opcje), inaczej powtórka
// wpuściłaby pytanie, którego quiz nie umie auto-ocenić.
function autoOceniane(p) {
  return (p.typ === 'jednokrotny' || p.typ === 'wielokrotny') && Array.isArray(p.opcje) && p.opcje.length > 0
}

function dodajDni(iso, dni) {
  const d = new Date(iso)
  d.setDate(d.getDate() + dni)
  return d
}

// Lista pozycji, które „dojrzały” do powtórki dla danego pracownika.
// terazISO wstrzykiwalne (testy). CCP na początku listy — utrwalenie wiedzy
// o bezpieczeństwie żywności jest najważniejsze.
export function pozycjeDoPowtorki(pytania, wyniki, idPrac, terazISO = null) {
  const teraz = new Date(terazISO || new Date().toISOString())
  const mapaP = new Map(pytania.map((p) => [p.id, p]))
  const hist = new Map()
  wyniki
    .filter((w) => w.id_prac === idPrac && mapaP.has(w.id_pytania))
    .slice()
    .sort((a, b) => ((a.data || '') < (b.data || '') ? -1 : (a.data || '') > (b.data || '') ? 1 : 0))
    .forEach((w) => {
      if (!hist.has(w.id_pytania)) hist.set(w.id_pytania, [])
      hist.get(w.id_pytania).push(w)
    })

  const due = []
  for (const [idPyt, wpisy] of hist) {
    const p = mapaP.get(idPyt)
    if (!autoOceniane(p)) continue
    const ost = wpisy[wpisy.length - 1]
    if (!ost.zaliczyl || !ost.data) continue // oblane lub bez daty → nie powtórka
    let seria = 0
    for (let i = wpisy.length - 1; i >= 0 && wpisy[i].zaliczyl; i--) seria++
    const interwal = INTERWALY_POWTOREK_DNI[Math.min(seria - 1, INTERWALY_POWTOREK_DNI.length - 1)]
    const termin = dodajDni(ost.data, interwal)
    if (teraz >= termin) {
      due.push({
        id: idPyt,
        tom: p.tom,
        poziom: p.poziom,
        ccp: !!p.ccp,
        pytanie: p.pytanie,
        ostatniaData: ost.data,
        seria,
        dniOdOstatniej: Math.floor((teraz - new Date(ost.data)) / 86400000)
      })
    }
  }
  return due.sort((a, b) => (b.ccp - a.ccp) || (a.ostatniaData < b.ostatniaData ? -1 : 1))
}

// Podsumowanie do dashboardu: ile pozycji do powtórki, w tym ile CCP.
export function podsumowaniePowtorek(pytania, wyniki, idPrac, terazISO = null) {
  const poz = pozycjeDoPowtorki(pytania, wyniki, idPrac, terazISO)
  return { pozycje: poz, liczba: poz.length, ccp: poz.filter((x) => x.ccp).length }
}

// Pełna historia podejść pracownika (log append-only) — wzbogacona o dane pytania
// i posortowana malejąco (najnowsze na górze). To dowód przy decyzji o awansie:
// kiedy, co, kto ocenił, z jaką notatką.
export function historiaPracownika(wyniki, pytania, idPrac) {
  const mapaP = new Map(pytania.map((p) => [p.id, p]))
  return wyniki
    .filter((w) => w.id_prac === idPrac)
    .map((w) => {
      const p = mapaP.get(w.id_pytania)
      return {
        data: w.data || '',
        id_pytania: w.id_pytania,
        tom: p?.tom || '—',
        poziom: p?.poziom || '—',
        ccp: !!p?.ccp,
        pytanie: p?.pytanie || '(pytanie spoza aktualnego banku)',
        zaliczyl: !!w.zaliczyl,
        oceniajacy: w.oceniajacy || '—',
        notatka: w.notatka || ''
      }
    })
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
}

// Czy w danym tomie pracownik osiągnął swój poziom docelowy:
// wszystkie poziomy do celu opanowane ORAZ CCP tomu = OK.
export function tomCelOsiagniety(tom, poziomDocelowy) {
  const potrzebne = poziomyDoCelu(poziomDocelowy)
  const poziomyOk = tom.poziomy
    .filter((p) => potrzebne.includes(p.poziom))
    .every((p) => p.opanowany)
  return poziomyOk && tom.ccp.status === 'OK'
}

// Pełny profil postępu pracownika: per tom + poziom ogólny + status CCP osobno
// + status względem poziomu DOCELOWEGO (Pomocnik→JUNIOR, Piekarz→SAMODZIELNY itd.).
export function profilPracownika(pytania, wyniki, idPrac, konfig, poziomDocelowy = 'SAMODZIELNY') {
  const ostatnie = ostatnieWyniki(wyniki)
  const tomy = listaTomow(pytania).map((tom) =>
    postepTomu(pytania, ostatnie, idPrac, tom, konfig)
  )
  const poziomOgolny = tomy.length
    ? tomy.reduce((s, t) => s + t.procent, 0) / tomy.length
    : 0
  const ccpOk = tomy.every((t) => t.ccp.status === 'OK')
  const celOsiagniety = ccpOk && tomy.every((t) => tomCelOsiagniety(t, poziomDocelowy))
  return {
    tomy,
    poziomOgolny,
    ccpOk,
    cel: {
      poziomDocelowy,
      osiagniety: celOsiagniety,
      etykieta: celOsiagniety ? `Cel osiągnięty: ${poziomDocelowy}` : `W drodze do: ${poziomDocelowy}`
    },
    // status „Samodzielny" wymaga TAKŻE ccp=OK we wszystkich tomach (spec.md §4)
    samodzielnyMozliwy: ccpOk && tomy.every((t) => t.awansSamodzielny),
    nastepnyKrok: nastepnyKrok(tomy, konfig, poziomDocelowy)
  }
}

// „Następny krok" dla widoku Mój poziom — CCP zawsze ma pierwszeństwo,
// potem wskazuje konkretny poziom do podciągnięcia w drodze do CELU pracownika.
export function nastepnyKrok(tomy, konfig, poziomDocelowy = 'SAMODZIELNY') {
  const ccpBrak = tomy.filter((t) => t.ccp.status === 'BRAK')
  if (ccpBrak.length) {
    return {
      typ: 'CCP',
      tekst:
        'Zalicz pytania CCP (bezpieczeństwo żywności) w: ' +
        ccpBrak.map((t) => t.tom).join(', ') +
        '. Bez kompletu CCP nie ma statusu Samodzielny — niezależnie od procentu ogólnego.'
    }
  }
  const prog = konfig.PROG_ZALICZENIA
  // Szukaj wg rangi poziomu: najpierw braki na JUNIOR, potem SAMODZIELNY itd.
  for (const poz of poziomyDoCelu(poziomDocelowy)) {
    const tomBrak = tomy.find((t) => {
      const pp = t.poziomy.find((x) => x.poziom === poz)
      return pp && pp.pytan > 0 && !pp.opanowany
    })
    if (tomBrak) {
      const pp = tomBrak.poziomy.find((x) => x.poziom === poz)
      return {
        typ: 'TOM',
        tekst:
          `Podciągnij poziom ${poz} w tomie „${tomBrak.tom}" — masz ` +
          `${Math.round((pp.procent || 0) * 100)}%, próg to ${Math.round(prog * 100)}%.`
      }
    }
  }
  if (poziomDocelowy === 'JUNIOR') {
    return { typ: 'GOTOWE', tekst: 'Docelowy poziom JUNIOR osiągnięty we wszystkich tomach, CCP zaliczone. 👏' }
  }
  if (poziomDocelowy === 'MENTOR') {
    return { typ: 'GOTOWE', tekst: 'Kryteria poziomu Mentor spełnione — nadanie statusu to decyzja Właściciela.' }
  }
  return {
    typ: 'GOTOWE',
    tekst: 'Kryteria awansu na Samodzielnego spełnione — zatwierdzenie to decyzja Mentora/Właściciela.'
  }
}
