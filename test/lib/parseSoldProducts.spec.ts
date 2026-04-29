import { describe, it, expect } from 'vitest'
import parseSoldProducts from '@/lib/parseSoldProducts'

describe('parseSoldProducts', () => {
  it('retourne sum=0 et products=[] pour null', () => {
    const r = parseSoldProducts(null)
    expect(r.sum).toBe(0)
    expect(r.products).toEqual([])
  })

  it('retourne sum=0 et products=[] pour undefined', () => {
    const r = parseSoldProducts(undefined)
    expect(r.sum).toBe(0)
    expect(r.products).toEqual([])
  })

  it('retourne sum=0 et products=[] pour un tableau vide sérialisé', () => {
    const r = parseSoldProducts('[]')
    expect(r.sum).toBe(0)
    expect(r.products).toEqual([])
  })

  it('retourne sum=0 et products=[] pour un tableau vide (array)', () => {
    const r = parseSoldProducts([])
    expect(r.sum).toBe(0)
    expect(r.products).toEqual([])
  })

  it('retourne sum=0 et products=[] pour un JSON malformé', () => {
    const r = parseSoldProducts('{ invalid json }')
    expect(r.sum).toBe(0)
    expect(r.products).toEqual([])
  })

  it('calcule correctement le total avec totalTTC', () => {
    const input = [
      { productId: 'p1', name: 'Produit A', priceTTC: 10, quantity: 2, totalTTC: 20 },
      { productId: 'p2', name: 'Produit B', priceTTC: 5, quantity: 1, totalTTC: 5 }
    ]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(25)
    expect(r.products).toHaveLength(2)
    expect(r.products[0]).toMatchObject({ productId: 'p1', name: 'Produit A', priceTTC: 10, quantity: 2 })
  })

  it('calcule le total via priceTTC × quantity quand totalTTC est absent', () => {
    const input = [{ productId: 'p1', name: 'Produit A', priceTTC: 12, quantity: 3 }]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(36)
  })

  it('utilise quantity=1 par défaut quand absent', () => {
    const input = [{ productId: 'p1', name: 'Produit A', priceTTC: 15 }]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(15)
  })

  it('parse correctement depuis une chaîne JSON sérialisée (soldProducts string en DB)', () => {
    const input = JSON.stringify([
      { productId: 'p1', name: 'Shampoo', priceTTC: 8, quantity: 2, totalTTC: 16 }
    ])
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(16)
    expect(r.products[0].name).toBe('Shampoo')
  })

  it('ignore les lignes avec priceTTC=0 et quantity manquante sans planter', () => {
    const input = [{ productId: 'p1', name: 'Gratuit', priceTTC: 0, quantity: 1, totalTTC: 0 }]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(0)
    expect(r.products).toHaveLength(1)
  })

  it('somme plusieurs lignes sans totalTTC', () => {
    const input = [
      { priceTTC: 5, quantity: 2 },
      { priceTTC: 3, quantity: 4 }
    ]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(5 * 2 + 3 * 4)
  })

  // --- Branches L14-16 : qty/priceTTC en string (truthy non-number) ---

  it('convertit quantity en nombre si c\'est une string truthy — L14', () => {
    // it.quantity est "3" (string) → Number("3") = 3
    const input = [{ priceTTC: 10, quantity: '3', totalTTC: 30 }]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(30)
    expect(r.products[0].quantity).toBe(3)
  })

  it('convertit priceTTC en nombre si c\'est une string truthy — L15', () => {
    // it.priceTTC est "12.5" (string) → Number("12.5") = 12.5
    const input = [{ priceTTC: '12.5', quantity: 2 }]
    const r = parseSoldProducts(input)
    expect(r.sum).toBeCloseTo(25)
    expect(r.products[0].priceTTC).toBeCloseTo(12.5)
  })

  it('calcule lineTotal via unit×qty si totalTTC est absent et les champs sont des strings — L16', () => {
    const input = [{ priceTTC: '8', quantity: '4' }]
    const r = parseSoldProducts(input)
    expect(r.sum).toBe(32)
  })
})

