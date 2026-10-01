import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, prismaMock, transactionMock, loggerMock } = vi.hoisted(() => {
  const transaction = {
    appointment: { updateMany: vi.fn() },
    appointmentChangeRequest: { updateMany: vi.fn() },
    product: { updateMany: vi.fn() },
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
  body: JSON.stringify({ totalPrice: 50, paymentMethod: 'CASH' }),
})

beforeEach(() => {
  vi.resetAllMocks()
  authMock.mockResolvedValue({ user: { organizationId: 'org-1' } })
  transactionMock.appointment.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.appointmentChangeRequest.updateMany.mockResolvedValue({ count: 1 })
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
})
