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

const organizationA = { id: 'org-test-a', slug: 'salon-test-a' }
const organizationB = { id: 'org-test-b', slug: 'salon-test-b' }
const identity = {
  organizationId: organizationA.id,
  verifiedEmail: 'synthetic-customer@example.test',
}
const input = { ...identity, organizationSlug: organizationA.slug }
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
    organization: { findFirst: vi.fn().mockResolvedValue({ id: organizationA.id }) },
    appointmentChangeRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
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
  it('limits appointment lookup to the requested session organization and verified email', async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({
      id: organizationA.id,
      timezone: 'Europe/Paris',
    } as never)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([{
      id: 'appointment-1',
      startTime: new Date('2026-10-03T10:00:00.000Z'),
      endTime: new Date('2026-10-03T11:00:00.000Z'),
      status: 'CONFIRMED',
      serviceId: 'service-1',
      staffId: 'staff-1',
      customer: { firstName: 'Camille', lastName: 'Martin' },
      service: { name: 'Coupe' },
      staff: { firstName: 'Alex', lastName: 'Durand' },
      changeRequests: [],
    }] as never)

    const result = await getCustomerPortalAppointments({ ...input, now })

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        organizationId: organizationA.id,
        startTime: { gte: now },
        status: { not: 'CANCELLED' },
        customer: { is: { organizationId: organizationA.id, email: identity.verifiedEmail } },
      },
      orderBy: { startTime: 'asc' },
    }))
    expect(prisma.organization.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: organizationA.id,
        slug: organizationA.slug,
        portalEnabled: true,
        staff: { some: { active: true } },
      },
    }))
    expect(result).toEqual({
      timezone: 'Europe/Paris',
      appointments: [{
        id: 'appointment-1',
        startTime: new Date('2026-10-03T10:00:00.000Z'),
        endTime: new Date('2026-10-03T11:00:00.000Z'),
        status: 'CONFIRMED',
        serviceId: 'service-1',
        staffId: 'staff-1',
        customer: { firstName: 'Camille', lastName: 'Martin' },
        service: { name: 'Coupe' },
        staff: { firstName: 'Alex', lastName: 'Durand' },
        canCancel: true,
        changeRequest: null,
      }],
    })
  })

  it('does not query appointments when an organization A session requests organization B', async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)

    await expect(getCustomerPortalAppointments({
      ...input,
      organizationSlug: organizationB.slug,
    })).rejects.toMatchObject({ status: 404 })

    expect(prisma.organization.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: organizationA.id,
        slug: organizationB.slug,
      }),
    }))
    expect(prisma.appointment.findMany).not.toHaveBeenCalled()
  })
})

describe('cancelCustomerPortalAppointment', () => {
  it('cancels a linked appointment and refunds one package session in the same transaction', async () => {
    const transaction = transactionFixture()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transaction as never))

    await cancelCustomerPortalAppointment({
      ...identity,
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
        organizationId: organizationA.id,
        status: { not: 'CANCELLED' },
        customer: { is: { organizationId: organizationA.id, email: identity.verifiedEmail } },
      },
    }))
    expect(transaction.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'appointment-1',
        organizationId: organizationA.id,
        status: { not: 'CANCELLED' },
        startTime: { gt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      }),
      data: { status: 'CANCELLED' },
    }))
    expect(transaction.customerPackage.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'customer-package-1',
        customerId: 'customer-1',
        package: { is: { organizationId: organizationA.id } },
      },
      data: { sessionsRemaining: { increment: 1 } },
    }))
    expect(transaction.appointmentChangeRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        appointmentId: 'appointment-1',
        organizationId: organizationA.id,
        status: 'PENDING',
      },
      data: expect.objectContaining({
        status: 'REJECTED',
        reviewReason: 'Rendez-vous annulé par le client',
      }),
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
      ...identity,
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
      ...identity,
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
      ...identity,
      appointmentId: 'appointment-1',
      now,
    })).rejects.toMatchObject({ status: 404 })

    expect(transaction.appointment.updateMany).not.toHaveBeenCalled()
    expect(transaction.customerPackage.updateMany).not.toHaveBeenCalled()
  })
})
