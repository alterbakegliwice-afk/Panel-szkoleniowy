import PanelPraktyczny from './PanelPraktyczny.jsx'
import { TECHNIKA } from '../logic/technika.js'

// Panel Techniczny — park maszynowy na poziomie praktycznym.
// Silnik UI wspólny ze Sprzątaniem: PanelPraktyczny.jsx.
const ETYKIETY = {
  eyebrowLista: 'Park maszynowy — poziom praktyczny',
  postepEtykieta: 'opanowanie techniki',
  szukajTytul: '🩺 Co się dzieje? — szybka diagnoza objawu',
  szukajOpis:
    'Wpisz co widzisz/słyszysz (np. „blady spód", „pisk", „lód", „wycieka masłem"), a znajdziemy kartę diagnostyczną właściwej maszyny.',
  szukajPlaceholder: 'np. blady spód, agregat chodzi bez przerwy, pisk przy starcie…',
  szukajBrak:
    'Brak dopasowań. Spróbuj innego słowa (np. „skórka", „temperatura", „olej") albo otwórz diagnostykę maszyny poniżej.',
  otworzTekst: '— otwórz pełną diagnostykę →',
  eyebrowDiagnoza: 'Diagnostyka',
  wrocLista: '← Wróć do parku maszyn',
  drukBtn: '🖨 Wydrukuj kartę maszyny',
  naukaBtn: '📖 Jak działa',
  diagBtn: '🩺 Diagnostyka',
  konserwacjaTytul: 'Konserwacja — kto, co, kiedy',
  dokTytul: '📄 Dokumentacja producenta',
  dokOpis:
    'DTR i karty produktu — do sięgnięcia PRZED rozkręceniem czegokolwiek i przy każdym zgłoszeniu serwisowym (numer modelu + objaw z karty diagnostycznej = krótsza wizyta). Linki zewnętrzne: jeśli któryś wygaśnie, szukaj po tytule u producenta.',
  quizLockInfo: '🔒 Quiz odblokuje się po przerobieniu „Jak działa". Diagnostyka jest zawsze dostępna.',
  ctaNauczony: 'Materiał „Jak działa" masz przerobiony — sprawdź, czy umiesz czytać tę maszynę.',
  ctaBrak: 'Zanim quiz: przerób materiał „Jak działa" — diagnostyka mówi CO robić, materiał tłumaczy DLACZEGO.'
}

export default function Technika(props) {
  return (
    <PanelPraktyczny
      tytul={TECHNIKA.tytul}
      opis={TECHNIKA.opis}
      pozycje={TECHNIKA.maszyny}
      etykiety={ETYKIETY}
      {...props}
    />
  )
}
