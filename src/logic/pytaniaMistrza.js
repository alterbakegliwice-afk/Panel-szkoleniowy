// PYTANIA DO MISTRZA — warstwa TEORETYCZNA pogłębiania wiedzy.
// Pracownik zadaje pytanie przy dowolnym materiale (tom banku, Technika,
// Sprzątanie, moduł Przedsiębiorcy, Rozwój); Właściciel/Mentor odpowiada
// i opcjonalnie oznacza „do rozszerzenia materiału" — to tylko ZNACZNIK
// kandydata na nową kartę w danym tomie. Samo dopisanie karty do
// materialy_nauka.json to krok ręczny (lub przez pipeline NotebookLM,
// patrz tools/notebooklm/) — świadomie POZA zakresem tej warstwy
// („praktykę wdrożymy później").
//
// Dane żyją w stan.pytania (log append-only w tym samym localStorage co
// WYNIK/KOLEJKA/NAUKA) — to sprawa wewnętrzna Panelu, nie współdzielony
// kontrakt originu jak alterbake_zgloszenia_v1.

let licznikId = 0
export function noweZapytanie({ id_prac, imie, tom, tresc }, terazISO = new Date().toISOString()) {
  return {
    id: 'pyt-' + Date.now().toString(36) + '-' + (licznikId++).toString(36),
    id_prac,
    imie,
    tom: tom || '',
    tresc: tresc.trim(),
    data: terazISO,
    status: 'nowe',
    odpowiedz: '',
    dodacDoMaterialu: false
  }
}

// Zepsuty/ręcznie edytowany wpis nie może wywalić UI — filtr jak przy
// zgłoszeniach (integracja.js), ale bez wymogu typu (tom jest opcjonalny —
// „ogólne" pytanie ma tom: '').
export function filtrujPytania(lista) {
  if (!Array.isArray(lista)) return []
  return lista.filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      typeof p.id === 'string' &&
      typeof p.id_prac === 'string' &&
      typeof p.tresc === 'string' &&
      p.tresc.trim() !== '' &&
      typeof p.data === 'string' &&
      (p.status === 'nowe' || p.status === 'odpowiedziane')
  )
}
