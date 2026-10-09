import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, prismaMock, transactionMock, loggerMock } = vi.hoisted(() => {
  const transaction = {
    appointment: { findFirst: vi.fn(), updateMany: vi.fn() },
    appointmentChangeRequest: { updateMany: vi.fn() },
    product: { findMany: vi.fn(), updateMany: vi.fn() },
  }
  return {
    authMock: vi.fn(),
    prismaMock: { $transaction: vi.fn() },
    transactionMock: transaction,
    loggerMock: { error: vi.fn() },
  }
})

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

import { POST } from '@/app/api/appointments/[id]/checkout/route'
import { prisma } from '@/lib/prisma'

const context = { params: Promise.resolve({ id: 'appointment-1' }) }
const checkoutRequest = () => new Request('https://example.test/api/appointments/appointment-1/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentMethod: 'CASH' }),
})

beforeEach(() => {
  vi.resetAllMocks()
  authMock.mockResolvedValue({ user: { organizationId: 'org-1', role: 'ADMIN' } })
  transactionMock.appointment.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.appointment.findFirst.mockResolvedValue({
    status: 'CONFIRMED',
    service: { price: 30, organizationId: 'org-1' },
  })
  transactionMock.appointmentChangeRequest.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.product.findMany.mockResolvedValue([])
  transactionMock.product.updateMany.mockResolvedValue({ count: 1 })
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transactionMock as never))
})

describe('POST /api/appointments/[id]/checkout', () => {
  it('rejects pending portal change requests atomically when checkout closes the appointment', async () => {
    const response = await POST(checkoutRequest(), context)

    expect(response.status).toBe(200)
    expect(transactionMock.appointment.updateMany).toHaveBeenCalledOnce()
    expect(transactionMock.appointmentChangeRequest.updateMany).toHaveBeenCalledWith({
      where: {
        appointmentId: 'appointment-1',
        organizationId: 'org-1',
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        reviewReason: 'Le rendez-vous a été clôturé après le paiement.',
        reviewedAt: expect.any(Date),
      },
    })
  })

  it('recalculates the total and product snapshot from persisted prices', async () => {
    const productId = 'c123456789abcdefghijklm'
    transactionMock.product.findMany.mockResolvedValue([{
      id: productId,
      name: 'Huile capillaire',
      iconName: 'Bottle',
      priceTTC: 12.5,
      taxRate: 20,
      stock: 10,
      organizationId: 'org-1',
    }])
    const request = new Request('https://example.test/api/appointments/appointment-1/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'CASH',
        extras: [{ label: 'Supplément', price: 10 }],
        soldProducts: [{
          productId,
          quantity: 2,
        }],
      }),
    })

    const response = await POST(request, context)

    expect(response.status).toBe(200)
    expect(transactionMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: productId, organizationId: 'org-1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    })
    const updateData = transactionMock.appointment.updateMany.mock.calls[0][0].data
    expect(updateData.finalPrice).toBe(65)
    expect(transactionMock.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'appointment-1',
        organizationId: 'org-1',
        AND: [
          { status: { notIn: ['PAID', 'PAYED'] } },
          { OR: [{ finalPrice: null }, { finalPrice: { lte: 0 } }] },
        ],
      }),
    }))
    expect(JSON.parse(updateData.soldProducts)).toEqual([{
      productId,
      name: 'Huile capillaire',
      iconName: 'Bottle',
      quantity: 2,
      priceTTC: 12.5,
      taxRate: 20,
      totalTTC: 25,
      totalTax: 4.17,
    }])
    expect(updateData).not.toHaveProperty('totalPrice')
  })

  it('rejects client-supplied totals', async () => {
    const request = new Request('https://example.test/api/appointments/appointment-1/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalPrice: 1, paymentMethod: 'CASH' }),
    })

    const response = await POST(request, context)

    expect(response.status).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('does not allow non-admin staff to submit custom extras', async () => {
    authMock.mockResolvedValue({ user: { organizationId: 'org-1', role: 'USER' } })
    const request = new Request('https://example.test/api/appointments/appointment-1/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'CASH',
        extras: [{ label: 'Supplément falsifié', price: 1000 }],
      }),
    })

    const response = await POST(request, context)

    expect(response.status).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects a repeated checkout before changing product stock', async () => {
    transactionMock.appointment.findFirst.mockResolvedValue({
      status: 'PAID',
      finalPrice: 50,
      service: { price: 30, organizationId: 'org-1' },
    })
    const request = new Request('https://example.test/api/appointments/appointment-1/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'CASH' }),
    })

    const response = await POST(request, context)

    expect(response.status).toBe(409)
    expect(transactionMock.product.findMany).not.toHaveBeenCalled()
    expect(transactionMock.product.updateMany).not.toHaveBeenCalled()
    expect(transactionMock.appointment.updateMany).not.toHaveBeenCalled()
  })
})
