import { test, expect } from '@playwright/test'

// Rekordy w formacie zapisywanym przez repo alterbake-work-profile.
const wynikPP = (data, initiative, pressure) => ({
  typ: 'alterbake-wynik-work-profile',
  wersja: '2026-07-12',
  narzedzie: 'profil-pracy',
  data,
  osoba: { imie: 'Weronika', rola: 'Piekarz' },
  wyniki: {
    reliability: 80, pressure, collaboration: 70, learning: 65,
    initiative, integrity: 85, communication: 55, problemSolving: 60
  }
})

async function zasiej(page, wyniki) {
  await page.goto('/')
  await page.evaluate((w) => {
    localStorage.setItem('alterbake_work_profile_wyniki_v1', JSON.stringify(w))
  }, wyniki)
  await page.reload()
}

test('pętla rozwoju: przypisanie wyniku → priorytety → retest → delta', async ({ page }) => {
  await zasiej(page, [wynikPP('2026-05-01T10:00:00.000Z', 30, 45), wynikPP('2026-07-10T10:00:00.000Z', 55, 62)])

  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Rozwój' }).click()

  // dwa czekające wyniki (diagnoza + retest)
  await page.getByRole('button', { name: /Przypisz do mnie/ }).first().click()
  await page.getByRole('button', { name: /Przypisz do mnie/ }).first().click()

  // priorytety i delta po reteście
  await expect(page.getByText('PRIORYTET').first()).toBeVisible()
  await expect(page.getByText(/od poprzedniego testu/).first()).toBeVisible()
  await expect(page.getByText('Historia testów (2)')).toBeVisible()
})

test('checklist mikropraktyk odhacza się i liczy postęp', async ({ page }) => {
  await zasiej(page, [wynikPP('2026-05-01T10:00:00.000Z', 30, 45)])
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Rozwój' }).click()
  await page.getByRole('button', { name: /Przypisz do mnie/ }).first().click()

  // wejdź w naukę najsłabszego (priorytetowego) obszaru i przerób materiał
  await page.locator('.rozwoj-priorytet').getByRole('button', { name: /Ucz się/ }).first().click()
  await page.getByRole('button', { name: /wdrażam mikropraktyki/ }).click()

  // checklist widoczny na karcie obszaru — odhacz pierwszą praktykę
  const blok = page.locator('.praktyki-blok').first()
  await expect(blok).toBeVisible()
  await expect(blok.locator('summary')).toContainText('0/')
  await blok.locator('input[type=checkbox]').first().check()
  await expect(blok.locator('summary')).toContainText('1/')
})

test('Mentor/Właściciel: przypisanie wyniku pracownikowi i widok zespołu', async ({ page }) => {
  await zasiej(page, [wynikPP('2026-06-01T10:00:00.000Z', 40, 50)])
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zespół$/ }).click()

  // sekcje integracji widoczne
  await expect(page.getByRole('heading', { name: 'Przypisz wynik Work Profile pracownikowi' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Jak szkolić/ })).toBeVisible()

  // przypisz czekający wynik pierwszemu pracownikowi
  await page.getByRole('button', { name: /Przypisz do:/ }).first().click()
  await expect(page.getByText(/przypisany do:/)).toBeVisible()
})

test('zdalny testujący: wklejony wynik zakłada profil gościa i ląduje w ewaluacji', async ({ page }) => {
  await page.goto('/') // czysty stan — żadnych wyników w tej przeglądarce
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zespół$/ }).click()

  // dokładnie to, co test kopiuje do schowka przyciskiem „Wyślij wynik właścicielowi"
  const przyslany = JSON.stringify(wynikPP('2026-07-20T09:00:00.000Z', 35, 48))
    .replace('"imie":"Weronika"', '"imie":"Ola Testerka"')

  await page.getByText('Wklej wynik przysłany wiadomością').click()
  await page.locator('.wklejka-pole').fill(przyslany)
  await page.getByRole('button', { name: 'Sprawdź wklejony wynik' }).click()

  // panel rozpoznaje osobę spoza zespołu i proponuje założenie profilu gościa
  const podglad = page.locator('.wklejka-podglad')
  await expect(podglad).toContainText('Ola Testerka')
  await podglad.getByRole('button', { name: /Dodaj gościa .*Ola Testerka.* i przypisz/ }).click()
  await expect(page.getByText(/przypisany do: Ola Testerka/)).toBeVisible()

  // wynik trafia do sekcji ewaluacyjnej gości, nie do tabeli zespołu
  const sekcjaGosci = page.locator('.karta', { hasText: 'Osoby spoza Alterbake' })
  await expect(sekcjaGosci.getByText('Ola Testerka')).toBeVisible()
  await expect(sekcjaGosci).toContainText('Profil Pracy')
})

test('wklejka odrzuca śmieci i wynik nie z Work Profile', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zespół$/ }).click()
  await page.getByText('Wklej wynik przysłany wiadomością').click()

  await page.locator('.wklejka-pole').fill('to nie jest json')
  await page.getByRole('button', { name: 'Sprawdź wklejony wynik' }).click()
  await expect(page.getByText(/nie jest poprawny JSON/)).toBeVisible()

  await page.locator('.wklejka-pole').fill('{"typ":"cos-innego"}')
  await page.getByRole('button', { name: 'Sprawdź wklejony wynik' }).click()
  await expect(page.getByText(/nie jest wynikiem testu Work Profile/)).toBeVisible()
})
