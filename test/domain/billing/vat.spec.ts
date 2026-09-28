import { describe, it, expect } from 'vitest'
import { computeVatFromTtc, computeSoldProductLine, roundToCents } from '@/domain/billing/vat'

describe('computeVatFromTtc', () => {
  it('retourne 0 quand le taux est nul', () => {
    expect(computeVatFromTtc(100, 0)).toBe(0)
  })

  it('retourne 0 quand le taux est négatif', () => {
    expect(computeVatFromTtc(100, -5)).toBe(0)
  })

  it('retourne 0 quand le montant TTC est nul', () => {
    expect(computeVatFromTtc(0, 20)).toBe(0)
  })

  it('extrait correctement la TVA à 20% d’un montant TTC', () => {
    // 120 TTC à 20% -> 100 HT -> 20 de TVA
    expect(computeVatFromTtc(120, 20)).toBeCloseTo(20, 6)
  })

  it('extrait correctement la TVA à 5.5%', () => {
    const result = computeVatFromTtc(21.1, 5.5)
    expect(result).toBeCloseTo(1.1, 2)
  })
})

describe('roundToCents', () => {
  it('arrondit au centime le plus proche', () => {
    expect(roundToCents(1.005)).toBe(1)
    expect(roundToCents(1.006)).toBe(1.01)
    expect(roundToCents(19.999999)).toBe(20)
  })
})

describe('computeSoldProductLine', () => {
  it('calcule le total TTC et la TVA pour une quantité de 1', () => {
    const line = computeSoldProductLine(12, 1, 20)
    expect(line.totalTTC).toBe(12)
    expect(line.totalTax).toBeCloseTo(2, 2)
  })

  it('calcule le total TTC et la TVA pour une quantité > 1', () => {
    const line = computeSoldProductLine(12, 3, 20)
    expect(line.totalTTC).toBe(36)
    expect(line.totalTax).toBeCloseTo(6, 2)
  })

  it('ne calcule pas de TVA quand le taux est 0', () => {
    const line = computeSoldProductLine(10, 2, 0)
    expect(line.totalTTC).toBe(20)
    expect(line.totalTax).toBe(0)
  })

  it('arrondit la TVA à 2 décimales', () => {
    const line = computeSoldProductLine(9.99, 1, 20)
    expect(line.totalTax).toBe(roundToCents(line.totalTax))
  })
})
