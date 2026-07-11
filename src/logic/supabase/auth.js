// Logowanie — magic link (bez haseł, najprościej dla zespołu piekarni).
// Pracownik podaje e-mail, dostaje link, klika, jest zalogowany. Profil (rola,
// id_prac, is_owner) trzymamy w tabeli `profile` — mapuje konto na pracownika.
import { klient, backendWlaczony } from './klient.js'

export { backendWlaczony }

export async function zalogujLinkiem(email) {
  const k = klient()
  if (!k) return { error: 'Backend wyłączony' }
  return k.auth.signInWithOtp({ email: (email || '').trim() })
}

export async function wyloguj() {
  const k = klient()
  if (k) await k.auth.signOut()
}

export async function aktualnyUzytkownik() {
  const k = klient()
  if (!k) return null
  const { data } = await k.auth.getUser()
  return data?.user || null
}

// Profil zalogowanego (rola, id_prac, uprawnienia) — sterują widokami tak jak
// dziś `sesja`. Zwraca null, gdy niezalogowany lub brak profilu.
export async function mojProfil() {
  const k = klient()
  if (!k) return null
  const u = await aktualnyUzytkownik()
  if (!u) return null
  const { data } = await k.from('profile').select('*').eq('user_id', u.id).maybeSingle()
  return data || null
}

// Nasłuch zmian sesji (zalogowanie/wylogowanie) — do odświeżenia UI.
export function naZmianeSesji(callback) {
  const k = klient()
  if (!k) return () => {}
  const { data } = k.auth.onAuthStateChange((_zdarzenie, sesja) => callback(sesja))
  return () => data?.subscription?.unsubscribe?.()
}
