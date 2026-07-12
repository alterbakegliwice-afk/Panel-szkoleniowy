import { defineConfig, devices } from '@playwright/test'

// E2E: uruchamia zbudowaną aplikację (vite preview) i steruje nią w Chromium.
// Testy logiki są w vitest (src/**/*.test.js); tu sprawdzamy pełne ścieżki UI
// integracji Work Profile, których vitest nie dotyka.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry'
  },
  // PW_CHROMIUM: opcjonalna ścieżka do lokalnej przeglądarki (środowiska, gdzie
  // przeglądarka jest preinstalowana i nie zgadza się z wersją @playwright/test).
  // W CI zmiennej nie ma → używany jest standardowy browser z `playwright install`.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}
      }
    }
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
