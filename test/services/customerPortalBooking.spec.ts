import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn(), appointment: { findFirst: vi.fn() } },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  createCustomerPortalAppointment,
  getAppointmentConfirmationForCustomer,
} from '@/services/customerPortalBooking.service'
import { prisma } from '@/lib/prisma'

type AppointmentRecord = {
  startTime: Date
  endTime: Date
  staffId: string | null
  status: string
  customerId?: string
}

const organization = {
  id: 'org-1',
  name: 'Atelier',
  slug: 'atelier',
  timezone: 'Europe/Paris',
  portalConfirmationEmailTemplate: 'Rendez-vous {{serviceName}} le {{date}} à {{startTime}}-{{endTime}}',
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
  appointments?: AppointmentRecord[]
  staff?: typeof staff
}) {
  return {
    organization: { findFirst: vi.fn().mockResolvedValue(organization) },
    service: { findFirst: vi.fn().mockResolvedValue(service) },
    customer: { findFirst: vi.fn().mockResolvedValue({ id: 'customer-1' }) },
    staff: { findMany: vi.fn().mockResolvedValue(input?.staff ?? staff) },
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
  it('allows a booking starting at the exact 60-day boundary', async () => {
    const transaction = transactionFixture()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })

    await createCustomerPortalAppointment({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-12-21T10:00:00.000Z',
      now: new Date('2026-10-22T10:00:00.000Z'),
    })

    expect(transaction.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        startTime: new Date('2026-12-21T10:00:00.000Z'),
      }),
    }))
  })

  it('rejects a booking after the 60-day window before loading booking data', async () => {
    const transaction = transactionFixture()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })

    await expect(createCustomerPortalAppointment({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-12-21T10:00:01.000Z',
      now: new Date('2026-10-22T10:00:00.000Z'),
    })).rejects.toMatchObject({
      status: 400,
      message: 'La date est au-delà de la période de réservation de 60 jours.',
    })

    expect(transaction.service.findFirst).not.toHaveBeenCalled()
    expect(transaction.appointment.create).not.toHaveBeenCalled()
  })

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

  it('rejects a stale slot for the same customer after a booking with another practitioner', async () => {
    const transaction = transactionFixture({
      staff: [
        { id: 'staff-1', firstName: 'Alex', lastName: 'Martin' },
        { id: 'staff-2', firstName: 'Sam', lastName: 'Durand' },
      ],
    })
    transaction.appointment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        startTime: new Date('2026-10-01T08:00:00.000Z'),
        endTime: new Date('2026-10-01T09:00:00.000Z'),
        staffId: 'staff-1',
        status: 'CONFIRMED',
        customerId: 'customer-1',
      }])
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })

    const booking = {
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
      now: new Date('2026-09-30T12:00:00.000Z'),
    }
    await createCustomerPortalAppointment({ ...booking, staffId: 'staff-1' })

    await expect(createCustomerPortalAppointment({ ...booking, staffId: 'staff-2' }))
      .rejects.toMatchObject({ status: 409 })

    expect(transaction.appointment.create).toHaveBeenCalledOnce()
  })

  it('allows another customer to book the same time with another practitioner', async () => {
    const transaction = transactionFixture({
      appointments: [{
        startTime: new Date('2026-10-01T08:00:00.000Z'),
        endTime: new Date('2026-10-01T09:00:00.000Z'),
        staffId: 'staff-1',
        status: 'CONFIRMED',
        customerId: 'customer-2',
      }],
      staff: [
        { id: 'staff-1', firstName: 'Alex', lastName: 'Martin' },
        { id: 'staff-2', firstName: 'Sam', lastName: 'Durand' },
      ],
    })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })

    await expect(createCustomerPortalAppointment({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      staffId: 'staff-2',
      start: '2026-10-01T08:00:00.000Z',
      now: new Date('2026-09-30T12:00:00.000Z'),
    })).resolves.toMatchObject({ appointment: { id: 'appointment-1' } })

    expect(transaction.appointment.create).toHaveBeenCalledOnce()
  })

  it('keeps one booking when the same customer submits concurrently for two practitioners', async () => {
    const practitioners = [
      { id: 'staff-1', firstName: 'Alex', lastName: 'Martin' },
      { id: 'staff-2', firstName: 'Sam', lastName: 'Durand' },
    ]
    const committedAppointments: AppointmentRecord[] = []
    let revision = 0

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const revisionAtStart = revision
      const transaction = transactionFixture({
        appointments: [...committedAppointments],
        staff: practitioners,
      })
      const pendingAppointments: AppointmentRecord[] = []
      transaction.appointment.create.mockImplementation(async () => {
        pendingAppointments.push({
          startTime: new Date('2026-10-01T08:00:00.000Z'),
          endTime: new Date('2026-10-01T09:00:00.000Z'),
          staffId: 'staff-1',
          status: 'CONFIRMED',
          customerId: 'customer-1',
        })
        return {
          id: 'appointment-1',
          startTime: new Date('2026-10-01T08:00:00.000Z'),
          endTime: new Date('2026-10-01T09:00:00.000Z'),
          createdAt: new Date('2026-09-30T12:00:00.000Z'),
        }
      })

      const result = await callback(transaction as never)
      if (revision !== revisionAtStart) {
        throw Object.assign(new Error('serialization failure'), { code: 'P2034' })
      }

      committedAppointments.push(...pendingAppointments)
      revision += pendingAppointments.length
      return result
    })

    const booking = {
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
      now: new Date('2026-09-30T12:00:00.000Z'),
    }
    const results = await Promise.allSettled([
      createCustomerPortalAppointment({ ...booking, staffId: 'staff-1' }),
      createCustomerPortalAppointment({ ...booking, staffId: 'staff-2' }),
    ])
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatchObject({ status: 409 })
    expect(committedAppointments).toHaveLength(1)
    expect(prisma.$transaction).toHaveBeenCalledTimes(3)
  })

  it('loads the custom confirmation template only for the verified appointment organization', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'appointment-1',
      startTime: new Date('2026-10-01T08:00:00.000Z'),
      endTime: new Date('2026-10-01T09:00:00.000Z'),
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
      service: { name: 'Coupe' },
      organization: {
        name: 'Atelier',
        slug: 'atelier',
        timezone: 'Europe/Paris',
        portalConfirmationEmailTemplate: 'Rendez-vous {{serviceName}} le {{date}} à {{startTime}}-{{endTime}}',
      },
    } as never)

    await expect(getAppointmentConfirmationForCustomer({
      appointmentId: 'appointment-1',
      organizationId: 'org-1',
      verifiedEmail: 'client@example.test',
    })).resolves.toMatchObject({
      organizationSlug: 'atelier',
      appointment: {
        confirmationEmailTemplate: 'Rendez-vous {{serviceName}} le {{date}} à {{startTime}}-{{endTime}}',
      },
    })
    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'appointment-1',
        organizationId: 'org-1',
      }),
      select: expect.objectContaining({
        organization: { select: expect.objectContaining({ portalConfirmationEmailTemplate: true }) },
      }),
    }))
  })
})
