import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/auth', () => ({
  auth: (callback: (request: unknown) => unknown) => callback,
}))

import { middleware } from '../src/proxy'

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

  it('does not redirect unauthenticated visitors to the staff sign-in page', async () => {
    const request = {
      nextUrl: new URL('https://example.test/portail/atelier/reserver'),
      url: 'https://example.test/portail/atelier/reserver',
      auth: null,
    }

    const response = await middleware(request as never)

    expect(response).toBeUndefined()
  })
})
