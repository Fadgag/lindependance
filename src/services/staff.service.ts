import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { sendCustomerPortalDisabledEmail } from '@/services/customerPortalEmail.service'

export async function listOrganizationStaff(organizationId: string) {
  return prisma.staff.findMany({
    where: { organizationId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, active: true },
  })
}

export async function createOrganizationStaff(input: {
  organizationId: string
  firstName: string
  lastName: string
}) {
  return prisma.staff.create({
    data: {
      organizationId: input.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: { id: true, firstName: true, lastName: true, active: true },
  })
}

export async function updateOrganizationStaff(input: {
  id: string
  organizationId: string
  firstName: string
  lastName: string
  active?: boolean
}) {
  const outcome = await prisma.$transaction(async (transaction) => {
    const practitioner = await transaction.staff.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
      select: { id: true },
    })
    if (!practitioner) return { status: 'not_found' as const }

    const updated = await transaction.staff.updateMany({
      where: { id: input.id, organizationId: input.organizationId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    })
    if (updated.count !== 1) return { status: 'not_found' as const }

    const portalShutdown = input.active === false
      ? await disablePortalIfNoActivePractitioners(transaction, input.organizationId)
      : { portalDisabled: false, organizationName: null }
    return { status: 'updated' as const, ...portalShutdown }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  if (outcome.status === 'not_found') {
    return { status: 'not_found' as const }
  }

  const notificationSent = outcome.portalDisabled
    ? await notifyOrganizationAdmins(input.organizationId, outcome.organizationName)
    : null
  return {
    status: 'updated' as const,
    portalDisabled: outcome.portalDisabled,
    notificationSent,
  }
}

export type ArchiveOrganizationStaffResult =
  | { status: 'not_found' }
  | { status: 'confirmation_required'; appointmentCount: number }
  | {
    status: 'archived'
    appointmentCount: number
    portalDisabled: boolean
    notificationSent: boolean | null
  }

async function disablePortalIfNoActivePractitioners(
  transaction: Prisma.TransactionClient,
  organizationId: string,
): Promise<{ portalDisabled: boolean; organizationName: string | null }> {
  const activePractitionerCount = await transaction.staff.count({
    where: { organizationId, active: true },
  })
  if (activePractitionerCount > 0) return { portalDisabled: false, organizationName: null }

  const disabled = await transaction.organization.updateMany({
    where: { id: organizationId, portalEnabled: true },
    data: { portalEnabled: false },
  })
  if (disabled.count !== 1) return { portalDisabled: false, organizationName: null }

  const organization = await transaction.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  })
  if (!organization) throw new Error('Organization missing after portal deactivation')

  return { portalDisabled: true, organizationName: organization.name }
}

async function notifyOrganizationAdmins(
  organizationId: string,
  organizationName: string | null,
): Promise<boolean> {
  if (!organizationName) {
    logger.error('Could not notify organization admins: organization name missing', organizationId)
    return false
  }

  try {
    const admins = await prisma.user.findMany({
      where: { organizationId, role: 'ADMIN', email: { not: null } },
      select: { email: true },
    })
    const emails = admins.flatMap((admin) => admin.email ? [admin.email] : [])
    if (emails.length === 0) {
      logger.warn('Portal was disabled but no organization admin email is configured', organizationId)
      return false
    }

    const deliveries = await Promise.allSettled(emails.map((to) => (
      sendCustomerPortalDisabledEmail({ to, organizationName })
    )))
    let allDelivered = true
    deliveries.forEach((delivery, index) => {
      if (delivery.status === 'rejected') {
        allDelivered = false
        logger.error('Failed to notify organization admin about portal deactivation', {
          organizationId,
          email: emails[index],
          error: delivery.reason,
        })
      }
    })
    return allDelivered
  } catch (error: unknown) {
    logger.error('Failed to load organization admins for portal deactivation notification', {
      organizationId,
      error,
    })
    return false
  }
}

export async function archiveOrganizationStaff(input: {
  id: string
  organizationId: string
  expectedAppointmentCount?: number
}): Promise<ArchiveOrganizationStaffResult> {
  const outcome = await prisma.$transaction(async (transaction) => {
    const practitioner = await transaction.staff.findFirst({
      where: { id: input.id, organizationId: input.organizationId, active: true },
      select: { id: true },
    })
    if (!practitioner) return { status: 'not_found' as const }

    const appointmentCount = await transaction.appointment.count({
      where: { staffId: input.id, organizationId: input.organizationId },
    })
    if (
      appointmentCount > 0
      && input.expectedAppointmentCount !== appointmentCount
    ) {
      return { status: 'confirmation_required' as const, appointmentCount }
    }

    const archived = await transaction.staff.updateMany({
      where: { id: input.id, organizationId: input.organizationId, active: true },
      data: { active: false },
    })
    if (archived.count !== 1) return { status: 'not_found' as const }
    const portalShutdown = await disablePortalIfNoActivePractitioners(
      transaction,
      input.organizationId,
    )
    return { status: 'archived' as const, appointmentCount, ...portalShutdown }
  }, { isolationLevel: 'Serializable' })

  if (outcome.status !== 'archived') return outcome

  const notificationSent = outcome.portalDisabled
    ? await notifyOrganizationAdmins(input.organizationId, outcome.organizationName)
    : null
  return {
    status: 'archived',
    appointmentCount: outcome.appointmentCount,
    portalDisabled: outcome.portalDisabled,
    notificationSent,
  }
}
