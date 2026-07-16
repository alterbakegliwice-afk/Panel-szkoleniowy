// Wspólny rdzeń „paneli praktycznych" (Technika, Sprzątanie): pozycja =
// maszyna/strefa z nauką, kartami diagnostycznymi (objaw → odczyt → przyczyny
// → działania → granica serwisu), rytmem konserwacji/sprzątania i quizem.
// Moduły domenowe (technika.js, sprzatanie.js) dostarczają dane i nazwy.
import { postepModuluZOst } from './nauka.js'
import { ostatnieWyniki } from './progress.js'

// Normalizacja do wyszukiwania: bez wielkości liter i polskich znaków,
// żeby „blady spod" znalazło „Blady spód".
const MAPA_ZNAKOW = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }
export function normalizuj(tekst) {
  return String(tekst || '')
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (z) => MAPA_ZNAKOW[z])
}

// Wyszukiwarka objawów/problemów: „co się dzieje?" → karty diagnostyczne
// z pozycją (maszyną/strefą). Dopasowanie per słowo (wszystkie muszą
// wystąpić), bo polska fleksja psuje dopasowanie całej frazy
// („kamień kotłowy" ma znaleźć „kamieniem kotłowym").
export function szukajObjawow(fraza, pozycje) {
  const slowa = normalizuj(fraza).trim().split(/\s+/).filter((s) => s.length >= 3)
  if (!slowa.length) return []
  const wynik = []
  for (const m of pozycje) {
    for (const d of m.diagnostyka || []) {
      const stog = normalizuj(
        [d.objaw, d.odczyt, ...(d.przyczyny || [])].join(' ')
      )
      if (slowa.every((s) => stog.includes(s))) {
        wynik.push({ maszyna: m, diagnoza: d })
      }
    }
  }
  return wynik
}

// Postęp ucznia per pozycja + zbiorczy (te same reguły co tomy: próg 0,8;
// pytania CCP osobno, próg 100% — patrz postepModuluZOst). Mapę ostatnich
// wyników liczymy RAZ dla wszystkich pozycji (sortowanie całego logu).
export function postepPozycji(pozycje, wyniki, idUcznia, prog = 0.8) {
  const ost = ostatnieWyniki(wyniki)
  const lista = pozycje.map((m) => ({
    maszyna: m,
    postep: postepModuluZOst(m, ost, idUcznia, prog)
  }))
  const procent = lista.length
    ? lista.reduce((s, x) => s + x.postep.procent, 0) / lista.length
    : 0
  return { maszyny: lista, procent }
}
