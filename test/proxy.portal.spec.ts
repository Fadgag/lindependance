import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/auth', () => ({
  auth: (callback: (request: unknown) => unknown) => callback,
}))

import { config, middleware } from '../src/proxy'

function createRequest(pathname: string) {
  return {
    nextUrl: new URL(`https://example.test${pathname}`),
    url: `https://example.test${pathname}`,
    auth: null,
  }
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('public customer portal pages', () => {
  it('lets unauthenticated visitors open the public home page', async () => {
    const request = {
      nextUrl: new URL('https://example.test/'),
      url: 'https://example.test/',
      auth: null,
    }

    const response = await middleware(request as never)

    expect(response).toBeUndefined()
  })

  it('redirects a signed-in staff member from the home page to the dashboard', async () => {
    const request = {
      nextUrl: new URL('https://example.test/'),
      url: 'https://example.test/',
      auth: { user: { accountType: 'STAFF' } },
    }

    const response = await middleware(request as never)

    expect(response?.headers.get('location')).toBe('https://example.test/dashboard')
  })

  it('redirects the technical administrator to campaign tracking', async () => {
    const request = {
      nextUrl: new URL('https://example.test/'),
      url: 'https://example.test/',
      auth: { user: { accountType: 'STAFF', role: 'TECH_ADMIN' } },
    }

    const response = await middleware(request as never)

    expect(response?.headers.get('location')).toBe('https://example.test/test-campaigns')
  })

  it('does not redirect unauthenticated visitors to the staff sign-in page', async () => {
    const request = {
      nextUrl: new URL('https://example.test/portail/atelier/reserver'),
      url: 'https://example.test/portail/atelier/reserver',
      auth: null,
    }

    const response = await middleware(request as never)

    expect(response).toBeUndefined()
  })

  it('lets unauthenticated visitors open a campaign feedback link', async () => {
    const request = createRequest(`/retour-test/${'a'.repeat(43)}`)
    const response = await middleware(request as never)

    expect(response).toBeUndefined()
  })

  it.each(['/manifest.json', '/manifest.webmanifest', '/sw.js'])(
    'excludes public PWA assets from authentication matching (%s)',
    (pathname) => {
      const matcher = config.matcher[0]
      if (typeof matcher !== 'string') throw new Error('Expected the general proxy matcher to be a string')
      expect(new RegExp(matcher).test(pathname)).toBe(false)
    },
  )

  it.each([
    '/test-campaigns',
    '/test-campaigns/campaign-id',
    `/retour-test/${'a'.repeat(43)}`,
    '/api/test-campaigns',
    '/api/test-campaigns/recipients',
    `/api/test-feedback/${'a'.repeat(43)}`,
  ])('hides beta campaign routes in production (%s)', async (pathname) => {
    vi.stubEnv('VERCEL_ENV', 'production')

    const response = await middleware(createRequest(pathname) as never)

    expect(response?.status).toBe(404)
  })

  it('hides beta campaign routes on preview deployments other than preprod', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feature/other')

    const response = await middleware(createRequest('/test-campaigns') as never)

    expect(response?.status).toBe(404)
  })

  it('lets preprod beta APIs continue to their own authorization checks', async () => {
    const response = await middleware(createRequest('/api/test-campaigns') as never)

    expect(response).toBeUndefined()
  })

  it('redirects technical administrators to the dashboard in production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const request = {
      ...createRequest('/'),
      auth: { user: { accountType: 'STAFF', role: 'TECH_ADMIN' } },
    }

    const response = await middleware(request as never)

    expect(response?.headers.get('location')).toBe('https://example.test/dashboard')
  })

  it('matches both beta API families so the environment gate also protects direct API calls', () => {
    expect(config.matcher).toContain('/api/test-campaigns/:path*')
    expect(config.matcher).toContain('/api/test-feedback/:path*')
  })
})
