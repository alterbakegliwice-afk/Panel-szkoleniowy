// Klient Supabase — aktywny TYLKO gdy ustawione zmienne środowiskowe.
// Bez nich aplikacja działa jak dziś (localStorage). To „przełącznik" backendu:
// build na GitHub Pages nie ma tych zmiennych → tryb lokalny pozostaje domyślny.
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KLUCZ = import.meta.env.VITE_SUPABASE_ANON_KEY

// Czy backend jest skonfigurowany. Anon key jest bezpieczny we froncie —
// dostępu pilnuje RLS w bazie, nie tajność klucza.
export function backendWlaczony() {
  return Boolean(URL && KLUCZ)
}

let _klient = null
export function klient() {
  if (!backendWlaczony()) return null
  if (!_klient) {
    _klient = createClient(URL, KLUCZ, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  }
  return _klient
}
