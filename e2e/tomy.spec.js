import { test, expect } from '@playwright/test'

// Nowe tomy złotych standardów (Planowanie piekarni/cukierni, Organizacja
// cukierni) wgrane do banku: widoczne w „Mój poziom", nauka odblokowuje quiz.

test('Nowy tom „Planowanie piekarni": materiał → quiz z pytaniami z banku', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Mój poziom' }).click()

  const tom = page.locator('.tom', { hasText: 'Planowanie piekarni' })
  await expect(tom).toBeVisible()
  await expect(tom.getByRole('button', { name: /Sprawdź|quiz/i })).toBeDisabled()

  await tom.getByRole('button', { name: /Ucz się/ }).click()
  await expect(page.getByText(/wstecz od godziny porannego odpieku|zegar fermentacji/i).first()).toBeVisible()
  await page.getByRole('button', { name: /Przerobiłem materiał/ }).click()

  // quiz startuje z pytaniami nowego tomu
  await expect(page.getByText(/planowanie doby produkcyjnej|Levain płynny/i).first()).toBeVisible()
})

test('Tomy cukiernicze widoczne w „Mój poziom"', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Mój poziom' }).click()
  await expect(page.locator('.tom', { hasText: 'Planowanie cukierni' })).toBeVisible()
  await expect(page.locator('.tom', { hasText: 'Organizacja cukierni' })).toBeVisible()
  await expect(page.locator('.tom', { hasText: 'Kremy i emulsje' })).toBeVisible()
  await expect(page.locator('.tom', { hasText: 'Ciasta i masy cukiernicze' })).toBeVisible()
  await expect(page.locator('.tom', { hasText: 'Bezy, cukier i czekolada' })).toBeVisible()
  await expect(page.locator('.tom', { hasText: 'Żelifikacja' })).toBeVisible()
})

test('Tomy piekarza (fala 2) widoczne i quiz „Fermentacja i formowanie" działa', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Mój poziom' }).click()

  for (const nazwa of ['Mąka i surowce', 'Mieszanie i temperatura', 'Fermentacja i formowanie',
    'Fermentacja odroczona', 'Parametry wypieku', 'Studzenie i świeżość', 'Laminowanie']) {
    await expect(page.locator('.tom', { hasText: nazwa })).toBeVisible()
  }

  const tom = page.locator('.tom', { hasText: 'Fermentacja i formowanie' })
  await tom.getByRole('button', { name: /Ucz się/ }).click()
  await expect(page.getByText(/≥80%|dwuczynnikowa/i).first()).toBeVisible()
  await page.getByRole('button', { name: /Przerobiłem materiał/ }).click()
  await expect(page.getByText(/fermentacji wstępnej|pytanie/i).first()).toBeVisible()
})
