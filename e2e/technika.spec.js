import { test, expect } from '@playwright/test'

// Panel Techniczny: park maszynowy na poziomie praktycznym.
// Ścieżka pracownika: diagnostyka objawu (zawsze dostępna) → nauka → quiz.

test('Technika: wyszukiwarka objawów prowadzi do diagnozy właściwej maszyny', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Technika' }).click()

  await expect(page.getByRole('heading', { name: /Panel Techniczny/ })).toBeVisible()

  // objaw z hali, pisany bez polskich znaków — ma znaleźć kartę IBIS-a
  await page.getByPlaceholder(/blady spód/).fill('blady spod')
  await expect(page.getByRole('heading', { name: /Blady spód przy dobrze zarumienionej górze/ })).toBeVisible()
  await expect(page.getByText('ryzyko: jakość produktu').first()).toBeVisible()

  // przejście do pełnej diagnostyki maszyny
  await page.getByRole('button', { name: /Piec trzonowy IBIS.*pełną diagnostykę/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Piec trzonowy IBIS/ })).toBeVisible()
  await expect(page.getByText('Diagnostyka · Piece')).toBeVisible()
  await expect(page.getByText('Konserwacja — kto, co, kiedy')).toBeVisible()
  // granica serwisu jest jawna
  await expect(page.getByText(/Kiedy serwis:/).first()).toBeVisible()
})

test('Technika: quiz odblokowuje się dopiero po nauce „Jak działa"', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Technika' }).click()

  const kartaIbis = page.locator('.tom', { hasText: 'Piec trzonowy IBIS' })
  await expect(kartaIbis.getByRole('button', { name: 'Sprawdź wiedzę' })).toBeDisabled()

  // nauka: materiał o modelu cieplnym trzonu
  await kartaIbis.getByRole('button', { name: /Jak działa/ }).click()
  await expect(page.getByText(/akumulator ciepła/i).first()).toBeVisible()
  await page.getByRole('button', { name: /Przerobiłem materiał/ }).click()

  // po nauce ląduje w quizie tej maszyny
  await expect(page.getByText(/Wyświetlacz IBIS pokazuje 250°C|pytanie/i).first()).toBeVisible()
})
