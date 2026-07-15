import PanelPraktyczny from './PanelPraktyczny.jsx'
import { SPRZATANIE } from '../logic/sprzatanie.js'

// Sprzątanie — higiena produkcji skutecznie i wydajnie (koło Sinnera,
// chemia do brudu, clean-as-you-go). Silnik UI wspólny z Techniką.
const ETYKIETY = {
  eyebrowLista: 'Higiena produkcji — skutecznie i wydajnie',
  postepEtykieta: 'opanowanie higieny',
  szukajTytul: '🧽 Co się dzieje? — szybka diagnoza problemu',
  szukajOpis:
    'Wpisz co widzisz/czujesz (np. „pleśń", „biały nalot", „tłusty film", „zapach z odpływu"), a znajdziemy kartę problemu właściwej strefy.',
  szukajPlaceholder: 'np. pleśń w rogach, biały nalot, śliska podłoga, zapach z kratki…',
  szukajBrak:
    'Brak dopasowań. Spróbuj innego słowa (np. „nalot", „zapach", „pleśń") albo otwórz kartę strefy poniżej.',
  otworzTekst: '— otwórz kartę strefy →',
  eyebrowDiagnoza: 'Problemy i naprawa',
  wrocLista: '← Wróć do stref sprzątania',
  drukBtn: '🖨 Wydrukuj kartę strefy',
  naukaBtn: '📖 Jak sprzątać',
  diagBtn: '🧯 Problemy',
  konserwacjaTytul: 'Rytm sprzątania — kto, co, kiedy',
  dokTytul: '📄 Plany higieny i karty chemii',
  dokOpis: 'Dokumenty planu higieny i karty charakterystyki środków — sięgaj przy doborze chemii i po każdym incydencie.',
  quizLockInfo: '🔒 Quiz odblokuje się po przerobieniu „Jak sprzątać". Karty problemów są zawsze dostępne.',
  ctaNauczony: 'Materiał „Jak sprzątać" masz przerobiony — sprawdź się.',
  ctaBrak: 'Zanim quiz: przerób „Jak sprzątać" — karty problemów mówią CO robić, materiał tłumaczy DLACZEGO.'
}

export default function Sprzatanie(props) {
  return (
    <PanelPraktyczny
      tytul={SPRZATANIE.tytul}
      opis={SPRZATANIE.opis}
      pozycje={SPRZATANIE.strefy}
      etykiety={ETYKIETY}
      {...props}
    />
  )
}
