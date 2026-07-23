import { test, expect } from '@playwright/test'

// Pulpit „Mój poziom" po przebudowie ADHD: hero „Co teraz?" z jedną akcją,
// chipy statusu, mapa wiedzy (mind map) z nawigacją, tomy wg pilności,
// alert-kropka na zakładce widoczna z innych widoków.

async function wejdzNaPoziom(page) {
  await page.locator('.profil-kafel').first().click() // P-01
  await page.getByRole('button', { name: 'Mój poziom' }).click()
}

test('hero „Co teraz?" pokazuje blokadę CCP i prowadzi jednym klikiem do pracy', async ({ page }) => {
  await page.goto('/') // świeży stan: CCP nietknięte → blokada
  await wejdzNaPoziom(page)

  const hero = page.locator('.co-teraz')
  await expect(hero).toBeVisible()
  await expect(hero.getByText('Co teraz?')).toBeVisible()
  await expect(hero.getByRole('heading', { name: /Zalicz punkty krytyczne/ })).toBeVisible()

  // chipy statusu skanowalne w jednej linii
  await expect(page.locator('.chip-status', { hasText: 'CCP — blokada' })).toBeVisible()
  await expect(page.locator('.chip-status', { hasText: 'poziom' })).toBeVisible()

  // jeden klik = przejście do pracy (materiał nieprzerobiony → nauka tomu z CCP)
  await hero.getByRole('button', { name: /Zalicz CCP/ }).click()
  await expect(page.getByText('Materiał do nauki')).toBeVisible()
})

test('mapa wiedzy: wszystkie obszary jako węzły, klik nawiguje do modułu', async ({ page }) => {
  await page.goto('/')
  await wejdzNaPoziom(page)

  const mapa = page.locator('.mapa-wiedzy')
  await expect(mapa).toBeVisible()
  // tomy banku + moduły praktyczne + rozwój — celujemy w widoczne etykiety
  // węzłów (<title> SVG jest ukryty i myli getByText)
  for (const nazwa of ['II Zakwas', 'Technika', 'Sprzątanie', 'Rozwój']) {
    await expect(mapa.locator('.mapa-etykieta', { hasText: nazwa }).first()).toBeVisible()
  }

  // klik w węzeł Technika = przejście do panelu technicznego
  await mapa.locator('.mapa-wezel', { hasText: 'Technika' }).click()
  await expect(page.getByRole('heading', { name: /Panel Techniczny/ })).toBeVisible()
})

test('tomy posortowane wg pilności: tom z blokadą CCP pierwszy i oznaczony', async ({ page }) => {
  await page.goto('/')
  await wejdzNaPoziom(page)

  const pierwszy = page.locator('.tomy-siatka .tom').first()
  await expect(pierwszy).toHaveClass(/tom-pilny/)
  await expect(pierwszy.getByText('IV Wypiek')).toBeVisible() // jedyny tom seeda z CCP
})

test('alert-kropka na „Mój poziom" widoczna z landing page (Mój dzień)', async ({ page }) => {
  await page.goto('/') // CCP nietknięte → alert
  await page.locator('.profil-kafel').first().click()
  // jesteśmy na „Mój dzień" — kropka musi być widoczna bez wchodzenia w zakładkę
  await expect(page.getByRole('button', { name: /Mój poziom/ }).locator('.alert-kropka')).toBeVisible()
})

test('landing „Mój dzień": pasek statusu pokazuje CCP i prowadzi do pulpitu', async ({ page }) => {
  await page.goto('/') // świeży stan → blokada CCP
  await page.locator('.profil-kafel').first().click() // ląduje na „Mój dzień"

  const pasek = page.locator('.skrot-statusu')
  await expect(pasek).toBeVisible()
  await expect(pasek).toHaveClass(/skrot-pilny/)
  await expect(pasek.locator('.chip-status', { hasText: 'CCP — blokada' })).toBeVisible()

  // jeden klik z landing → pulpit z hero „Co teraz?"
  await pasek.getByRole('button', { name: /Zalicz punkty krytyczne/ }).click()
  await expect(page.locator('.co-teraz')).toBeVisible()
})

test('Zespół: Właściciel widzi mapę wiedzy pracownika', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zespół$/ }).click()

  await expect(page.getByRole('heading', { name: /Mapy wiedzy zespołu/ })).toBeVisible()
  await page.getByText(/Weronika — mapa wiedzy/).click() // rozwiń details
  await expect(page.locator('.mapa-wiedzy').first()).toBeVisible()
  // mapa statyczna — węzły bez semantyki przycisku
  await expect(page.locator('.mapa-wezel-statyczny').first()).toBeVisible()
})

test.describe('mobile: mapa wiedzy jako lista', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('SVG schowany, lista widoczna, dotknięcie wiersza nawiguje', async ({ page }) => {
    await page.goto('/')
    await wejdzNaPoziom(page)

    // wariant SVG ukryty na wąskim ekranie, lista go zastępuje (te same węzły)
    await expect(page.locator('.mapa-karta.tylko-desktop')).toBeHidden()
    const lista = page.locator('.mapa-lista-karta')
    await expect(lista).toBeVisible()
    await expect(lista.locator('.mapa-lista-wiersz').first()).toBeVisible()

    // dotknięcie wiersza = ta sama akcja co klik w węzeł SVG
    await lista.locator('.mapa-lista-wiersz', { hasText: 'Technika — park maszynowy' }).click()
    await expect(page.getByRole('heading', { name: /Panel Techniczny/ })).toBeVisible()
  })
})

test('nawigacja: moduły okazjonalne za separatorem', async ({ page }) => {
  await page.goto('/')
  await page.locator('.profil-kafel').first().click()
  await expect(page.locator('.zakladki-separator')).toBeVisible()
  // Technika/Sprzątanie/Zgłoszenia w grupie „dalej"
  await expect(page.locator('.zakladka-dalej', { hasText: 'Technika' })).toBeVisible()
  await expect(page.locator('.zakladka-dalej', { hasText: 'Zgłoszenia' })).toBeVisible()
})
