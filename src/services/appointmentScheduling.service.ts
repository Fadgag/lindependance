import type { Prisma } from '@prisma/client'
import { canDeleteAppointment, findFirstSchedulingConflict } from '@/domain/appointment/policies'
import {
  CustomerPortalHttpError,
  withSerializableRetry,
} from '@/services/customerPortal.service'
import { rejectPendingRequestsForAppointment } from '@/services/appointmentChangeRequests.service'

export type StaffAppointmentInput = {
  organizationId: string
  start: Date
  end: Date
  duration: number
  serviceId: string
  customerId: string
  staffId?: string
  note?: string
  customerPackageId?: string | null
}

const appointmentSelect = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  finalPrice: true,
  price: true,
  serviceId: true,
  customerId: true,
  staffId: true,
  note: true,
  duration: true,
} satisfies Prisma.AppointmentSelect

export async function createStaffAppointment(input: StaffAppointmentInput) {
  return withSerializableRetry(async (transaction) => {
    const [service, customer, staff] = await Promise.all([
      transaction.service.findFirst({
        where: { id: input.serviceId, organizationId: input.organizationId },
        select: { id: true, price: true },
      }),
      transaction.customer.findFirst({
        where: { id: input.customerId, organizationId: input.organizationId },
        select: { id: true },
      }),
      input.staffId
        ? transaction.staff.findFirst({
            where: { id: input.staffId, organizationId: input.organizationId, active: true },
            select: { id: true },
          })
        : Promise.resolve(null),
    ])

    if (!service || !customer || (input.staffId && !staff)) {
      throw new CustomerPortalHttpError(404, 'Service, customer, or practitioner not found')
    }

    const candidate = { startTime: input.start, endTime: input.end }
    const [appointments, unavailabilities] = await Promise.all([
      transaction.appointment.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.staffId
            ? { OR: [{ staffId: input.staffId }, { staffId: null }] }
            : {}),
          status: { not: 'CANCELLED' },
          startTime: { lt: input.end },
          endTime: { gt: input.start },
        },
        select: { startTime: true, endTime: true },
      }),
      transaction.unavailability.findMany({
        where: {
          organizationId: input.organizationId,
          start: { lt: input.end },
          end: { gt: input.start },
        },
        select: { start: true, end: true },
      }),
    ])
    if (
      findFirstSchedulingConflict(candidate, appointments)
      || findFirstSchedulingConflict(candidate, unavailabilities.map(({ start, end }) => ({
        startTime: start,
        endTime: end,
      })))
    ) {
      throw new CustomerPortalHttpError(409, 'Conflit horaire détecté')
    }

    const appointment = await transaction.appointment.create({
      data: {
        startTime: input.start,
        endTime: input.end,
        duration: input.duration,
        note: input.note || null,
        serviceId: input.serviceId,
        customerId: input.customerId,
        staffId: input.staffId,
        organizationId: input.organizationId,
        status: 'CONFIRMED',
        price: service.price,
        bookingSource: 'STAFF',
      },
      select: appointmentSelect,
    })

    if (input.customerPackageId) {
      const packageUpdate = await transaction.customerPackage.updateMany({
        where: {
          id: input.customerPackageId,
          customer: { organizationId: input.organizationId, id: input.customerId },
          sessionsRemaining: { gt: 0 },
        },
        data: { sessionsRemaining: { decrement: 1 } },
      })
      if (packageUpdate.count !== 1) {
        throw new CustomerPortalHttpError(409, 'Forfait indisponible')
      }
    }

    return appointment
  })
}

export async function updateStaffAppointment(input: {
  organizationId: string
  id: string
  start: Date
  end: Date
  duration: number
  serviceId?: string
  customerId?: string
  staffId?: string
  note?: string
}) {
  return withSerializableRetry(async (transaction) => {
    const existing = await transaction.appointment.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
      select: { id: true, staffId: true },
    })
    if (!existing) return null

    const staffId = input.staffId ?? existing.staffId
    const references = await Promise.all([
      input.serviceId
        ? transaction.service.findFirst({
            where: { id: input.serviceId, organizationId: input.organizationId },
            select: { id: true },
          })
        : Promise.resolve(true),
      input.customerId
        ? transaction.customer.findFirst({
            where: { id: input.customerId, organizationId: input.organizationId },
            select: { id: true },
          })
        : Promise.resolve(true),
      input.staffId && input.staffId !== existing.staffId
        ? transaction.staff.findFirst({
            where: { id: input.staffId, organizationId: input.organizationId, active: true },
            select: { id: true },
          })
        : Promise.resolve(true),
    ])
    if (references.some((reference) => !reference)) {
      throw new CustomerPortalHttpError(404, 'Service, customer, or practitioner not found')
    }

    const candidate = { startTime: input.start, endTime: input.end }
    const [appointments, unavailabilities] = await Promise.all([
      transaction.appointment.findMany({
        where: {
          id: { not: input.id },
          organizationId: input.organizationId,
          ...(staffId ? { OR: [{ staffId }, { staffId: null }] } : {}),
          status: { not: 'CANCELLED' },
          startTime: { lt: input.end },
          endTime: { gt: input.start },
        },
        select: { startTime: true, endTime: true },
      }),
      transaction.unavailability.findMany({
        where: {
          organizationId: input.organizationId,
          start: { lt: input.end },
          end: { gt: input.start },
        },
        select: { start: true, end: true },
      }),
    ])
    if (
      findFirstSchedulingConflict(candidate, appointments)
      || findFirstSchedulingConflict(candidate, unavailabilities.map(({ start, end }) => ({
        startTime: start,
        endTime: end,
      })))
    ) {
      throw new CustomerPortalHttpError(409, 'Conflit horaire détecté')
    }

    const updated = await transaction.appointment.updateMany({
      where: { id: input.id, organizationId: input.organizationId },
      data: {
        startTime: input.start,
        endTime: input.end,
        duration: input.duration,
        ...(input.serviceId && { serviceId: input.serviceId }),
        ...(input.customerId && { customerId: input.customerId }),
        ...(input.staffId && { staffId: input.staffId }),
        ...(input.note !== undefined && { note: input.note || null }),
      },
    })
    if (updated.count === 0) return null

    await rejectPendingRequestsForAppointment(transaction, {
      appointmentId: input.id,
      organizationId: input.organizationId,
      now: new Date(),
    })

    return transaction.appointment.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        duration: true,
        serviceId: true,
        customerId: true,
        note: true,
      },
    })
  })
}

export async function deleteStaffAppointment(input: {
  organizationId: string
  id: string
}): Promise<boolean> {
  return withSerializableRetry(async (transaction) => {
    const existing = await transaction.appointment.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
      select: { id: true, status: true, finalPrice: true },
    })
    if (!existing) return false
    if (!canDeleteAppointment(existing)) {
      throw new CustomerPortalHttpError(403, 'Cannot delete a paid appointment')
    }

    await rejectPendingRequestsForAppointment(transaction, {
      appointmentId: input.id,
      organizationId: input.organizationId,
      now: new Date(),
    })
    const deleted = await transaction.appointment.deleteMany({
      where: { id: input.id, organizationId: input.organizationId },
    })
    return deleted.count === 1
  })
}
