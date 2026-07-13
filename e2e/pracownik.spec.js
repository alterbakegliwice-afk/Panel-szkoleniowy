import { test, expect } from '@playwright/test'

// Aplikacja pracownika: zadania i plan z Planera Produkcji (wspólny localStorage)
// + zgłoszenia potrzeb/uwag. Kontrakt: docs/SPEC-APLIKACJA-PRACOWNIKA.md.

const dzisLokalnie = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// Minimalny stan Planera: Julia powiązana z przykładowym profilem P-01 (Weronika),
// jedno zadanie na dziś i jeden blok planu.
const stanPlanera = (dzis) => ({
  wersja: 2,
  aktywnyModul: 'cukiernia',
  globalne: { apiKey: '', trybOnline: false },
  moduly: {
    cukiernia: {
      ustawienia: {
        zespol: [
          { id: 'oliwia', nazwa: 'Oliwia', rola: 'szef', od: '07:00', do: '15:00', id_prac: '' },
          { id: 'julia', nazwa: 'Julia', rola: 'pomoc', od: '07:00', do: '14:00', id_prac: 'P-01' }
        ],
        dzienOd: '06:00',
        dzienDo: '16:00',
        udzialStaly: 0.3
      },
      kalibracja: {},
      plan: {
        [dzis]: {
          bloki: [
            {
              id: 'b1', nr: 'C-01', partie: 2, osoba: 'julia', start: 420,
              segmenty: [{ od: 0, do: 90, typ: 'aktywny', nazwa: 'praca' }]
            }
          ]
        }
      },
      zadania: [
        { id: 'z1', tytul: 'Naważki kremów', osoba: 'julia', data: dzis, czas_min: 30, status: 'otwarte', typ: 'wlasne' }
      ],
      inspiracje: [],
      czat: [],
      nauka: { fakty: [], notatki: [] }
    },
    piekarnia: {
      ustawienia: { zespol: [], dzienOd: '06:00', dzienDo: '16:00', udzialStaly: 0.3 },
      kalibracja: {}, plan: {}, zadania: [], inspiracje: [], czat: [],
      nauka: { fakty: [], notatki: [] }
    }
  }
})

async function zasiejPlaner(page) {
  const dzis = dzisLokalnie()
  await page.goto('/')
  await page.evaluate((stan) => {
    localStorage.setItem('alterbake_planer_v2', JSON.stringify(stan))
  }, stanPlanera(dzis))
  await page.reload()
}

test('Mój dzień: pracownik widzi zadania i plan z Planera, odhacza własne zadanie', async ({ page }) => {
  await zasiejPlaner(page)

  // Weronika (P-01) — pierwszy kafel przykładowych danych
  await page.locator('.profil-kafel').first().click()

  // domyślny widok po zalogowaniu = Mój dzień
  await expect(page.getByRole('heading', { name: 'Moje zadania' })).toBeVisible()
  await expect(page.getByText('Naważki kremów')).toBeVisible()

  // plan produkcji: blok C-01 prowadzony przez Julię (powiązaną z P-01)
  await expect(page.getByRole('heading', { name: 'Plan produkcji' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'C-01' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Julia (Ty)' })).toBeVisible()

  // odhaczenie własnego zadania zapisuje status do klucza Planera
  await page.getByRole('checkbox').first().check()
  const status = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('alterbake_planer_v2')).moduly.cukiernia.zadania[0].status
  )
  expect(status).toBe('zrobione')
})

test('Zgłoszenia: pracownik wysyła, Właściciel widzi i przyjmuje z odpowiedzią', async ({ page }) => {
  await page.goto('/')

  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Zgłoszenia' }).click()
  await page.getByPlaceholder(/Kończy się pistacja/).fill('Brakuje rękawic rozmiar M')
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click()
  await expect(page.getByText('Brakuje rękawic rozmiar M')).toBeVisible()

  // rejestr lustra powstaje przy zapisie stanu — sprawdź kontrakt
  const rejestr = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('alterbake_zespol_v1'))
  )
  expect(rejestr.pracownicy.length).toBeGreaterThan(0)

  // Właściciel: skrzynka zgłoszeń, przyjęcie z odpowiedzią
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zgłoszenia/ }).click()
  await expect(page.getByText('Brakuje rękawic rozmiar M')).toBeVisible()
  await page.getByPlaceholder('Odpowiedź dla pracownika (opcjonalnie)').fill('Zamówione, będą w środę')
  await page.getByRole('button', { name: 'Przyjmij' }).click()
  // przyjęte zgłoszenie przechodzi do filtra „przyjęte"
  await page.getByRole('button', { name: /^przyjęte/ }).click()
  await expect(page.getByText('↳ Zamówione, będą w środę')).toBeVisible()

  // autor widzi status i odpowiedź
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Zgłoszenia' }).click()
  await expect(page.getByText('przyjęte')).toBeVisible()
  await expect(page.getByText('↳ Zamówione, będą w środę')).toBeVisible()
})
