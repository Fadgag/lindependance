import { describe, it, expect, vi } from 'vitest'

// Mock logger to avoid console.error noise during tests
vi.mock('../../src/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import apiErrorResponse from '../../src/lib/api'

describe('apiErrorResponse', () => {
  it('retourne 409 pour "No sessions remaining"', async () => {
    const res = apiErrorResponse(new Error('No sessions remaining'))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('No sessions remaining')
  })

  it('retourne 500 pour un Error générique', async () => {
    const res = apiErrorResponse(new Error('Something exploded'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
    expect(body.detail).toBe('Something exploded')
  })

  it('retourne 500 pour une valeur non-Error (string)', async () => {
    const res = apiErrorResponse('raw string error')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.detail).toBe('raw string error')
  })

  it('retourne 500 pour un objet non-Error', async () => {
    const res = apiErrorResponse({ code: 42 })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.detail).toBe('string')
  })
})

