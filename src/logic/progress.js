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

// OŚ PRAKTYCZNA (blind spot #3): wiedza ≠ umiejętność przy piecu.
// Awans na Samodzielnego/Mentora wymaga OSOBNEGO potwierdzenia praktycznego —
// Mentor/Właściciel widział wykonanie na stanowisku. Log praktyki jest append-only
// z możliwością cofnięcia (potwierdzil:false); liczy się ostatni wpis po dacie.
export function praktykaStatus(praktyka, idPrac, tom) {
  const wpisy = (praktyka || [])
    .filter((p) => p.id_prac === idPrac && p.tom === tom)
    .slice()
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
  const ost = wpisy[wpisy.length - 1]
  return {
    potwierdzona: !!(ost && ost.potwierdzil),
    data: ost ? ost.data : null,
    oceniajacy: ost ? ost.oceniajacy || '' : '',
    notatka: ost ? ost.notatka || '' : ''
  }
}

// Czy potwierdzenie praktyczne jest wymagane dla danego poziomu docelowego
// (dopiero od SAMODZIELNEGO — Junior wciąż się uczy, sama wiedza wystarcza do celu).
export function praktykaWymaganaDla(poziomDocelowy) {
  return (RANGA[poziomDocelowy] || RANGA.SAMODZIELNY) >= RANGA.SAMODZIELNY
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
export function profilPracownika(pytania, wyniki, idPrac, konfig, poziomDocelowy = 'SAMODZIELNY', praktyka = []) {
  const ostatnie = ostatnieWyniki(wyniki)
  const tomy = listaTomow(pytania).map((tom) => ({
    ...postepTomu(pytania, ostatnie, idPrac, tom, konfig),
    praktyka: praktykaStatus(praktyka, idPrac, tom)
  }))
  const poziomOgolny = tomy.length
    ? tomy.reduce((s, t) => s + t.procent, 0) / tomy.length
    : 0
  const ccpOk = tomy.every((t) => t.ccp.status === 'OK')
  const praktykaWymagana = praktykaWymaganaDla(poziomDocelowy)
  // „Praktyka OK" liczymy tylko dla tomów, w których pracownik osiągnął już wiedzę do celu —
  // nie ma sensu żądać pokazu z tomu, którego jeszcze się uczy. Wymagana dopiero od Samodzielnego.
  const tomyDoPraktyki = tomy.filter((t) => tomCelOsiagniety(t, poziomDocelowy))
  const praktykaOk = !praktykaWymagana || tomyDoPraktyki.every((t) => t.praktyka.potwierdzona)
  const celOsiagniety =
    ccpOk && tomy.every((t) => tomCelOsiagniety(t, poziomDocelowy)) && praktykaOk
  return {
    tomy,
    poziomOgolny,
    ccpOk,
    praktykaWymagana,
    praktykaOk,
    cel: {
      poziomDocelowy,
      osiagniety: celOsiagniety,
      etykieta: celOsiagniety ? `Cel osiągnięty: ${poziomDocelowy}` : `W drodze do: ${poziomDocelowy}`
    },
    // status „Samodzielny" wymaga: wiedza (Junior+Samodzielny) + ccp=OK + potwierdzenie
    // praktyczne we wszystkich tomach (spec.md §4 + oś praktyczna #3).
    samodzielnyMozliwy:
      ccpOk && tomy.every((t) => t.awansSamodzielny) && tomy.every((t) => t.praktyka.potwierdzona),
    nastepnyKrok: nastepnyKrok(tomy, konfig, poziomDocelowy, praktykaWymagana)
  }
}

// „Następny krok" dla widoku Mój poziom — CCP zawsze ma pierwszeństwo,
// potem wskazuje konkretny poziom do podciągnięcia w drodze do CELU pracownika.
export function nastepnyKrok(tomy, konfig, poziomDocelowy = 'SAMODZIELNY', praktykaWymagana = praktykaWymaganaDla(poziomDocelowy)) {
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
  // Wiedza i CCP domknięte — teraz oś praktyczna (dla Samodzielnego/Mentora).
  if (praktykaWymagana) {
    const bezPraktyki = tomy.filter((t) => !t.praktyka || !t.praktyka.potwierdzona)
    if (bezPraktyki.length) {
      return {
        typ: 'PRAKTYKA',
        tekst:
          'Wiedza i CCP zaliczone. Umów z Mentorem pokaz na stanowisku (potwierdzenie praktyczne) w: ' +
          bezPraktyki.map((t) => t.tom).join(', ') +
          '. Sama wiedza to nie to samo co samodzielna zmiana.'
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
