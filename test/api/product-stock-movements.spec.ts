import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, prismaMock, transactionMock, loggerMock } = vi.hoisted(() => {
  const transaction = {
    $queryRaw: vi.fn(),
    product: { updateMany: vi.fn() },
    productStockMovement: { create: vi.fn() },
  }
  return {
    authMock: vi.fn(),
    prismaMock: {
      $transaction: vi.fn(),
      product: { findFirst: vi.fn() },
      productStockMovement: { findMany: vi.fn() },
    },
    transactionMock: transaction,
    loggerMock: { error: vi.fn() },
  }
})

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

import { GET, POST } from '@/app/api/products/[id]/stock-movements/route'
import { prisma } from '@/lib/prisma'

const context = { params: Promise.resolve({ id: 'product-1' }) }

function request(body?: unknown) {
  return new Request('https://example.test/api/products/product-1/stock-movements', {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  authMock.mockResolvedValue({ user: { organizationId: 'org-1' } })
  transactionMock.$queryRaw.mockResolvedValue([{
    id: 'product-1',
    name: 'Huile capillaire',
    stock: 4,
    stockMinimum: 0,
  }])
  transactionMock.product.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.productStockMovement.create.mockResolvedValue({
    id: 'movement-1',
    productId: 'product-1',
    productName: 'Huile capillaire',
    organizationId: 'org-1',
    type: 'RECEIPT',
    quantityDelta: 3,
    stockBefore: 4,
    stockAfter: 7,
    note: null,
    appointmentId: null,
    createdAt: new Date('2026-10-09T12:00:00.000Z'),
  })
  // RAISON: le test ne simule que les delegates utilisés par cette transaction.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transactionMock as never))
})

describe('/api/products/[id]/stock-movements', () => {
  it('records a receipt as an organization-scoped stock movement', async () => {
    const response = await POST(request({ type: 'RECEIPT', quantityDelta: 3 }), context)

    expect(response.status).toBe(201)
    expect(transactionMock.$queryRaw.mock.calls[0][0].join('')).toContain('FOR UPDATE')
    expect(transactionMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'product-1', organizationId: 'org-1' },
      data: { stock: { increment: 3 } },
    })
    expect(transactionMock.productStockMovement.create).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        productName: 'Huile capillaire',
        organizationId: 'org-1',
        type: 'RECEIPT',
        quantityDelta: 3,
        stockBefore: 4,
        stockAfter: 7,
        note: undefined,
        appointmentId: undefined,
      },
    })
  })

  it('rejects a movement that would make stock negative', async () => {
    transactionMock.$queryRaw.mockResolvedValue([{
      id: 'product-1',
      name: 'Huile capillaire',
      stock: 2,
      stockMinimum: 0,
    }])
    transactionMock.product.updateMany.mockResolvedValue({ count: 0 })

    const response = await POST(request({ type: 'ADJUSTMENT', quantityDelta: -3 }), context)

    expect(response.status).toBe(409)
    expect(transactionMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'product-1', organizationId: 'org-1', stock: { gte: 3 } },
      data: { stock: { increment: -3 } },
    })
    expect(transactionMock.productStockMovement.create).not.toHaveBeenCalled()
  })

  it('rejects a movement that would exceed the database stock limit', async () => {
    transactionMock.$queryRaw.mockResolvedValue([{
      id: 'product-1',
      name: 'Huile capillaire',
      stock: 2_147_483_647,
      stockMinimum: 0,
    }])

    const response = await POST(request({ type: 'RECEIPT', quantityDelta: 1 }), context)

    expect(response.status).toBe(409)
    expect(transactionMock.product.updateMany).not.toHaveBeenCalled()
    expect(transactionMock.productStockMovement.create).not.toHaveBeenCalled()
  })

  it('rejects a zero adjustment before starting a transaction', async () => {
    const response = await POST(request({ type: 'ADJUSTMENT', quantityDelta: 0 }), context)

    expect(response.status).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('lists history only for a product belonging to the current organization', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'product-1' })
    prismaMock.productStockMovement.findMany.mockResolvedValue([])

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', organizationId: 'org-1' },
      select: { id: true },
    })
    expect(prismaMock.productStockMovement.findMany).toHaveBeenCalledWith({
      where: { productId: 'product-1', organizationId: 'org-1' },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('does not return history for a product from another organization', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null)

    const response = await GET(request(), context)

    expect(response.status).toBe(404)
    expect(prismaMock.productStockMovement.findMany).not.toHaveBeenCalled()
  })

  it('does not create a movement for a product from another organization', async () => {
    transactionMock.$queryRaw.mockResolvedValue([])

    const response = await POST(request({ type: 'RECEIPT', quantityDelta: 3 }), context)

    expect(response.status).toBe(404)
    expect(transactionMock.product.updateMany).not.toHaveBeenCalled()
    expect(transactionMock.productStockMovement.create).not.toHaveBeenCalled()
  })

  it('rejects an empty product route parameter', async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: '' }) })

    expect(response.status).toBe(400)
    expect(prismaMock.product.findFirst).not.toHaveBeenCalled()
  })
})
