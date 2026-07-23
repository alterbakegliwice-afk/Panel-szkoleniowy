import { test, expect } from '@playwright/test'

// Pytania do Mistrza — pogłębianie wiedzy:
// pracownik pyta przy materiale → Właściciel odpowiada i oznacza „do
// rozszerzenia materiału" → pracownik widzi odpowiedź i znacznik.
// Drugi test: Właściciel zamienia oflagowane pytanie w kartę wiedzy (praktyka),
// a nowa karta pojawia się w materiale u pracownika.

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
  await page.getByRole('button', { name: /^Pytania/ }).click()
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

test('Właściciel zamienia oflagowane pytanie w kartę wiedzy — pojawia się w materiale u pracownika', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()

  // pracownik pyta z ekranu nauki pierwszego tomu i zapamiętujemy tytuł tomu
  await page.getByRole('button', { name: 'Mój poziom' }).click()
  const tom = page.locator('.tom').first()
  const nazwaTomu = (await tom.locator('h3, h2').first().innerText()).trim()
  await tom.getByRole('button', { name: /Ucz się/ }).click()
  await page.getByPlaceholder(/zakwas nie ma zapachu/).fill('Jak poznać, że zakwas jest gotowy do pieczenia?')
  await page.getByRole('button', { name: 'Wyślij pytanie' }).click()
  await expect(page.getByText('Pytanie zapisane')).toBeVisible()

  // Właściciel: odpowiada + flaguje, potem tworzy kartę
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Pytania/ }).click()
  await page.getByPlaceholder('Odpowiedź dla pracownika').fill('Podwaja objętość w 4–8 h i pływa w wodzie (test flotacji).')
  await page.getByRole('checkbox', { name: /do rozszerzenia materiału/ }).check()
  await page.getByRole('button', { name: 'Odpowiedz', exact: true }).click()

  await page.getByRole('button', { name: /^odpowiedziane/ }).click()
  await page.getByRole('button', { name: /Utwórz kartę wiedzy/ }).click()

  // formularz karty: punkty prefillowane z odpowiedzi, dopisujemy tytuł, publikujemy
  await page.getByPlaceholder(/Zakwas bez zapachu/).fill('Test gotowości zakwasu')
  await page.getByRole('button', { name: 'Opublikuj kartę' }).click()
  await expect(page.getByText('karta wiedzy utworzona z tego pytania')).toBeVisible()

  // pracownik: nowa karta widoczna w materiale tego tomu, z plakietką rozszerzenia
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Mój poziom' }).click()
  await page.locator('.tom', { hasText: nazwaTomu }).first().getByRole('button', { name: /Ucz się/ }).click()
  await expect(page.getByRole('heading', { name: /Test gotowości zakwasu/ })).toBeVisible()
  await expect(page.getByText('Podwaja objętość w 4–8 h i pływa w wodzie (test flotacji).')).toBeVisible()
  await expect(page.getByText(/rozszerzenie · z pytania zespołu/)).toBeVisible()
})
