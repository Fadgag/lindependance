import { describe, it, expect, vi, beforeEach } from 'vitest'

// Contrôle la session injectée par auth() — simule le comportement de next-auth v5
let mockSession: unknown = null

vi.mock('../src/auth', () => ({
  // auth(callback) retourne un handler qui injecte req.auth avant d'appeler le callback
  auth: (callback: (req: unknown) => unknown) => async (req: unknown) => {
    return callback({ ...(req as object), auth: mockSession })
  },
}))

import { middleware } from '../src/proxy'

beforeEach(() => {
  mockSession = null
})

describe('proxy middleware', () => {
  it('passe les pages /auth sans vérifier la session', async () => {
    mockSession = null // non authentifié
    const req = {
      nextUrl: new URL('http://localhost/auth/signin'),
      url: 'http://localhost/auth/signin',
    }
    const res = await middleware(req as any, {} as any)
    // Pas de redirection — path public
    expect(res).toBeUndefined()
  })

  it('laisse passer un utilisateur authentifié', async () => {
    mockSession = { user: { id: 'u1', organizationId: 'org-1' } }
    const req = {
      nextUrl: new URL('http://localhost/dashboard'),
      url: 'http://localhost/dashboard',
    }
    const res = await middleware(req as any, {} as any)
    // Pas de redirection
    expect(res).toBeUndefined()
  })

  it('redirige vers /auth/signin si non authentifié sur une page protégée', async () => {
    mockSession = null
    const req = {
      nextUrl: new URL('http://localhost/dashboard'),
      url: 'http://localhost/dashboard',
    }
    const res = await middleware(req as any, {} as any)
    // Redirection vers signin
    expect(res?.status).toBeGreaterThanOrEqual(301)
    expect(res?.status).toBeLessThanOrEqual(308)
    expect(res?.headers?.get('location')).toContain('/auth/signin')
  })
})

