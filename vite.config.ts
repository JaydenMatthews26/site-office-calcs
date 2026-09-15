import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, isPreview }) => ({
  // Project Pages: https://jaydenmatthews26.github.io/site-office-calcs/
  // Production / preview use that base. `npm run dev` stays on `/`.
  base: command === 'build' || isPreview ? '/site-office-calcs/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
