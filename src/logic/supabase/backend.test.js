import { describe, it, expect } from 'vitest'
import { backendWlaczony, klient } from './klient.js'
import { wczytajStanZdalnie, dopiszWynik } from './stanZdalny.js'

// Bez zmiennych VITE_SUPABASE_* backend jest wyłączony — aplikacja zostaje w trybie
// lokalnym (localStorage). Ten test pilnuje, że szkielet nie „włącza się" przypadkiem
// i że jego funkcje są bezpiecznymi no-opami, gdy backendu nie skonfigurowano.
describe('backend Supabase — przełącznik', () => {
  it('domyślnie wyłączony (brak zmiennych środowiskowych)', () => {
    expect(backendWlaczony()).toBe(false)
    expect(klient()).toBe(null)
  })

  it('funkcje zdalne są bezpieczne przy wyłączonym backendzie', async () => {
    expect(await wczytajStanZdalnie()).toBe(null)
    await expect(dopiszWynik({ id_prac: 'P-01' })).resolves.toBeUndefined() // no-op, nie rzuca
  })
})
