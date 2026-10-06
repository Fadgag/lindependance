import type { Prisma } from '@prisma/client'
import {
  buildAvailableSlots,
  getLocalDateForInstant,
  getUtcRangeForLocalDay,
  resolvePortalStaffSelection,
} from '@/domain/customer-portal/scheduling'
import { prisma } from '@/lib/prisma'
import {
  CustomerPortalHttpError,
  withSerializableRetry,
} from '@/services/customerPortal.service'

export interface CreateCustomerPortalAppointmentInput {
  organizationId: string
  verifiedEmail: string
  customerId: string
  serviceId: string
  staffId?: string
  start: string
  now?: Date
}

export interface CreatedCustomerPortalAppointment {
  appointment: {
    id: string
    startTime: Date
    endTime: Date
    createdAt: Date
  }
  serviceName: string
  organizationName: string
  organizationSlug: string
  timezone: string
  confirmationEmailTemplate: string | null
  email: string
}

export interface CustomerAppointmentConfirmation {
  email: string
  organizationSlug: string
  appointment: {
    id: string
    startTime: Date
    endTime: Date
    createdAt: Date
    serviceName: string
    organizationName: string
    timezone: string
    confirmationEmailTemplate: string | null
  }
}

export async function createCustomerPortalAppointment(
  input: CreateCustomerPortalAppointmentInput,
): Promise<CreatedCustomerPortalAppointment> {
  const now = input.now ?? new Date()
  const startTime = new Date(input.start)
  if (Number.isNaN(startTime.getTime())) {
    throw new CustomerPortalHttpError(400, 'Invalid appointment start time')
  }

  return withSerializableRetry(async (transaction: Prisma.TransactionClient) => {
    const organization = await transaction.organization.findFirst({
      where: {
        id: input.organizationId,
        portalEnabled: true,
        staff: { some: { active: true } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        openingTime: true,
        closingTime: true,
        portalConfirmationEmailTemplate: true,
      },
    })
    if (!organization || !organization.slug) {
      throw new CustomerPortalHttpError(404, 'Portal not found')
    }

    const [service, customer, staff] = await Promise.all([
      transaction.service.findFirst({
        where: { id: input.serviceId, organizationId: organization.id },
        select: { id: true, name: true, durationMinutes: true, price: true },
      }),
      transaction.customer.findFirst({
        where: {
          id: input.customerId,
          organizationId: organization.id,
          email: input.verifiedEmail,
        },
        select: { id: true },
      }),
      transaction.staff.findMany({
        where: { organizationId: organization.id, active: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: { id: true },
      }),
    ])

    if (!service) throw new CustomerPortalHttpError(404, 'Service not found')
    if (!customer) throw new CustomerPortalHttpError(404, 'Customer not found')

    const staffSelection = resolvePortalStaffSelection(
      staff.map((member) => member.id),
      input.staffId,
    )
    if (staffSelection.status === 'unavailable') {
      throw new CustomerPortalHttpError(409, 'No practitioners are available')
    }
    if (staffSelection.status === 'required') {
      throw new CustomerPortalHttpError(400, 'Select a practitioner')
    }
    if (staffSelection.status === 'invalid') {
      throw new CustomerPortalHttpError(400, 'Invalid practitioner')
    }

    const localDate = getLocalDateForInstant(startTime, organization.timezone)
    const range = getUtcRangeForLocalDay(localDate, organization.timezone)
    if (!range) throw new CustomerPortalHttpError(400, 'Invalid organization timezone')

    const [appointments, unavailabilities] = await Promise.all([
      transaction.appointment.findMany({
        where: {
          organizationId: organization.id,
          status: { not: 'CANCELLED' },
          startTime: { lt: range.end },
          endTime: { gt: range.start },
        },
        select: { startTime: true, endTime: true, staffId: true, status: true },
      }),
      transaction.unavailability.findMany({
        where: {
          organizationId: organization.id,
          start: { lt: range.end },
          end: { gt: range.start },
        },
        select: { start: true, end: true },
      }),
    ])

    const slots = buildAvailableSlots({
      date: localDate,
      timezone: organization.timezone,
      openingTime: organization.openingTime,
      closingTime: organization.closingTime,
      durationMinutes: service.durationMinutes,
      slotIntervalMinutes: 30,
      staffId: staffSelection.staffId,
      staffIds: staff.map((member) => member.id),
      appointments,
      unavailabilities: unavailabilities.map((unavailability) => ({
        startTime: unavailability.start,
        endTime: unavailability.end,
      })),
      now,
    })
    const slot = slots.find((candidate) => candidate.start === startTime.toISOString())
    if (!slot) throw new CustomerPortalHttpError(409, 'Time slot is no longer available')

    const appointment = await transaction.appointment.create({
      data: {
        startTime,
        endTime: new Date(slot.end),
        duration: service.durationMinutes,
        price: service.price,
        serviceId: service.id,
        customerId: customer.id,
        staffId: staffSelection.staffId,
        organizationId: organization.id,
        status: 'CONFIRMED',
        bookingSource: 'PORTAL',
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        createdAt: true,
      },
    })

    return {
      appointment,
      serviceName: service.name,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      timezone: organization.timezone,
      confirmationEmailTemplate: organization.portalConfirmationEmailTemplate,
      email: input.verifiedEmail,
    }
  })
}

export async function getAppointmentConfirmationForCustomer(input: {
  appointmentId: string
  organizationId: string
  verifiedEmail: string
}): Promise<CustomerAppointmentConfirmation> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      organizationId: input.organizationId,
      bookingSource: 'PORTAL',
      status: { not: 'CANCELLED' },
      customer: {
        is: {
          organizationId: input.organizationId,
          email: input.verifiedEmail,
        },
      },
      organization: {
        is: {
          id: input.organizationId,
          portalEnabled: true,
          staff: { some: { active: true } },
        },
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      service: { select: { name: true } },
      organization: {
        select: {
          name: true,
          slug: true,
          timezone: true,
          portalConfirmationEmailTemplate: true,
        },
      },
    },
  })
  if (!appointment || !appointment.organization.slug) {
    throw new CustomerPortalHttpError(404, 'Appointment not found')
  }

  return {
    email: input.verifiedEmail,
    organizationSlug: appointment.organization.slug,
    appointment: {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      createdAt: appointment.createdAt,
      serviceName: appointment.service.name,
      organizationName: appointment.organization.name,
      timezone: appointment.organization.timezone,
      confirmationEmailTemplate: appointment.organization.portalConfirmationEmailTemplate,
    },
  }
}
