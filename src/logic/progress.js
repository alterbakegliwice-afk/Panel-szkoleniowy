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

// WYNIK to log append-only: aktualny stan = ostatni wpis per (pracownik, pytanie).
// Wpisy dopisywane chronologicznie, więc późniejszy w tablicy = nowszy.
export function ostatnieWyniki(wyniki) {
  const mapa = new Map()
  for (const w of wyniki) mapa.set(w.id_prac + '|' + w.id_pytania, w)
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

// Pełny profil postępu pracownika: per tom + poziom ogólny + status CCP osobno.
export function profilPracownika(pytania, wyniki, idPrac, konfig) {
  const ostatnie = ostatnieWyniki(wyniki)
  const tomy = listaTomow(pytania).map((tom) =>
    postepTomu(pytania, ostatnie, idPrac, tom, konfig)
  )
  const poziomOgolny = tomy.length
    ? tomy.reduce((s, t) => s + t.procent, 0) / tomy.length
    : 0
  const ccpOk = tomy.every((t) => t.ccp.status === 'OK')
  return {
    tomy,
    poziomOgolny,
    ccpOk,
    // status „Samodzielny" wymaga TAKŻE ccp=OK we wszystkich tomach (spec.md §4)
    samodzielnyMozliwy: ccpOk && tomy.every((t) => t.awansSamodzielny),
    nastepnyKrok: nastepnyKrok(tomy, konfig)
  }
}

// „Następny krok" dla widoku Mój poziom — CCP zawsze ma pierwszeństwo.
export function nastepnyKrok(tomy, konfig) {
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
  const wToku = [...tomy]
    .filter((t) => t.status === 'W TOKU')
    .sort((a, b) => a.procent - b.procent)
  if (wToku.length) {
    const t = wToku[0]
    return {
      typ: 'TOM',
      tekst:
        `Podciągnij tom „${t.tom}" — masz ${Math.round(t.procent * 100)}%, ` +
        `próg opanowania to ${Math.round(konfig.PROG_ZALICZENIA * 100)}%.`
    }
  }
  return {
    typ: 'GOTOWE',
    tekst:
      'Wszystkie tomy opanowane i CCP zaliczone — kryteria awansu spełnione. ' +
      'Zatwierdzenie awansu to decyzja Mentora/Właściciela.'
  }
}
