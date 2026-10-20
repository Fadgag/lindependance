import { describe, it, expect, vi } from 'vitest'

// Mock logger to avoid console.error noise during tests
vi.mock('../../src/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import apiErrorResponse from '../../src/lib/api'
import { logger } from '../../src/lib/logger'

describe('apiErrorResponse', () => {
  it('retourne 409 pour "No sessions remaining"', async () => {
    const res = apiErrorResponse(new Error('No sessions remaining'))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('No sessions remaining')
  })

  it('retourne 500 pour un Error générique', async () => {
    const error = new Error('Sensitive database detail')
    const res = apiErrorResponse(error)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal server error' })
    expect(logger.error).toHaveBeenCalledWith('API error:', error)
  })

  it('retourne 500 pour une valeur non-Error (string)', async () => {
    const res = apiErrorResponse('sensitive raw error')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal server error' })
  })

  it('retourne 500 pour un objet non-Error', async () => {
    const res = apiErrorResponse({ code: 42 })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal server error' })
  })
})
