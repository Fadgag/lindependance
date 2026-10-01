import type { Prisma } from '@prisma/client'
import { canCancelPortalAppointment } from '@/domain/appointment/policies'
import { getSessionRefundAmount } from '@/domain/package/sessionCredit'
import { prisma } from '@/lib/prisma'
import {
  CustomerPortalHttpError,
  withSerializableRetry,
} from '@/services/customerPortal.service'
import { rejectPendingRequestsForAppointment } from '@/services/appointmentChangeRequests.service'

interface CustomerPortalAppointmentIdentity {
  organizationId: string
  verifiedEmail: string
}

export interface CustomerPortalAppointmentSummary {
  id: string
  startTime: Date
  endTime: Date
  status: string
  serviceId: string
  staffId: string | null
  customer: {
    firstName: string
    lastName: string
  }
  service: { name: string }
  staff: {
    firstName: string
    lastName: string
  } | null
  canCancel: boolean
  changeRequest: {
    id: string
    status: string
    reviewReason: string | null
  } | null
}

export async function getCustomerPortalAppointments(input: CustomerPortalAppointmentIdentity & {
  now?: Date
}): Promise<{ timezone: string; appointments: CustomerPortalAppointmentSummary[] }> {
  const now = input.now ?? new Date()
  const organization = await prisma.organization.findFirst({
    where: { id: input.organizationId, portalEnabled: true },
    select: { id: true, timezone: true },
  })
  if (!organization) throw new CustomerPortalHttpError(404, 'Portal not found')

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: organization.id,
      startTime: { gte: now },
      status: { not: 'CANCELLED' },
      customer: {
        is: {
          organizationId: organization.id,
          email: input.verifiedEmail,
        },
      },
    },
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      serviceId: true,
      staffId: true,
      customer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      staff: { select: { firstName: true, lastName: true } },
      changeRequests: {
        where: { organizationId: organization.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, reviewReason: true },
      },
    },
  })

  return {
    timezone: organization.timezone,
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      customer: appointment.customer,
      service: appointment.service,
      staff: appointment.staff,
      canCancel: canCancelPortalAppointment(appointment.startTime, now),
      changeRequest: appointment.changeRequests[0] ?? null,
    })),
  }
}

export async function cancelCustomerPortalAppointment(input: CustomerPortalAppointmentIdentity & {
  appointmentId: string
  now?: Date
}): Promise<void> {
  const now = input.now ?? new Date()
  const cancellationCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  await withSerializableRetry(async (transaction: Prisma.TransactionClient) => {
    const organization = await transaction.organization.findFirst({
      where: { id: input.organizationId, portalEnabled: true },
      select: { id: true },
    })
    if (!organization) throw new CustomerPortalHttpError(404, 'Portal not found')

    const appointment = await transaction.appointment.findFirst({
      where: {
        id: input.appointmentId,
        organizationId: organization.id,
        status: { not: 'CANCELLED' },
        customer: {
          is: {
            organizationId: organization.id,
            email: input.verifiedEmail,
          },
        },
      },
      select: {
        id: true,
        startTime: true,
        customerId: true,
        customerPackageId: true,
      },
    })
    if (!appointment) throw new CustomerPortalHttpError(404, 'Appointment not found')
    if (!canCancelPortalAppointment(appointment.startTime, now)) {
      throw new CustomerPortalHttpError(
        409,
        'L’annulation en ligne n’est possible que plus de 24 heures à l’avance. Contactez votre établissement.',
      )
    }

    const cancelled = await transaction.appointment.updateMany({
      where: {
        id: appointment.id,
        organizationId: organization.id,
        status: { not: 'CANCELLED' },
        startTime: { gt: cancellationCutoff },
        customer: {
          is: {
            organizationId: organization.id,
            email: input.verifiedEmail,
          },
        },
      },
      data: { status: 'CANCELLED' },
    })
    if (cancelled.count !== 1) {
      throw new CustomerPortalHttpError(409, 'Ce rendez-vous ne peut plus être annulé en ligne.')
    }

    await rejectPendingRequestsForAppointment(transaction, {
      appointmentId: appointment.id,
      organizationId: organization.id,
      now,
      reviewReason: 'Rendez-vous annulé par le client',
    })

    if (appointment.customerPackageId) {
      const refunded = await transaction.customerPackage.updateMany({
        where: {
          id: appointment.customerPackageId,
          customerId: appointment.customerId,
          package: { is: { organizationId: organization.id } },
        },
        data: { sessionsRemaining: { increment: getSessionRefundAmount() } },
      })
      if (refunded.count !== 1) {
        throw new Error('Customer package could not be refunded for the cancelled appointment')
      }
    }
  })
}
