import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, prismaMock, transactionMock, loggerMock } = vi.hoisted(() => {
  const transaction = {
    product: { create: vi.fn() },
    productStockMovement: { create: vi.fn() },
  }
  return {
    authMock: vi.fn(),
    prismaMock: {
      $transaction: vi.fn(),
      product: { findFirst: vi.fn(), update: vi.fn() },
    },
    transactionMock: transaction,
    loggerMock: { warn: vi.fn() },
  }
})

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

import { POST, PUT } from '@/app/api/products/route'
import { prisma } from '@/lib/prisma'

function productRequest(method: 'POST' | 'PUT', body: unknown, url = 'https://example.test/api/products') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  authMock.mockResolvedValue({ user: { organizationId: 'org-1' } })
  transactionMock.product.create.mockResolvedValue({
    id: 'product-1',
    name: 'Huile capillaire',
    stock: 5,
    organizationId: 'org-1',
  })
  // RAISON: le test ne simule que les delegates utilisés par cette transaction.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transactionMock as never))
})

describe('/api/products stock handling', () => {
  it('records the initial quantity in the movement history', async () => {
    const response = await POST(productRequest('POST', {
      name: 'Huile capillaire',
      priceTTC: 12,
      taxRate: 20,
      stock: 5,
      stockMinimum: 2,
      iconName: 'Package',
    }))

    expect(response.status).toBe(201)
    expect(transactionMock.productStockMovement.create).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        productName: 'Huile capillaire',
        organizationId: 'org-1',
        type: 'INITIAL',
        quantityDelta: 5,
        stockBefore: 0,
        stockAfter: 5,
      },
    })
  })

  it('updates the minimum without allowing a direct stock overwrite', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'product-1' })
    prismaMock.product.update.mockResolvedValue({
      id: 'product-1',
      stock: 5,
      stockMinimum: 3,
    })

    const invalidResponse = await PUT(
      productRequest('PUT', { stock: 100 }, 'https://example.test/api/products?id=product-1'),
    )
    expect(invalidResponse.status).toBe(400)
    expect(prismaMock.product.update).not.toHaveBeenCalled()

    const response = await PUT(
      productRequest('PUT', { stockMinimum: 3 }, 'https://example.test/api/products?id=product-1'),
    )

    expect(response.status).toBe(200)
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { stockMinimum: 3 },
    })
  })
})
