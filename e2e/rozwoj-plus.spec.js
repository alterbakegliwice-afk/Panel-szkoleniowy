import { test, expect } from '@playwright/test'

// Spaced retrieval: zaliczenie sprzed >200 dni musi wrócić jako powtórka,
// z pytaniem CCP na pierwszym miejscu, i dać się powtórzyć jako quiz.
test('spaced retrieval: stare zaliczenie wraca do powtórki i uruchamia quiz', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const KLUCZ = 'alterbake-platforma-v1'
    const stan = JSON.parse(localStorage.getItem(KLUCZ) || '{}')
    stan.wyniki = [
      // W-01 = CCP, Z-01 = nie-CCP; oba zaliczone bardzo dawno → obie do powtórki
      { data: '2025-01-01T00:00:00.000Z', id_prac: 'P-01', id_pytania: 'W-01', zaliczyl: true, oceniajacy: 'auto', notatka: '' },
      { data: '2025-01-01T00:00:00.000Z', id_prac: 'P-01', id_pytania: 'Z-01', zaliczyl: true, oceniajacy: 'auto', notatka: '' }
    ]
    localStorage.setItem(KLUCZ, JSON.stringify(stan))
  })
  await page.reload()
  await page.locator('.profil-kafel').first().click() // P-01

  const karta = page.locator('.powtorki-karta')
  await expect(karta).toBeVisible()
  await expect(karta.getByText(/1 CCP/)).toBeVisible() // CCP policzone osobno
  await karta.getByRole('button', { name: /Powtórz teraz/ }).click()

  // uruchamia quiz w trybie powtórki (etykieta zamiast tomu)
  await expect(page.getByText(/Powtórka \(utrwalenie\)/)).toBeVisible()
})

// Triangulacja: Mentor loguje obserwację „bez zmian" tam, gdzie samoocena wzrosła
// po reteście → panel flaguje rozjazd.
test('triangulacja: rozjazd samooceny i obserwacji Mentora jest flagowany', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const wynik = (data, initiative) => ({
      typ: 'alterbake-wynik-work-profile', wersja: '2026-07-12', narzedzie: 'profil-pracy', data,
      osoba: { imie: 'Weronika', rola: 'Piekarz' },
      wyniki: { reliability: 80, pressure: 45, collaboration: 70, learning: 65, initiative, integrity: 85, communication: 55, problemSolving: 60 }
    })
    localStorage.setItem('alterbake_work_profile_wyniki_v1', JSON.stringify([
      wynik('2026-05-01T10:00:00.000Z', 30), wynik('2026-08-01T10:00:00.000Z', 62)
    ]))
  })
  await page.reload()

  // pracownik przypisuje sobie oba wyniki (samoocena: initiative ▲ +32)
  await page.locator('.profil-kafel').first().click()
  await page.getByRole('button', { name: 'Rozwój' }).click()
  await page.getByRole('button', { name: /Przypisz do mnie/ }).first().click()
  await page.getByRole('button', { name: /Przypisz do mnie/ }).first().click()

  // Właściciel loguje obserwację „bez zmian" dla Inicjatywy
  await page.getByRole('button', { name: 'Zmień profil' }).click()
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zespół$/ }).click()

  await expect(page.getByRole('heading', { name: 'Obserwacja w praktyce vs samoocena' })).toBeVisible()
  // wybierz obszar Inicjatywa + kierunek „bez zmian"
  const selects = page.locator('.obs-form select')
  await selects.nth(1).selectOption({ label: 'Inicjatywa' })
  await selects.nth(2).selectOption({ value: 'bez_zmian' })
  await page.getByRole('button', { name: 'Zapisz obserwację' }).click()
  await expect(page.getByText(/Zapisano obserwację/)).toBeVisible()

  // rozwiń zestawienie i sprawdź flagę rozjazdu
  await page.getByText('Weronika — samoocena vs obserwacja').click()
  await expect(page.getByText(/temat do rozmowy/).first()).toBeVisible()
})

// Widoczność powtórek dla Mentora: zaległa wiedza CCP zespołu jako baner + kolumna.
test('Zespół: zaległe powtórki CCP widoczne dla właściciela (baner + kolumna)', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const KLUCZ = 'alterbake-platforma-v1'
    const stan = JSON.parse(localStorage.getItem(KLUCZ) || '{}')
    // P-01: stare zaliczenie CCP (W-01) → zaległa powtórka CCP
    stan.wyniki = [
      { data: '2025-01-01T00:00:00.000Z', id_prac: 'P-01', id_pytania: 'W-01', zaliczyl: true, oceniajacy: 'auto', notatka: '' }
    ]
    localStorage.setItem(KLUCZ, JSON.stringify(stan))
  })
  await page.reload()
  await page.getByRole('button', { name: /Wejdź jako Właściciel/ }).click()
  await page.getByRole('button', { name: /^Zespół$/ }).click()

  await expect(page.getByText(/Wiedza CCP do odświeżenia w zespole/)).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Do powtórki' })).toBeVisible()
  await expect(page.getByText(/1 · 1 CCP/).first()).toBeVisible()
})
