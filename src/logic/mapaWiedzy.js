// Logika PULPITU „Mój poziom" — dwie rzeczy, których UI nie powinien liczyć sam:
//
// 1. glownaAkcja — JEDNA rekomendowana akcja „co teraz?". Zasada ADHD: pulpit
//    zaczyna się od jednego punktu skupienia z przyciskiem, nie od ściany kart.
//    Priorytet twardy: CCP-blokada → zaległe powtórki CCP → powtórki → następny
//    tom do podciągnięcia → gotowe (utrwalaj).
//
// 2. budujMapeWiedzy — dane „rozproszonej mapy myśli": wszystkie obszary nauki
//    (tomy banku, Technika, Sprzątanie, Rozwój z Work Profile) jako powiązane
//    węzły wokół ucznia, z postępem i stanem. Jedno spojrzenie = cały krajobraz
//    wiedzy i gdzie jest praca do zrobienia; klik w węzeł = przejście do pracy.
import { postepTechniki } from './technika.js'
import { postepSprzatania } from './sprzatanie.js'
import { postepRozwoju } from './rozwoj.js'

// stan węzła/akcji: 'blok' (czerwień — tylko realne blokady bezpieczeństwa),
// 'toku' (bursztyn — praca w toku), 'ok' (zieleń — opanowane), 'info' (szary).
export function glownaAkcja(prof, powtorki) {
  const krok = prof.nastepnyKrok
  if (krok.typ === 'CCP') {
    return {
      typ: 'CCP',
      stan: 'blok',
      naglowek: 'Zalicz punkty krytyczne (CCP)',
      opis: krok.tekst,
      przycisk: `Zalicz CCP — „${krok.tom}” →`,
      akcja: { typ: 'tom', tom: krok.tom }
    }
  }
  if (powtorki && powtorki.ccp > 0) {
    return {
      typ: 'POWTORKA_CCP',
      stan: 'blok',
      naglowek: 'Odśwież wiedzę CCP — bezpieczeństwo żywności',
      opis:
        `${powtorki.ccp} ${powtorki.ccp === 1 ? 'pytanie CCP zaliczone' : 'pytania CCP zaliczone'} dawno temu — ` +
        'wiedza o bezpieczeństwie zanika, jeśli jej nie odświeżasz. Krótka powtórka utrwala ją na długo.',
      przycisk: `Powtórz teraz (${powtorki.liczba}) →`,
      akcja: { typ: 'powtorka' }
    }
  }
  if (powtorki && powtorki.liczba > 0) {
    return {
      typ: 'POWTORKA',
      stan: 'toku',
      naglowek: 'Krótka powtórka — utrwal, co umiesz',
      opis: `${powtorki.liczba} ${powtorki.liczba === 1 ? 'pytanie czeka' : 'pytań czeka'} na odświeżenie. Kilka minut teraz = wiedza zostaje na miesiące.`,
      przycisk: `Powtórz teraz (${powtorki.liczba}) →`,
      akcja: { typ: 'powtorka' }
    }
  }
  if (krok.typ === 'TOM') {
    return {
      typ: 'TOM',
      stan: 'toku',
      naglowek: `Kontynuuj: „${krok.tom}”`,
      opis: krok.tekst,
      przycisk: 'Pracuj nad tym tomem →',
      akcja: { typ: 'tom', tom: krok.tom }
    }
  }
  return {
    typ: 'GOTOWE',
    stan: 'ok',
    naglowek: 'Cel osiągnięty — utrzymuj formę',
    opis: krok.tekst,
    przycisk: null,
    akcja: null
  }
}

// Skrót etykiety węzła (długie nazwy obszarów Rozwoju rozbijają layout mapy).
export function skrocEtykiete(tekst, maks = 16) {
  const t = String(tekst || '')
  return t.length <= maks ? t : t.slice(0, maks - 1).trimEnd() + '…'
}

// Węzły mapy: { id, etykieta, pelna, procent (0..1|null), stan, grupa, akcja }
// grupy: 'tomy' | 'praktyka' | 'rozwoj' — komponent rozkłada je w sektorach.
export function budujMapeWiedzy({ prof, wyniki, idPrac, profile, prog = 0.8 }) {
  const wezly = []

  for (const t of prof.tomy) {
    wezly.push({
      id: 'tom:' + t.tom,
      etykieta: skrocEtykiete(t.tom),
      pelna: t.tom,
      procent: t.procent,
      stan: t.ccp.status === 'BRAK' ? 'blok' : t.status === 'OPANOWANY' ? 'ok' : 'toku',
      grupa: 'tomy',
      akcja: { typ: 'tom', tom: t.tom }
    })
  }

  const tech = postepTechniki(wyniki, idPrac, prog)
  wezly.push({
    id: 'technika',
    etykieta: 'Technika',
    pelna: 'Technika — park maszynowy',
    procent: tech.procent,
    stan: tech.procent >= prog ? 'ok' : 'toku',
    grupa: 'praktyka',
    akcja: { typ: 'nav', cel: 'technika' }
  })

  const sprz = postepSprzatania(wyniki, idPrac, prog)
  wezly.push({
    id: 'sprzatanie',
    etykieta: 'Sprzątanie',
    pelna: 'Sprzątanie — higiena stref',
    procent: sprz.procent,
    stan: sprz.procent >= prog ? 'ok' : 'toku',
    grupa: 'praktyka',
    akcja: { typ: 'nav', cel: 'sprzatanie' }
  })

  // Rozwój (Work Profile): bez wyniku testu — szary węzeł-zaproszenie;
  // z wynikiem — węzeł zbiorczy + 3 priorytety jako powiązane tematy.
  const rozwoj = postepRozwoju(profile || [], idPrac)
  if (!rozwoj) {
    wezly.push({
      id: 'rozwoj',
      etykieta: 'Rozwój',
      pelna: 'Rozwój — wykonaj test Work Profile',
      procent: null,
      stan: 'info',
      grupa: 'rozwoj',
      akcja: { typ: 'nav', cel: 'rozwoj' }
    })
  } else {
    const zWynikiem = rozwoj.obszary.filter((o) => typeof o.aktualny === 'number')
    const sredni = zWynikiem.length
      ? zWynikiem.reduce((s, o) => s + o.aktualny, 0) / zWynikiem.length / 100
      : null
    wezly.push({
      id: 'rozwoj',
      etykieta: 'Rozwój',
      pelna: 'Rozwój kompetencji (Work Profile)',
      procent: sredni,
      stan: sredni !== null && sredni >= prog ? 'ok' : 'toku',
      grupa: 'rozwoj',
      akcja: { typ: 'nav', cel: 'rozwoj' }
    })
    for (const o of rozwoj.obszary.filter((x) => rozwoj.priorytety.includes(x.id))) {
      wezly.push({
        id: 'rozwoj:' + o.id,
        etykieta: skrocEtykiete(o.nazwa),
        pelna: o.nazwa + ' — priorytet rozwojowy',
        procent: typeof o.aktualny === 'number' ? o.aktualny / 100 : null,
        stan: 'toku',
        grupa: 'rozwoj',
        akcja: { typ: 'nav', cel: 'rozwoj' }
      })
    }
  }

  return {
    centrum: { etykieta: 'Ty', procent: prof.poziomOgolny },
    wezly
  }
}
