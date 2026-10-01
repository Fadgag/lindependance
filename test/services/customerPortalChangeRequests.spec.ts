import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    organization: { findFirst: vi.fn() },
    appointment: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    appointmentChangeRequest: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    customerPortalRateLimitEvent: { deleteMany: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    staff: { findFirst: vi.fn() },
    unavailability: { findMany: vi.fn() },
  }
  return {
    transactionMock: transaction,
    prismaMock: {
      $transaction: vi.fn(),
      organization: { findUnique: vi.fn() },
      appointmentChangeRequest: { findMany: vi.fn(), updateMany: vi.fn() },
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  approveAppointmentChangeRequest,
  createCustomerPortalChangeRequest,
  getPendingAppointmentChangeRequests,
  rejectAppointmentChangeRequest,
} from '@/services/appointmentChangeRequests.service'
import { prisma } from '@/lib/prisma'

const now = new Date('2026-10-01T08:00:00.000Z')
const identity = {
  organizationId: 'org-1',
  verifiedEmail: 'parent@example.com',
}
const pendingRequest = {
  id: 'request-1',
  appointmentId: 'appointment-1',
  organizationId: 'org-1',
  customerId: 'customer-1',
  requestedStart: new Date('2026-10-04T08:30:00.000Z'),
  requestedEnd: new Date('2026-10-04T09:30:00.000Z'),
  reason: 'Un imprévu',
  status: 'PENDING',
  appointment: {
    id: 'appointment-1',
    startTime: new Date('2026-10-03T08:00:00.000Z'),
    status: 'CONFIRMED',
    staffId: 'staff-1',
    service: { durationMinutes: 60 },
    organization: {
      id: 'org-1',
      timezone: 'Europe/Paris',
      openingTime: '09:00',
      closingTime: '18:00',
    },
  },
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(transactionMock as never))
  transactionMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
  transactionMock.staff.findFirst.mockResolvedValue({ id: 'staff-1' })
  transactionMock.appointment.findFirst.mockResolvedValue({
    id: 'appointment-1',
    customerId: 'customer-1',
    startTime: new Date('2026-10-03T08:00:00.000Z'),
    status: 'CONFIRMED',
    staffId: 'staff-1',
    service: { durationMinutes: 45 },
  })
  transactionMock.appointment.findMany.mockResolvedValue([])
  transactionMock.appointment.updateMany.mockResolvedValue({ count: 1 })
  transactionMock.appointmentChangeRequest.findFirst.mockResolvedValue(null)
  transactionMock.appointmentChangeRequest.findMany.mockResolvedValue([])
  transactionMock.appointmentChangeRequest.create.mockResolvedValue({
    id: 'request-1',
    status: 'PENDING',
  })
  transactionMock.appointmentChangeRequest.updateMany.mockResolvedValue({ count: 1 })
  vi.mocked(prisma.organization.findUnique).mockResolvedValue({
    id: 'org-1',
    timezone: 'Europe/Paris',
  } as never)
  vi.mocked(prisma.appointmentChangeRequest.updateMany).mockResolvedValue({ count: 1 } as never)
  transactionMock.customerPortalRateLimitEvent.deleteMany.mockResolvedValue({ count: 0 })
  transactionMock.customerPortalRateLimitEvent.findMany.mockResolvedValue([])
  transactionMock.customerPortalRateLimitEvent.createMany.mockResolvedValue({ count: 1 })
  transactionMock.unavailability.findMany.mockResolvedValue([])
  process.env.NEXTAUTH_SECRET = 'test-customer-portal-secret'
})

describe('createCustomerPortalChangeRequest', () => {
  it('creates a pending request and derives its end from the persisted service duration', async () => {
    const result = await createCustomerPortalChangeRequest({
      ...identity,
      appointmentId: 'appointment-1',
      requestedStart: '2026-10-04T08:30:00.000Z',
      reason: 'Un imprévu',
      now,
    })

    expect(result).toEqual({ id: 'request-1', status: 'PENDING' })
    expect(transactionMock.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'appointment-1',
        organizationId: 'org-1',
        customer: { is: { organizationId: 'org-1', email: 'parent@example.com' } },
      }),
    }))
    expect(transactionMock.customerPortalRateLimitEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        scope: 'customer-change-request',
        createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    })
    expect(transactionMock.appointmentChangeRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        appointmentId: 'appointment-1',
        customerId: 'customer-1',
        organizationId: 'org-1',
        requestedStart: new Date('2026-10-04T08:30:00.000Z'),
        requestedEnd: new Date('2026-10-04T09:15:00.000Z'),
        reason: 'Un imprévu',
        status: 'PENDING',
      }),
    }))
    expect(transactionMock.appointment.updateMany).not.toHaveBeenCalled()
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    )
  })

  it('refuses another pending request and does not create a duplicate', async () => {
    transactionMock.appointmentChangeRequest.findFirst.mockResolvedValueOnce({ id: 'request-pending' })

    await expect(createCustomerPortalChangeRequest({
      ...identity,
      appointmentId: 'appointment-1',
      requestedStart: '2026-10-04T08:30:00.000Z',
      now,
    })).rejects.toMatchObject({ status: 409 })

    expect(transactionMock.appointmentChangeRequest.create).not.toHaveBeenCalled()
  })

  it('enforces the five requests per rolling 24 hours in the same transaction', async () => {
    transactionMock.customerPortalRateLimitEvent.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        createdAt: new Date(now.getTime() - index * 60_000),
      })),
    )

    await expect(createCustomerPortalChangeRequest({
      ...identity,
      appointmentId: 'appointment-1',
      requestedStart: '2026-10-04T08:30:00.000Z',
      now,
    })).rejects.toMatchObject({ status: 429 })

    expect(transactionMock.customerPortalRateLimitEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        scope: 'customer-change-request',
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      }),
    }))
    expect(transactionMock.appointmentChangeRequest.create).not.toHaveBeenCalled()
  })
})

describe('staff review of appointment change requests', () => {
  beforeEach(() => {
    transactionMock.appointmentChangeRequest.findFirst.mockResolvedValue(pendingRequest)
  })

  it('lists only pending requests for the staff organization', async () => {
    vi.mocked(prisma.appointmentChangeRequest.findMany).mockResolvedValue([] as never)
    await getPendingAppointmentChangeRequests({ organizationId: 'org-1' })

    expect(prisma.appointmentChangeRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org-1', status: 'PENDING' }),
    }))
  })

  it('revalidates the slot in a serializable transaction and moves the original appointment without changing credits', async () => {
    await approveAppointmentChangeRequest({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
      now,
    })

    expect(transactionMock.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { not: 'appointment-1' },
        organizationId: 'org-1',
        OR: [{ staffId: 'staff-1' }, { staffId: null }],
      }),
    }))
    expect(transactionMock.unavailability.findMany).toHaveBeenCalledOnce()
    expect(transactionMock.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'appointment-1',
        organizationId: 'org-1',
        status: { not: 'CANCELLED' },
      }),
      data: {
        startTime: new Date('2026-10-04T08:30:00.000Z'),
        endTime: new Date('2026-10-04T09:30:00.000Z'),
        duration: 60,
      },
    }))
    expect(transactionMock.appointmentChangeRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'request-1', organizationId: 'org-1', status: 'PENDING' },
      data: expect.objectContaining({
        status: 'APPROVED',
        reviewedByUserId: 'staff-user-1',
      }),
    }))
  })

  it('does not change either record when the requested slot now conflicts', async () => {
    transactionMock.appointment.findMany.mockResolvedValue([{
      startTime: new Date('2026-10-04T08:00:00.000Z'),
      endTime: new Date('2026-10-04T09:00:00.000Z'),
      status: 'CONFIRMED',
      staffId: 'staff-1',
    }])

    await expect(approveAppointmentChangeRequest({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
      now,
    })).rejects.toMatchObject({ status: 409 })

    expect(transactionMock.appointment.updateMany).not.toHaveBeenCalled()
    expect(transactionMock.appointmentChangeRequest.updateMany).not.toHaveBeenCalled()
  })

  it('does not approve a slot blocked by an organization-wide unavailability', async () => {
    transactionMock.unavailability.findMany.mockResolvedValue([{
      start: new Date('2026-10-04T08:00:00.000Z'),
      end: new Date('2026-10-04T09:00:00.000Z'),
    }])

    await expect(approveAppointmentChangeRequest({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
      now,
    })).rejects.toMatchObject({ status: 409 })

    expect(transactionMock.appointment.updateMany).not.toHaveBeenCalled()
    expect(transactionMock.appointmentChangeRequest.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a pending request with the staff reason and reviewer', async () => {
    await rejectAppointmentChangeRequest({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
      reviewReason: 'Créneau non disponible',
      now,
    })

    expect(prisma.appointmentChangeRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'request-1', organizationId: 'org-1', status: 'PENDING' },
      data: {
        status: 'REJECTED',
        reviewReason: 'Créneau non disponible',
        reviewedByUserId: 'staff-user-1',
        reviewedAt: now,
      },
    })
  })
})
