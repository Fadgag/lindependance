import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '../../src/lib/logger'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('logger', () => {
  it('error() appelle toujours console.error (même en env test)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('boom', { detail: 42 })
    expect(spy).toHaveBeenCalledWith('boom', { detail: 42 })
  })

  it('info() ne log PAS en env test (NODE_ENV=test)', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('hello')
    expect(spy).not.toHaveBeenCalled()
  })

  it('warn() ne log PAS en env test', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('careful')
    expect(spy).not.toHaveBeenCalled()
  })

  it('debug() ne log PAS en env test (NODE_ENV !== "development")', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    logger.debug('debug msg')
    expect(spy).not.toHaveBeenCalled()
  })
})

