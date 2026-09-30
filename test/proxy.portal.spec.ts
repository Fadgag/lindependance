import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/auth', () => ({
  auth: (callback: (request: unknown) => unknown) => callback,
}))

import { middleware } from '../src/proxy'

describe('public customer portal pages', () => {
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
