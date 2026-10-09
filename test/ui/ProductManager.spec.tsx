import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProductManager from '@/components/settings/ProductManager'
import type { Product, ProductStockMovement } from '@/types/models'

const fetchMock = vi.fn<typeof fetch>()

const product: Product = {
  id: 'product-1',
  name: 'Huile capillaire',
  priceTTC: 12,
  taxRate: 20,
  stock: 2,
  stockMinimum: 2,
  iconName: 'Package',
  organizationId: 'org-1',
  createdAt: '2026-10-09T12:00:00.000Z',
  updatedAt: '2026-10-09T12:00:00.000Z',
}

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProductManager stock controls', () => {
  it('flags low stock, records a signed adjustment, and displays the movement history', async () => {
    const updatedProduct = { ...product, stock: 1 }
    const movement: ProductStockMovement = {
      id: 'movement-1',
      productId: product.id,
      productName: product.name,
      type: 'ADJUSTMENT',
      quantityDelta: -1,
      stockBefore: 2,
      stockAfter: 1,
      note: 'Produit endommagé',
      appointmentId: null,
      createdAt: '2026-10-09T12:00:00.000Z',
    }
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, [product]))
      .mockResolvedValueOnce(jsonResponse(201, { status: 'created' }))
      .mockResolvedValueOnce(jsonResponse(200, [updatedProduct]))
      .mockResolvedValueOnce(jsonResponse(200, [movement]))

    render(<ProductManager />)

    expect(await screen.findByText('À réapprovisionner')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un mouvement de stock pour Huile capillaire' }))
    fireEvent.change(screen.getByLabelText('Type de mouvement'), { target: { value: 'ADJUSTMENT' } })
    fireEvent.change(screen.getByLabelText('Variation de stock (+ ou -)'), { target: { value: '-1' } })
    fireEvent.change(screen.getByLabelText('Note (facultative)'), { target: { value: 'Produit endommagé' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByText('Stock : 1')).toBeInTheDocument())
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({
      type: 'ADJUSTMENT',
      quantityDelta: -1,
      note: 'Produit endommagé',
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Voir l’historique du stock de Huile capillaire' }))
    expect(await screen.findByText('Ajustement')).toBeInTheDocument()
    expect(screen.getByText('Produit endommagé')).toBeInTheDocument()
  })
})
