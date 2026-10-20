import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Contrôle la session injectée par auth() — simule le comportement de next-auth v5
let mockSession: unknown = null

vi.mock('../src/auth', () => ({
  // auth(callback) retourne un handler qui injecte req.auth avant d'appeler le callback
  auth: (callback: (req: unknown) => unknown) => async (req: unknown) => {
    return callback({
      ...(typeof req === 'object' && req !== null ? req : {}),
      auth: mockSession,
    })
  },
}))

import { middleware } from '../src/proxy'

function createProxyRequest(path: string): Parameters<typeof middleware>[0] {
  const url = new URL(`http://localhost${path}`)
  // RAISON: Le proxy mocké ne lit que l’URL ; le middleware NextAuth fournit le reste à l’exécution.
  return { nextUrl: url, url: url.toString() } as Parameters<typeof middleware>[0]
}

beforeEach(() => {
  mockSession = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('proxy middleware', () => {
  it('passe les pages /auth sans vérifier la session', async () => {
    mockSession = null // non authentifié
    const res = await middleware(createProxyRequest('/auth/signin'))
    // Pas de redirection — path public
    expect(res).toBeUndefined()
  })

  it('laisse passer un utilisateur authentifié', async () => {
    mockSession = { user: { id: 'u1', organizationId: 'org-1' } }
    const res = await middleware(createProxyRequest('/dashboard'))
    // Pas de redirection
    expect(res).toBeUndefined()
  })

  it('redirige vers /auth/signin si non authentifié sur une page protégée', async () => {
    mockSession = null
    const res = await middleware(createProxyRequest('/dashboard'))
    // Redirection vers signin
    expect(res?.status).toBeGreaterThanOrEqual(301)
    expect(res?.status).toBeLessThanOrEqual(308)
    expect(res?.headers?.get('location')).toContain('/auth/signin')
  })

  it('redirige une session d’erreur Auth.js truthy vers /auth/signin', async () => {
    mockSession = { error: 'Configuration' }

    const res = await middleware(createProxyRequest('/dashboard'))

    expect(res?.status).toBeGreaterThanOrEqual(301)
    expect(res?.status).toBeLessThanOrEqual(308)
    expect(res?.headers?.get('location')).toContain('/auth/signin')
  })

  it('blocks test salon pages outside the preprod preview deployment', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')

    const res = await middleware(createProxyRequest('/test-salons'))

    expect(res?.status).toBe(404)
  })

  it('allows test salon pages only on the preprod preview deployment', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')
    mockSession = { user: { id: 'tech-1', role: 'TECH_ADMIN' } }

    const res = await middleware(createProxyRequest('/test-salons'))

    expect(res).toBeUndefined()
  })
})
