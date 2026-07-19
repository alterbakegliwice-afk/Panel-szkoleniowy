import { test, expect } from '@playwright/test'

// Pytania do Mistrza — warstwa TEORETYCZNA pogłębiania wiedzy (bez praktyki):
// pracownik pyta przy materiale → Właściciel odpowiada i oznacza „do
// rozszerzenia materiału" → pracownik widzi odpowiedź i znacznik.

test('Pytanie zadane przy materiale trafia do skrzynki Właściciela z odpowiedzią i znacznikiem', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()

  // zadaj pytanie z ekranu nauki konkretnego tomu
  await page.getByRole('button', { name: 'Mój poziom' }).click()
  const tom = page.locator('.tom').first()
  await tom.getByRole('button', { name: /Ucz się/ }).click()
  await page.getByPlaceholder(/zakwas nie ma zapachu/).fill('Co jeśli zakwas w ogóle nie pachnie?')
  await page.getByRole('button', { name: 'Wyślij pytanie' }).click()
  await expect(page.getByText('Pytanie zapisane')).toBeVisible()

  // pracownik widzi własne pytanie w zakładce Pytania (status: nowe)
  await page.getByRole('button', { name: 'Pytania', exact: true }).click()
  await expect(page.getByText('Co jeśli zakwas w ogóle nie pachnie?')).toBeVisible()
  await expect(page.getByText('nowe')).toBeVisible()

  // Właściciel: skrzynka, odpowiedź + oznaczenie do rozszerzenia materiału
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /Pytania do Mistrza/ }).click()
  await expect(page.getByText('Co jeśli zakwas w ogóle nie pachnie?')).toBeVisible()
  await page.getByPlaceholder('Odpowiedź dla pracownika').fill('To normalne na starcie — dokarm częściej.')
  await page.getByRole('checkbox', { name: /do rozszerzenia materiału/ }).check()
  await page.getByRole('button', { name: 'Odpowiedz', exact: true }).click()

  // odpowiedziane pytanie znika z domyślnego filtra „nowe" — przełącz widok
  await expect(page.getByText('Co jeśli zakwas w ogóle nie pachnie?')).not.toBeVisible()
  await page.getByRole('button', { name: /^odpowiedziane/ }).click()
  await expect(page.getByText('Co jeśli zakwas w ogóle nie pachnie?')).toBeVisible()
  await expect(page.getByText('↳ To normalne na starcie — dokarm częściej.')).toBeVisible()

  // pracownik widzi odpowiedź i znacznik „wejdzie do materiału"
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Pytania', exact: true }).click()
  await expect(page.getByText('↳ To normalne na starcie — dokarm częściej.')).toBeVisible()
  await expect(page.getByText(/wejdzie do materiału/)).toBeVisible()
})
