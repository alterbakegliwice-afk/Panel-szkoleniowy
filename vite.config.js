import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base: './' — zbudowany dist/index.html działa także otwarty prosto z dysku
// (piekarnia, nie chmura: deploy = skopiuj folder dist)
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
