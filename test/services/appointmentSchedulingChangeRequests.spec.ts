import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    appointment: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    appointmentChangeRequest: { updateMany: vi.fn() },
    customerPackage: { updateMany: vi.fn() },
    service: { findFirst: vi.fn() },
    customer: { findFirst: vi.fn() },
    staff: { findFirst: vi.fn() },
    unavailability: { findMany: vi.fn() },
  }
  return {
    transactionMock: transaction,
    prismaMock: { $transaction: vi.fn() },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  deleteStaffAppointment,
  updateStaffAppointment,
} from '@/services/appointmentScheduling.service'
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transactionMock as never))
  transactionMock.appointment.findFirst.mockResolvedValue({
    id: 'appointment-1',
    staffId: 'staff-1',
    status: 'CONFIRMED',
    finalPrice: null,
  })
  transactionMock.appointment.findMany.mockResolvedValue([])
  transactionMock.appointment.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.appointment.deleteMany.mockResolvedValue({ count: 1 })
  transactionMock.appointmentChangeRequest.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.unavailability.findMany.mockResolvedValue([])
})

describe('staff appointment changes with pending portal requests', () => {
  it('rejects pending requests in the same transaction as a staff update', async () => {
    await updateStaffAppointment({
      organizationId: 'org-1',
      id: 'appointment-1',
      start: new Date('2026-10-04T08:30:00.000Z'),
      end: new Date('2026-10-04T09:30:00.000Z'),
      duration: 60,
    })

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    )
    expect(transactionMock.appointmentChangeRequest.updateMany).toHaveBeenCalledWith({
      where: {
        appointmentId: 'appointment-1',
        organizationId: 'org-1',
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        reviewReason: 'RDV modifié directement par l’organisation',
        reviewedAt: expect.any(Date),
      },
    })
  })

  it('rejects pending requests before physically deleting the original appointment', async () => {
    await expect(deleteStaffAppointment({
      organizationId: 'org-1',
      id: 'appointment-1',
    })).resolves.toBe(true)

    expect(transactionMock.appointmentChangeRequest.updateMany).toHaveBeenCalledOnce()
    expect(transactionMock.appointment.deleteMany).toHaveBeenCalledWith({
      where: { id: 'appointment-1', organizationId: 'org-1' },
    })
  })

  it('does not reject requests or delete a paid appointment', async () => {
    transactionMock.appointment.findFirst.mockResolvedValueOnce({
      id: 'appointment-1',
      status: 'PAID',
      finalPrice: 50,
    })

    await expect(deleteStaffAppointment({
      organizationId: 'org-1',
      id: 'appointment-1',
    })).rejects.toMatchObject({ status: 403 })

    expect(transactionMock.appointmentChangeRequest.updateMany).not.toHaveBeenCalled()
    expect(transactionMock.appointment.deleteMany).not.toHaveBeenCalled()
  })
})
