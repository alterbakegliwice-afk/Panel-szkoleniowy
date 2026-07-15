import { test, expect } from '@playwright/test'

// Moduł Sprzątanie: strefy higieny na wspólnym silniku z Techniką
// (PanelPraktyczny). Ścieżka: diagnoza problemu → karta strefy → nauka → quiz.

test('Sprzątanie: wyszukiwarka problemów prowadzi do karty właściwej strefy', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Sprzątanie' }).click()

  await expect(page.getByRole('heading', { name: /Sprzątanie — skutecznie i wydajnie/ })).toBeVisible()

  // problem z hali, bez polskich znaków — pleśń to strefy wilgotne
  await page.getByPlaceholder(/pleśń w rogach/).fill('plesn')
  await expect(page.getByRole('heading', { name: /Pleśń w rogach garowni/ })).toBeVisible()

  await page.getByRole('button', { name: /Strefy wilgotne.*kartę strefy/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Strefy wilgotne/ })).toBeVisible()
  await expect(page.getByText('Rytm sprzątania — kto, co, kiedy')).toBeVisible()
})

test('Sprzątanie: quiz odblokowuje się po nauce „Jak sprzątać"', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Sprzątanie' }).click()

  const karta = page.locator('.tom', { hasText: 'Metoda i chemia mycia' })
  await expect(karta.getByRole('button', { name: 'Sprawdź wiedzę' })).toBeDisabled()

  await karta.getByRole('button', { name: /Jak sprzątać/ }).click()
  await expect(page.getByText(/koło Sinnera/i).first()).toBeVisible()
  await page.getByRole('button', { name: /Przerobiłem materiał/ }).click()

  // po nauce quiz strefy (pytanie o blachy po croissantach)
  await expect(page.getByText(/Blachy po croissantach|pytanie/i).first()).toBeVisible()
})

test('Sprzątanie: Właściciel widzi postęp higieny zespołu w widoku Zespół', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await expect(page.getByText('Sprzątanie — higiena skuteczna i wydajna')).toBeVisible()
  await expect(page.locator('th[title*="Metoda i chemia"]')).toBeVisible()
})
