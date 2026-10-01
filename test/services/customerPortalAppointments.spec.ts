import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    organization: { findFirst: vi.fn() },
    appointment: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    customerPackage: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  cancelCustomerPortalAppointment,
  getCustomerPortalAppointments,
} from '@/services/customerPortalAppointments.service'
import { prisma } from '@/lib/prisma'

const input = {
  organizationId: 'org-1',
  verifiedEmail: 'parent@example.com',
}
const now = new Date('2026-10-01T10:00:00.000Z')

function transactionFixture(appointment: {
  id: string
  customerId: string
  customerPackageId: string | null
  startTime: Date
} | null = {
  id: 'appointment-1',
  customerId: 'customer-1',
  customerPackageId: 'customer-package-1',
  startTime: new Date('2026-10-03T10:00:00.000Z'),
}) {
  return {
    organization: { findFirst: vi.fn().mockResolvedValue({ id: 'org-1' }) },
    appointment: {
      findFirst: vi.fn().mockResolvedValue(appointment),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    customerPackage: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getCustomerPortalAppointments', () => {
  it('limits appointment lookup to future, active visits for every matching customer in the session organization', async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({
      id: 'org-1',
      timezone: 'Europe/Paris',
    } as never)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([{
      id: 'appointment-1',
      startTime: new Date('2026-10-03T10:00:00.000Z'),
      endTime: new Date('2026-10-03T11:00:00.000Z'),
      status: 'CONFIRMED',
      customer: { firstName: 'Camille', lastName: 'Martin' },
      service: { name: 'Coupe' },
      staff: { firstName: 'Alex', lastName: 'Durand' },
    }] as never)

    const result = await getCustomerPortalAppointments({ ...input, now })

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        organizationId: 'org-1',
        startTime: { gte: now },
        status: { not: 'CANCELLED' },
        customer: { is: { organizationId: 'org-1', email: 'parent@example.com' } },
      },
      orderBy: { startTime: 'asc' },
    }))
    expect(result).toEqual({
      timezone: 'Europe/Paris',
      appointments: [{
        id: 'appointment-1',
        startTime: new Date('2026-10-03T10:00:00.000Z'),
        endTime: new Date('2026-10-03T11:00:00.000Z'),
        status: 'CONFIRMED',
        customer: { firstName: 'Camille', lastName: 'Martin' },
        service: { name: 'Coupe' },
        staff: { firstName: 'Alex', lastName: 'Durand' },
        canCancel: true,
      }],
    })
  })
})

describe('cancelCustomerPortalAppointment', () => {
  it('cancels a linked appointment and refunds one package session in the same transaction', async () => {
    const transaction = transactionFixture()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transaction as never))

    await cancelCustomerPortalAppointment({
      ...input,
      appointmentId: 'appointment-1',
      now,
    })

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    )
    expect(transaction.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'appointment-1',
        organizationId: 'org-1',
        status: { not: 'CANCELLED' },
        customer: { is: { organizationId: 'org-1', email: 'parent@example.com' } },
      },
    }))
    expect(transaction.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'appointment-1',
        organizationId: 'org-1',
        status: { not: 'CANCELLED' },
        startTime: { gt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      }),
      data: { status: 'CANCELLED' },
    }))
    expect(transaction.customerPackage.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'customer-package-1',
        customerId: 'customer-1',
        package: { is: { organizationId: 'org-1' } },
      },
      data: { sessionsRemaining: { increment: 1 } },
    }))
  })

  it('refuses appointments at or inside the 24-hour window without changing their status or package credits', async () => {
    const transaction = transactionFixture({
      id: 'appointment-1',
      customerId: 'customer-1',
      customerPackageId: 'customer-package-1',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transaction as never))

    await expect(cancelCustomerPortalAppointment({
      ...input,
      appointmentId: 'appointment-1',
      now,
    })).rejects.toMatchObject({ status: 409 })

    expect(transaction.appointment.updateMany).not.toHaveBeenCalled()
    expect(transaction.customerPackage.updateMany).not.toHaveBeenCalled()
  })

  it('cancels an appointment without a package and does not modify package credits', async () => {
    const transaction = transactionFixture({
      id: 'appointment-1',
      customerId: 'customer-1',
      customerPackageId: null,
      startTime: new Date('2026-10-03T10:00:00.000Z'),
    })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transaction as never))

    await cancelCustomerPortalAppointment({
      ...input,
      appointmentId: 'appointment-1',
      now,
    })

    expect(transaction.appointment.updateMany).toHaveBeenCalledOnce()
    expect(transaction.customerPackage.updateMany).not.toHaveBeenCalled()
  })

  it('does not refund twice when the appointment is already cancelled or not owned by the verified email', async () => {
    const transaction = transactionFixture(null)
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transaction as never))

    await expect(cancelCustomerPortalAppointment({
      ...input,
      appointmentId: 'appointment-1',
      now,
    })).rejects.toMatchObject({ status: 404 })

    expect(transaction.appointment.updateMany).not.toHaveBeenCalled()
    expect(transaction.customerPackage.updateMany).not.toHaveBeenCalled()
  })
})
