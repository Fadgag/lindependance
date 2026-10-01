import { describe, it, expect } from 'vitest'
import {
  canConsumeSession,
  consumeSession,
  getSessionRefundAmount,
} from '@/domain/package/sessionCredit'

describe('canConsumeSession', () => {
  it('autorise la consommation quand il reste des séances', () => {
    expect(canConsumeSession({ sessionsRemaining: 3 })).toBe(true)
  })

  it('refuse la consommation quand il ne reste aucune séance', () => {
    expect(canConsumeSession({ sessionsRemaining: 0 })).toBe(false)
  })

  it('refuse la consommation pour un compteur négatif (donnée corrompue)', () => {
    expect(canConsumeSession({ sessionsRemaining: -1 })).toBe(false)
  })
})

describe('consumeSession', () => {
  it('décrémente le nombre de séances restantes', () => {
    const result = consumeSession({ sessionsRemaining: 3 })
    expect(result.sessionsRemaining).toBe(2)
  })

  describe('getSessionRefundAmount', () => {
    it('returns exactly one session for an eligible customer cancellation', () => {
      expect(getSessionRefundAmount()).toBe(1)
    })
  })

  it('préserve les autres champs du forfait', () => {
    const result = consumeSession({ id: 'pkg_1', sessionsRemaining: 1 })
    expect(result).toEqual({ id: 'pkg_1', sessionsRemaining: 0 })
  })

  it('lève une erreur si aucune séance n’est disponible', () => {
    expect(() => consumeSession({ sessionsRemaining: 0 })).toThrow(/no sessions remaining/i)
  })
})
