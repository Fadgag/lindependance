// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const nextAuthSecret = process.env.NEXTAUTH_SECRET
  ?? process.env.AUTH_SECRET
  ?? globalThis.crypto.randomUUID()

const config = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      NEXTAUTH_SECRET: nextAuthSecret,
    },
  },
}
module.exports = config
