import { Prisma, type Prisma as PrismaTypes } from '@prisma/client'
import {
  getAppointmentChangeEndTime,
  isAppointmentChangeApprovable,
  isAppointmentChangeRequestable,
  isAppointmentChangeStartValid,
} from '@/domain/appointment/changeRequests'
import {
  buildAvailableSlots,
  getLocalDateForInstant,
  getUtcRangeForLocalDay,
} from '@/domain/customer-portal/scheduling'
import { getCustomerPortalSecret, hashRateLimitKey } from '@/lib/customerPortalSecurity'
import { prisma } from '@/lib/prisma'
import {
  CustomerPortalHttpError,
  recordPortalRateLimits,
  withSerializableRetry,
} from '@/services/customerPortal.service'

const CHANGE_REQUEST_LIMIT = 5
const CHANGE_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000
const OBSOLETE_REQUEST_REASON = 'RDV modifié directement par l’organisation'

export async function createCustomerPortalChangeRequest(input: {
  appointmentId: string
  organizationId: string
  verifiedEmail: string
  requestedStart: string
  reason?: string
  now?: Date
}): Promise<{ id: string; status: string }> {
  const now = input.now ?? new Date()
  const requestedStart = new Date(input.requestedStart)
  if (Number.isNaN(requestedStart.getTime()) || requestedStart <= now) {
    throw new CustomerPortalHttpError(400, 'Le nouveau créneau doit être dans le futur.')
  }

  try {
    return await withSerializableRetry(async (transaction: PrismaTypes.TransactionClient) => {
      const organization = await transaction.organization.findFirst({
        where: {
          id: input.organizationId,
          portalEnabled: true,
          staff: { some: { active: true } },
        },
        select: { id: true },
      })
      if (!organization) throw new CustomerPortalHttpError(404, 'Portal not found')

      const appointment = await transaction.appointment.findFirst({
        where: {
          id: input.appointmentId,
          organizationId: organization.id,
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
          status: true,
          customerId: true,
          staffId: true,
          service: { select: { durationMinutes: true } },
        },
      })
      if (!appointment) throw new CustomerPortalHttpError(404, 'Appointment not found')
      if (!isAppointmentChangeRequestable({
        startTime: appointment.startTime,
        status: appointment.status,
        staffId: appointment.staffId,
        now,
      })) {
        throw new CustomerPortalHttpError(409, 'Ce rendez-vous ne peut pas être déplacé en ligne.')
      }
      if (!isAppointmentChangeStartValid({
        appointmentStart: appointment.startTime,
        requestedStart,
        now,
      })) {
        throw new CustomerPortalHttpError(400, 'Choisissez un créneau différent du rendez-vous actuel.')
      }

      const pendingRequest = await transaction.appointmentChangeRequest.findFirst({
        where: {
          appointmentId: appointment.id,
          organizationId: organization.id,
          status: 'PENDING',
        },
        select: { id: true },
      })
      if (pendingRequest) {
        throw new CustomerPortalHttpError(409, 'Une demande de changement est déjà en attente.')
      }

      const limitReached = !await recordPortalRateLimits(transaction, [{
        scope: 'customer-change-request',
        keyHash: hashRateLimitKey(
          'customer-change-request',
          `${organization.id}:${input.verifiedEmail}`,
          getCustomerPortalSecret(),
        ),
        limit: CHANGE_REQUEST_LIMIT,
        windowMilliseconds: CHANGE_REQUEST_WINDOW_MS,
      }], now)
      if (limitReached) {
        throw new CustomerPortalHttpError(
          429,
          'Vous avez atteint la limite de 5 demandes de changement sur 24 heures.',
        )
      }

      const request = await transaction.appointmentChangeRequest.create({
        data: {
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          organizationId: organization.id,
          requestedStart,
          requestedEnd: getAppointmentChangeEndTime(
            requestedStart,
            appointment.service.durationMinutes,
          ),
          reason: input.reason ?? null,
          status: 'PENDING',
        },
        select: { id: true, status: true },
      })
      return request
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new CustomerPortalHttpError(409, 'Une demande de changement est déjà en attente.')
    }
    throw error
  }
}

export async function getPendingAppointmentChangeRequests(input: {
  organizationId: string
}): Promise<{
  timezone: string
  requests: Array<{
    id: string
    requestedStart: Date
    requestedEnd: Date
    reason: string | null
    createdAt: Date
    appointment: {
      id: string
      startTime: Date
      endTime: Date
      customer: { firstName: string; lastName: string }
      service: { name: string }
      staff: { firstName: string; lastName: string } | null
    }
  }>
}> {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, timezone: true },
  })
  if (!organization) throw new CustomerPortalHttpError(404, 'Organization not found')

  const requests = await prisma.appointmentChangeRequest.findMany({
    where: {
      organizationId: organization.id,
      status: 'PENDING',
      appointment: { is: { organizationId: organization.id } },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      requestedStart: true,
      requestedEnd: true,
      reason: true,
      createdAt: true,
      appointment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  return {
    timezone: organization.timezone,
    requests: requests.flatMap((request) => {
      if (!request.appointment) return []
      return [{
        id: request.id,
        requestedStart: request.requestedStart,
        requestedEnd: request.requestedEnd,
        reason: request.reason,
        createdAt: request.createdAt,
        appointment: request.appointment,
      }]
    }),
  }
}

function isSlotAvailable(input: {
  requestedStart: Date
  durationMinutes: number
  timezone: string
  openingTime: string
  closingTime: string
  staffId: string
  appointments: Array<{
    startTime: Date
    endTime: Date
    status: string
    staffId: string | null
  }>
  unavailabilities: Array<{ start: Date; end: Date }>
  now: Date
}): boolean {
  const date = getLocalDateForInstant(input.requestedStart, input.timezone)
  const range = getUtcRangeForLocalDay(date, input.timezone)
  if (!range) return false

  const slots = buildAvailableSlots({
    date,
    timezone: input.timezone,
    openingTime: input.openingTime,
    closingTime: input.closingTime,
    durationMinutes: input.durationMinutes,
    slotIntervalMinutes: 30,
    staffId: input.staffId,
    staffIds: [input.staffId],
    appointments: input.appointments,
    unavailabilities: input.unavailabilities.map(({ start, end }) => ({
      startTime: start,
      endTime: end,
    })),
    now: input.now,
  })
  return slots.some((slot) => slot.start === input.requestedStart.toISOString())
}

export async function approveAppointmentChangeRequest(input: {
  requestId: string
  organizationId: string
  reviewerId: string
  now?: Date
}): Promise<void> {
  const now = input.now ?? new Date()
  await withSerializableRetry(async (transaction: PrismaTypes.TransactionClient) => {
    const changeRequest = await transaction.appointmentChangeRequest.findFirst({
      where: {
        id: input.requestId,
        organizationId: input.organizationId,
        status: 'PENDING',
        appointment: { is: { organizationId: input.organizationId } },
      },
      select: {
        id: true,
        status: true,
        requestedStart: true,
        appointment: {
          select: {
            id: true,
            startTime: true,
            status: true,
            staffId: true,
            service: { select: { durationMinutes: true } },
            organization: {
              select: {
                id: true,
                timezone: true,
                openingTime: true,
                closingTime: true,
              },
            },
          },
        },
      },
    })
    const appointment = changeRequest?.appointment
    if (!changeRequest || !appointment) {
      throw new CustomerPortalHttpError(404, 'Pending change request not found')
    }
    if (!isAppointmentChangeApprovable({
      requestStatus: changeRequest.status,
      appointmentStatus: appointment.status,
      appointmentStart: appointment.startTime,
      staffId: appointment.staffId,
      requestedStart: changeRequest.requestedStart,
      now,
    })) {
      throw new CustomerPortalHttpError(409, 'Le créneau demandé n’est plus disponible.')
    }
    const staffId = appointment.staffId
    if (!staffId) throw new CustomerPortalHttpError(409, 'Le praticien du rendez-vous n’est plus disponible.')

    const requestedEnd = getAppointmentChangeEndTime(
      changeRequest.requestedStart,
      appointment.service.durationMinutes,
    )
    const localDate = getLocalDateForInstant(changeRequest.requestedStart, appointment.organization.timezone)
    const range = getUtcRangeForLocalDay(localDate, appointment.organization.timezone)
    if (!range) throw new CustomerPortalHttpError(409, 'Fuseau horaire de l’organisation invalide.')

    const [staff, existingAppointments, unavailabilities] = await Promise.all([
      transaction.staff.findFirst({
        where: {
          id: staffId,
          organizationId: appointment.organization.id,
          active: true,
        },
        select: { id: true },
      }),
      transaction.appointment.findMany({
        where: {
          id: { not: appointment.id },
          organizationId: appointment.organization.id,
          OR: [{ staffId }, { staffId: null }],
          status: { not: 'CANCELLED' },
          startTime: { lt: range.end },
          endTime: { gt: range.start },
        },
        select: { startTime: true, endTime: true, status: true, staffId: true },
      }),
      transaction.unavailability.findMany({
        where: {
          organizationId: appointment.organization.id,
          start: { lt: range.end },
          end: { gt: range.start },
        },
        select: { start: true, end: true },
      }),
    ])
    if (!staff || !isSlotAvailable({
      requestedStart: changeRequest.requestedStart,
      durationMinutes: appointment.service.durationMinutes,
      timezone: appointment.organization.timezone,
      openingTime: appointment.organization.openingTime,
      closingTime: appointment.organization.closingTime,
      staffId,
      appointments: existingAppointments,
      unavailabilities,
      now,
    })) {
      throw new CustomerPortalHttpError(409, 'Le créneau demandé n’est plus disponible.')
    }

    const updatedAppointment = await transaction.appointment.updateMany({
      where: {
        id: appointment.id,
        organizationId: appointment.organization.id,
        status: { notIn: ['CANCELLED', 'PAID'] },
        startTime: { equals: appointment.startTime, gt: now },
      },
      data: {
        startTime: changeRequest.requestedStart,
        endTime: requestedEnd,
        duration: appointment.service.durationMinutes,
      },
    })
    if (updatedAppointment.count !== 1) {
      throw new CustomerPortalHttpError(409, 'Le rendez-vous a changé depuis la demande.')
    }

    const reviewed = await transaction.appointmentChangeRequest.updateMany({
      where: {
        id: changeRequest.id,
        organizationId: appointment.organization.id,
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        reviewedByUserId: input.reviewerId,
        reviewedAt: now,
      },
    })
    if (reviewed.count !== 1) {
      throw new CustomerPortalHttpError(409, 'Cette demande a déjà été traitée.')
    }

  })
}

export async function rejectAppointmentChangeRequest(input: {
  requestId: string
  organizationId: string
  reviewerId: string
  reviewReason?: string
  now?: Date
}): Promise<void> {
  const now = input.now ?? new Date()
  const result = await prisma.appointmentChangeRequest.updateMany({
    where: {
      id: input.requestId,
      organizationId: input.organizationId,
      status: 'PENDING',
    },
    data: {
      status: 'REJECTED',
      reviewReason: input.reviewReason ?? null,
      reviewedByUserId: input.reviewerId,
      reviewedAt: now,
    },
  })
  if (result.count !== 1) {
    throw new CustomerPortalHttpError(404, 'Pending change request not found')
  }
}

export async function rejectPendingRequestsForAppointment(
  transaction: PrismaTypes.TransactionClient,
  input: {
    appointmentId: string
    organizationId: string
    now: Date
    reviewReason?: string
  },
): Promise<void> {
  await transaction.appointmentChangeRequest.updateMany({
    where: {
      appointmentId: input.appointmentId,
      organizationId: input.organizationId,
      status: 'PENDING',
    },
    data: {
      status: 'REJECTED',
      reviewReason: input.reviewReason ?? OBSOLETE_REQUEST_REASON,
      reviewedAt: input.now,
    },
  })
}
