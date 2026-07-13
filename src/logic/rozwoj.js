// Warstwa ROZWOJU — integracja z testami Work Profile.
//
// Model: test Work Profile (Profil Pracy albo Mapa Potencjału) diagnozuje cechy
// i zachowania → panel mapuje wynik na 8 obszarów rozwojowych (skala 0–100)
// → pracownik przerabia moduły rozwijające najsłabsze obszary → PONOWNE
// wykonanie testu jest ewaluacją szkolenia: panel porównuje wynik z poprzednim
// podejściem TEGO SAMEGO narzędzia i pokazuje deltę per obszar.
//
// Wyniki wpływają dwiema drogami:
// 1) wspólny localStorage (klucz niżej) — oba narzędzia zapisują tam rekord po
//    ukończeniu testu; działa, bo panel i testy stoją na tym samym originie
//    GitHub Pages (alterbakegliwice-afk.github.io/...),
// 2) plik JSON pobrany przyciskiem w raporcie testu — dla innego urządzenia
//    lub uruchomienia z dysku (file://).
import rozwojKompetencji from '../data/rozwoj_kompetencji.json'
import charakterSzkolenie from '../data/charakter_szkolenie.json'

export const ROZWOJ = rozwojKompetencji
export const CHARAKTER_SZKOLENIE = charakterSzkolenie

// Klucz współdzielony z repo alterbake-work-profile (index.html, profil-pracy-mvp.html).
export const WP_KLUCZ_WYNIKOW = 'alterbake_work_profile_wyniki_v1'

export const NARZEDZIA = {
  'profil-pracy': {
    nazwa: 'Profil Pracy',
    url: 'https://alterbakegliwice-afk.github.io/alterbake-work-profile/profil-pracy-mvp.html'
  },
  'mapa-potencjalu': {
    nazwa: 'Mapa Potencjału',
    url: 'https://alterbakegliwice-afk.github.io/alterbake-work-profile/'
  }
}

// Polskie nazwy talentów Mapy Potencjału (do wyświetlania mapowania w UI).
export const TALENTY_NAZWY = {
  precision: 'Precyzja',
  standards: 'Standardy wewnętrzne',
  empathy: 'Empatia',
  relations: 'Relacyjność',
  consistency: 'Konsekwencja',
  structure: 'Strukturyzacja',
  curiosity: 'Ciekawość poznawcza',
  flexibility: 'Elastyczność',
  independence: 'Niezależność',
  initiative: 'Inicjatywa',
  regulation: 'Regulacja emocjonalna',
  resilience: 'Odporność',
  drive: 'Motywacja wewnętrzna',
  purpose: 'Potrzeba sensu',
  influence: 'Wpływ i perswazja',
  communication: 'Komunikacja'
}

// Mapa talent (Mapa Potencjału) → obszar rozwojowy, zbudowana z danych JSON.
// Object.create(null): klucze rekordu przychodzą z zewnętrznego JSON-a, więc
// lookup nie może trafiać w prototyp (np. klucz "__proto__" → Object.prototype).
const TALENT_DO_OBSZARU = Object.create(null)
for (const o of ROZWOJ.obszary) {
  for (const t of o.talenty) TALENT_DO_OBSZARU[t] = o.id
}

// Nazwa narzędzia odporna na rekordy spoza aktualnej listy (np. stara kopia
// zapasowa z narzędziem, którego już nie znamy) — UI nie może się wywalić.
export function nazwaNarzedzia(id) {
  return NARZEDZIA[id]?.nazwa || String(id || 'nieznane narzędzie')
}

export function obszar(id) {
  return ROZWOJ.obszary.find((o) => o.id === id) || null
}

// Prefiks wpisu w logu nauki — moduły rozwojowe współdzielą log `nauka`
// z tomami, więc obszar dostaje przestrzeń nazw, by „Komunikacja" z rozwoju
// nie zderzyła się z ewentualnym tomem o tej samej nazwie.
export function obszarNauki(idObszaru) {
  return 'ROZWOJ:' + idObszaru
}

// --- WALIDACJA REKORDU Z TESTU (twarda — jak walidujBank w store.js) ---
export function walidujWynikWp(obiekt) {
  if (!obiekt || typeof obiekt !== 'object') return 'To nie jest wynik testu Work Profile.'
  if (obiekt.typ !== 'alterbake-wynik-work-profile') {
    return 'Plik nie jest wynikiem testu Work Profile (brak pola typ).'
  }
  if (!NARZEDZIA[obiekt.narzedzie]) {
    return `Nieznane narzędzie „${obiekt.narzedzie}" — obsługiwane: ${Object.keys(NARZEDZIA).join(', ')}.`
  }
  if (!obiekt.wyniki || typeof obiekt.wyniki !== 'object' || Array.isArray(obiekt.wyniki)) {
    return 'Wynik nie ma obiektu „wyniki".'
  }
  const wartosci = Object.values(obiekt.wyniki)
  if (!wartosci.length) return 'Obiekt „wyniki" jest pusty.'
  if (wartosci.some((v) => typeof v !== 'number' || !isFinite(v))) {
    return 'Wartości w „wyniki" muszą być liczbami.'
  }
  return null
}

// --- NORMALIZACJA DO OBSZARÓW 0–100 ---
// Profil Pracy: kategorie 0–100 pokrywają się 1:1 z id obszarów rozwojowych.
// Mapa Potencjału: talenty w skali ~[-2..+4] → procent (s+2)/6·100, a obszar
// to średnia jego talentów. Skale narzędzi są różne, dlatego DELTĘ postępu
// liczymy wyłącznie między podejściami tego samego narzędzia.
const ogranicz = (v) => Math.max(0, Math.min(100, Math.round(v)))

export function naObszary(rekord) {
  const wynik = {}
  if (rekord.narzedzie === 'profil-pracy') {
    for (const o of ROZWOJ.obszary) {
      const v = rekord.wyniki[o.id]
      if (typeof v === 'number') wynik[o.id] = ogranicz(v)
    }
    return wynik
  }
  // mapa-potencjalu
  const sumy = {}
  const liczby = {}
  for (const [talent, v] of Object.entries(rekord.wyniki)) {
    const idObszaru = TALENT_DO_OBSZARU[talent]
    if (!idObszaru || typeof v !== 'number') continue
    const procent = ((v + 2) / 6) * 100
    sumy[idObszaru] = (sumy[idObszaru] || 0) + procent
    liczby[idObszaru] = (liczby[idObszaru] || 0) + 1
  }
  for (const id of Object.keys(sumy)) wynik[id] = ogranicz(sumy[id] / liczby[id])
  return wynik
}

// Rekord panelu musi być bezpieczny do renderowania. Log `profile` przychodzi
// też z kopii zapasowej (dowolny plik od użytkownika) i ze starych stanów
// localStorage — jeden zepsuty wpis nie może wywalić zakładki Rozwój/Zespół.
export function poprawnyRekordPanelu(p) {
  return !!(
    p &&
    typeof p === 'object' &&
    typeof p.id_prac === 'string' &&
    p.id_prac &&
    NARZEDZIA[p.narzedzie] &&
    typeof p.data === 'string' &&
    p.obszary &&
    typeof p.obszary === 'object' &&
    !Array.isArray(p.obszary)
  )
}

// Sanityzacja logu profili: nie-tablica → [], wpisy zepsute odpadają,
// wartości obszarów przycinane do liczb 0–100.
export function filtrujProfile(lista) {
  if (!Array.isArray(lista)) return []
  return lista.filter(poprawnyRekordPanelu).map((p) => {
    const obszary = {}
    for (const o of ROZWOJ.obszary) {
      const v = p.obszary[o.id]
      if (typeof v === 'number' && isFinite(v)) obszary[o.id] = ogranicz(v)
    }
    return { ...p, obszary }
  })
}

// Zgodność imion (ostrzeżenie przed przypisaniem cudzego wyniku).
// Porównanie miękkie: bez wielkości liter, polskich znaków i dopisków
// w nawiasach — „(przykład) Weronika" pasuje do „weronika".
export function imionaPasuja(a, b) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim()
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return true // brak danych = nie strasz dialogiem
  return na === nb || na.split(/\s+/).some((t) => nb.split(/\s+/).includes(t))
}

// Rekord panelu (do append-only logu `profile` w stanie).
export function rekordProfilu(surowy, idPrac, dataImportu) {
  return {
    id: 'WP-' + idPrac + '-' + surowy.narzedzie + '-' + surowy.data,
    id_prac: idPrac,
    narzedzie: surowy.narzedzie,
    data: surowy.data || dataImportu,
    dataImportu,
    osoba: surowy.osoba || {},
    wyniki: surowy.wyniki,
    charakter: surowy.charakter || null,
    obszary: naObszary(surowy)
  }
}

// Duplikat = ten sam pracownik + narzędzie + identyczne wyniki surowe
// (albo identyczny znacznik czasu testu).
export function czyDuplikatProfilu(profile, idPrac, surowy) {
  return (Array.isArray(profile) ? profile : []).some(
    (p) =>
      p.id_prac === idPrac &&
      p.narzedzie === surowy.narzedzie &&
      (p.data === surowy.data || JSON.stringify(p.wyniki) === JSON.stringify(surowy.wyniki))
  )
}

// Podejścia pracownika, chronologicznie (log może być scalony poza kolejnością).
export function seriaTestow(profile, idPrac) {
  return (Array.isArray(profile) ? profile : [])
    .filter((p) => p && p.id_prac === idPrac)
    .slice()
    .sort((a, b) => ((a.data || '') < (b.data || '') ? -1 : (a.data || '') > (b.data || '') ? 1 : 0))
}

// Pełny obraz rozwoju pracownika:
// - aktualny: ostatnie podejście (dowolne narzędzie),
// - delta: względem POPRZEDNIEGO podejścia TEGO SAMEGO narzędzia (ewaluacja
//   szkolenia; skal różnych narzędzi nie porównujemy między sobą),
// - priorytety: 3 najsłabsze obszary z ostatniego podejścia.
export function postepRozwoju(profile, idPrac) {
  const seria = seriaTestow(profile, idPrac)
  if (!seria.length) return null
  const ostatni = seria[seria.length - 1]
  const poprzedni = seria
    .slice(0, -1)
    .reverse()
    .find((p) => p.narzedzie === ostatni.narzedzie) || null

  const obszary = ROZWOJ.obszary.map((o) => {
    const aktualny = (ostatni.obszary || {})[o.id]
    const bazowy = poprzedni ? (poprzedni.obszary || {})[o.id] : undefined
    return {
      id: o.id,
      nazwa: o.nazwa,
      opis: o.opis,
      aktualny: typeof aktualny === 'number' ? aktualny : null,
      delta:
        typeof aktualny === 'number' && typeof bazowy === 'number'
          ? aktualny - bazowy
          : null
    }
  })

  const zWynikiem = obszary.filter((o) => o.aktualny !== null)
  const priorytety = zWynikiem
    .slice()
    .sort((a, b) => a.aktualny - b.aktualny)
    .slice(0, 3)
    .map((o) => o.id)

  return {
    ostatni,
    poprzedni, // null = pierwsze podejście tym narzędziem → retest będzie ewaluacją
    liczbaTestow: seria.length,
    seria,
    obszary,
    priorytety
  }
}

// Średnia zmiana po reteście (tylko obszary z policzoną deltą) — skrót dla
// widoku zespołu: jedna liczba odpowiadająca na „czy szkolenie działa?".
export function sredniaDelta(obszary) {
  const zDelta = (obszary || []).filter((o) => typeof o.delta === 'number')
  if (!zDelta.length) return null
  return Math.round((zDelta.reduce((s, o) => s + o.delta, 0) / zDelta.length) * 10) / 10
}

// Podsumowanie rozwoju całego zespołu (widok Mentora/Właściciela):
// jeden wiersz na pracownika, postep=null gdy brak testów.
export function podsumowanieZespolu(profile, pracownicy) {
  return (pracownicy || []).map((prac) => {
    const postep = postepRozwoju(profile, prac.id_prac)
    return {
      prac,
      postep,
      sredniaZmiana: postep ? sredniaDelta(postep.obszary) : null
    }
  })
}

// --- MIKROPRAKTYKI I PRZYPOMNIENIE O RETEŚCIE ---
// Każdy moduł rozwojowy kończy się kartą „Mikropraktyki na najbliższe 2 tygodnie”.
// To ogniwo między nauką a retestem: pracownik odhacza wdrażanie w codziennej pracy.
export function mikropraktyki(idObszaru) {
  const o = obszar(idObszaru)
  if (!o) return []
  const karta = (o.nauka?.karty || []).find((k) => /Mikropraktyki/i.test(k.tytul || ''))
  return karta ? karta.punkty.slice() : []
}

// Klucz pojedynczej praktyki w logu `praktyki` (append-only lista kluczy).
export function kluczPraktyki(idPrac, idObszaru, idx) {
  return idPrac + '|' + idObszaru + '|' + idx
}

// Ile praktyk obszaru odhaczonych (do paska postępu na karcie obszaru).
export function postepPraktyk(praktyki, idPrac, idObszaru) {
  const wszystkie = mikropraktyki(idObszaru)
  const zbior = new Set(Array.isArray(praktyki) ? praktyki : [])
  const zrobione = wszystkie.filter((_, i) => zbior.has(kluczPraktyki(idPrac, idObszaru, i))).length
  return { zrobione, wszystkie: wszystkie.length }
}

// Data nauki danego obszaru (z logu `nauka`), jeśli przerobiony.
export function dataNaukiObszaru(nauka, idPrac, idObszaru) {
  const wpis = (nauka || []).find(
    (n) => n.id_prac === idPrac && n.obszar === obszarNauki(idObszaru)
  )
  return wpis ? wpis.data : null
}

// Przypomnienie o reteście: od daty nauki + `tygodnie` (domyślnie 6) warto
// wykonać test ponownie jako ewaluację. Znika, gdy pojawił się test PO nauce
// (cykl domknięty). `terazISO` wstrzykiwalne dla testów.
export function statusRetestu(nauka, idPrac, profile, tygodnie = 6, terazISO = null) {
  const daty = ROZWOJ.obszary
    .map((o) => dataNaukiObszaru(nauka, idPrac, o.id))
    .filter(Boolean)
    .sort()
  if (!daty.length) return null
  const naukaOd = daty[0]
  const naukaDo = daty[daty.length - 1]
  const cel = new Date(naukaDo)
  cel.setDate(cel.getDate() + tygodnie * 7)
  const celISO = cel.toISOString()
  const seria = seriaTestow(profile, idPrac)
  const ostatniTest = seria.length ? seria[seria.length - 1].data : null
  const zrobionyPoNauce = !!(ostatniTest && ostatniTest > naukaDo)
  const teraz = terazISO || new Date().toISOString()
  return {
    naukaOd,
    naukaDo,
    celData: celISO,
    tygodnie,
    zrobionyPoNauce,
    dojrzaly: !zrobionyPoNauce && teraz >= celISO
  }
}

// --- WSKAZÓWKI SZKOLENIOWE Z PROFILU CHARAKTERU ---
// Charakter dostarcza tylko Mapa Potencjału (pole `charakter`). Dla każdego
// wyraźnego wymiaru (|wartość| ≥ prog) zwraca wskazówkę dla Mentora „jak uczyć
// tę osobę”. Kolejność: najsilniejsze sygnały pierwsze — one najbardziej zmieniają
// formę szkolenia. Styl uczenia się i tempo dostają lekką premię (najpraktyczniejsze).
const WAGA_PRAKTYCZNA = { uczenie: 0.5, tempo: 0.3, ryzyko: 0.2 }

export function wskazowkiCharakteru(charakter) {
  if (!charakter || typeof charakter !== 'object') return []
  const prog = CHARAKTER_SZKOLENIE.prog ?? 1
  const wynik = []
  for (const [klucz, def] of Object.entries(CHARAKTER_SZKOLENIE.wymiary)) {
    const v = charakter[klucz]
    if (typeof v !== 'number' || !isFinite(v)) continue
    const strona = v >= prog ? 'hi' : v <= -prog ? 'lo' : null
    if (!strona) continue
    wynik.push({
      klucz,
      nazwa: def.nazwa,
      biegun: def[strona].biegun,
      jakSzkolic: def[strona].jakSzkolic,
      sila: Math.abs(v) + (WAGA_PRAKTYCZNA[klucz] || 0)
    })
  }
  return wynik.sort((a, b) => b.sila - a.sila)
}

// Wskazówki z ostatniego podejścia, które niosło charakter (Mapa Potencjału).
// Retest Profilem Pracy nie kasuje wcześniejszego profilu charakteru.
export function wskazowkiCharakteruZSerii(profile, idPrac) {
  const seria = seriaTestow(profile, idPrac)
  for (let i = seria.length - 1; i >= 0; i--) {
    const w = wskazowkiCharakteru(seria[i].charakter)
    if (w.length) return { data: seria[i].data, wskazowki: w }
  }
  return null
}

// --- TREND OBSZARÓW W CZASIE ---
// Po 3+ podejściach pojedyncza delta (ostatni vs poprzedni) to za mało — liczy się
// kierunek. Zwraca serię czasową per obszar (wartości 0–100 z każdego podejścia).
// UWAGA: łączy podejścia różnych narzędzi. Obszary są znormalizowane do 0–100,
// więc trend „w górę/w dół” jest czytelny, ale punkty z różnych narzędzi nie są
// idealnie porównywalne — dlatego każdy punkt niesie `narzedzie` (UI to sygnalizuje).
export function trendObszarow(profile, idPrac) {
  const seria = seriaTestow(profile, idPrac)
  if (seria.length < 3) return null // do 2 testów wystarcza widok delty
  const punkty = seria.map((s) => ({ data: s.data, narzedzie: s.narzedzie }))
  const obszary = ROZWOJ.obszary
    .map((o) => {
      const wartosci = seria.map((s) => {
        const v = (s.obszary || {})[o.id]
        return typeof v === 'number' ? v : null
      })
      const konkretne = wartosci.filter((v) => v !== null)
      const pierwszy = konkretne[0]
      const ostatni = konkretne[konkretne.length - 1]
      return {
        id: o.id,
        nazwa: o.nazwa,
        wartosci,
        // zmiana od pierwszego do ostatniego pomiaru (cały dotychczasowy postęp)
        zmianaOgolna:
          konkretne.length >= 2 && typeof pierwszy === 'number' && typeof ostatni === 'number'
            ? ostatni - pierwszy
            : null
      }
    })
    .filter((o) => o.wartosci.some((v) => v !== null))
  return { punkty, obszary }
}

// Przygotowanie przypisania wyniku do pracownika (wspólne dla samoprzypisania
// w zakładce Rozwój i przypisania przez Mentora w Zespole). Czysta funkcja:
// waliduje, wykrywa duplikat i niezgodność imienia — zapis i ewentualny confirm
// zostają w komponencie.
export function przygotujPrzypisanie(surowy, pracownik, profile) {
  const blad = walidujWynikWp(surowy)
  if (blad) return { ok: false, blad }
  if (czyDuplikatProfilu(profile, pracownik.id_prac, surowy)) {
    return { ok: false, blad: 'Ten wynik jest już przypisany do tego pracownika.' }
  }
  const imieWyniku = (surowy.osoba?.imie || '').trim()
  const ostrzezenieImienia =
    imieWyniku && !imionaPasuja(imieWyniku, pracownik.imie) ? imieWyniku : null
  return { ok: true, imieWyniku, ostrzezenieImienia }
}

// Odczyt wyników czekających we wspólnym localStorage (zapisanych przez testy).
// Zwraca tylko poprawne rekordy, które nie są jeszcze przypisane pracownikowi.
export function czekajaceWyniki(profile, idPrac, storage) {
  let surowe
  try {
    surowe = JSON.parse((storage || localStorage).getItem(WP_KLUCZ_WYNIKOW) || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(surowe)) return []
  return surowe.filter(
    (w) => walidujWynikWp(w) === null && !czyDuplikatProfilu(profile, idPrac, w)
  )
}
