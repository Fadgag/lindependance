import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { createCustomerPortalAppointment } from '@/services/customerPortalBooking.service'
import { prisma } from '@/lib/prisma'

const organization = {
  id: 'org-1',
  name: 'Atelier',
  slug: 'atelier',
  timezone: 'Europe/Paris',
  openingTime: '09:00',
  closingTime: '18:00',
}
const service = {
  id: 'service-1',
  name: 'Coupe',
  durationMinutes: 60,
  price: 50,
}
const staff = [{ id: 'staff-1', firstName: 'Alex', lastName: 'Martin' }]

function transactionFixture(input?: {
  appointments?: Array<{ startTime: Date; endTime: Date; staffId: string | null; status: string }>
}) {
  return {
    organization: { findFirst: vi.fn().mockResolvedValue(organization) },
    service: { findFirst: vi.fn().mockResolvedValue(service) },
    customer: { findFirst: vi.fn().mockResolvedValue({ id: 'customer-1' }) },
    staff: { findMany: vi.fn().mockResolvedValue(staff) },
    appointment: {
      findMany: vi.fn().mockResolvedValue(input?.appointments ?? []),
      create: vi.fn().mockResolvedValue({
        id: 'appointment-1',
        startTime: new Date('2026-10-01T08:00:00.000Z'),
        endTime: new Date('2026-10-01T09:00:00.000Z'),
        createdAt: new Date('2026-09-30T12:00:00.000Z'),
      }),
    },
    unavailability: { findMany: vi.fn().mockResolvedValue([]) },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('createCustomerPortalAppointment', () => {
  it('resolves the customer and practitioner from the session organization and uses persisted service duration', async () => {
    const transaction = transactionFixture()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })

    const result = await createCustomerPortalAppointment({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
      now: new Date('2026-09-30T12:00:00.000Z'),
    })

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    )
    expect(transaction.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'customer-1',
        organizationId: 'org-1',
        email: 'parent@example.com',
      },
    }))
    expect(transaction.staff.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1', active: true },
    }))
    expect(transaction.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        startTime: new Date('2026-10-01T08:00:00.000Z'),
        endTime: new Date('2026-10-01T09:00:00.000Z'),
        duration: 60,
        price: 50,
        bookingSource: 'PORTAL',
        organizationId: 'org-1',
        customerId: 'customer-1',
        staffId: 'staff-1',
      }),
    }))
    expect(result.appointment.id).toBe('appointment-1')
  })

  it('rejects a conflicting slot inside the serializable transaction without creating a duplicate', async () => {
    const transaction = transactionFixture({
      appointments: [{
        startTime: new Date('2026-10-01T08:30:00.000Z'),
        endTime: new Date('2026-10-01T09:30:00.000Z'),
        staffId: 'staff-1',
        status: 'CONFIRMED',
      }],
    })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })

    await expect(createCustomerPortalAppointment({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
      now: new Date('2026-09-30T12:00:00.000Z'),
    })).rejects.toMatchObject({ status: 409 })

    expect(transaction.appointment.create).not.toHaveBeenCalled()
  })
})
