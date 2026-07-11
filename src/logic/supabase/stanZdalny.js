// Warstwa danych zdalnych (Supabase) — odpowiednik store.js dla trybu backendu.
// Czyta cały stan z tabel i składa obiekt `stan` w kształcie, którego używa aplikacja,
// oraz udostępnia akcje DOPISUJĄCE (logi) i zapis ustawień właściciela.
//
// UWAGA: to szkielet gotowy do podłączenia. Działa po utworzeniu projektu Supabase
// (schema.sql) i ustawieniu zmiennych środowiskowych. Przed produkcją: przejście
// testowe na żywej bazie (patrz docs/BACKEND_PLAN.md, sekcja „Co zostaje do zrobienia").
import { klient } from './klient.js'
import { domyslnyStan } from '../store.js'

// Odczyt całego stanu — jeden „snapshot" z bazy złożony w obiekt aplikacji.
export async function wczytajStanZdalnie() {
  const k = klient()
  if (!k) return null
  const [prac, wyniki, nauka, praktyka, przypisania, kolejka, zatw, ust] = await Promise.all([
    k.from('pracownicy').select('*'),
    k.from('wyniki').select('*'),
    k.from('nauka').select('*'),
    k.from('praktyka').select('*'),
    k.from('przypisania').select('*'),
    k.from('kolejka').select('*'),
    k.from('zatwierdzone').select('tom'),
    k.from('ustawienia').select('konfig, bank').eq('id', 1).maybeSingle()
  ])
  const bazowy = domyslnyStan()
  return {
    ...bazowy,
    pracownicy: prac.data ?? bazowy.pracownicy,
    wyniki: wyniki.data ?? [],
    nauka: nauka.data ?? [],
    praktyka: praktyka.data ?? [],
    przypisania: przypisania.data ?? [],
    kolejka: kolejka.data ?? [],
    zatwierdzone: (zatw.data ?? []).map((r) => r.tom),
    konfig: ust.data?.konfig ?? bazowy.konfig,
    bank: ust.data?.bank ?? null
  }
}

// --- akcje dopisujące (logi append-only) ---
export async function dopiszWynik(w) {
  const k = klient(); if (k) await k.from('wyniki').insert(w)
}
export async function dopiszNauke(n) {
  const k = klient(); if (k) await k.from('nauka').insert(n)
}
export async function dopiszPraktyke(p) {
  const k = klient(); if (k) await k.from('praktyka').insert(p)
}
export async function dopiszPrzypisanie(p) {
  const k = klient(); if (k) await k.from('przypisania').insert(p)
}
export async function dopiszDoKolejki(wpis) {
  const k = klient(); if (k) await k.from('kolejka').insert(wpis)
}
export async function usunZKolejki(id) {
  const k = klient(); if (k) await k.from('kolejka').delete().eq('id', id)
}

// --- akcje właściciela (stan bieżący, nie-log) ---
export async function ustawZatwierdzenie(tom, wlaczone) {
  const k = klient(); if (!k) return
  if (wlaczone) await k.from('zatwierdzone').upsert({ tom })
  else await k.from('zatwierdzone').delete().eq('tom', tom)
}
export async function zapiszUstawienia({ konfig, bank }) {
  const k = klient(); if (!k) return
  const patch = { id: 1, aktualizacja: new Date().toISOString() }
  if (konfig !== undefined) patch.konfig = konfig
  if (bank !== undefined) patch.bank = bank
  await k.from('ustawienia').upsert(patch)
}
export async function zapiszPracownikow(lista) {
  const k = klient(); if (k) await k.from('pracownicy').upsert(lista)
}

// Nasłuch realtime dla żywego widoku zespołu (opcjonalny).
export function naZmianeDanych(callback) {
  const k = klient()
  if (!k) return () => {}
  const kanal = k
    .channel('alterbake-dane')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wyniki' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'praktyka' }, callback)
    .subscribe()
  return () => k.removeChannel(kanal)
}
