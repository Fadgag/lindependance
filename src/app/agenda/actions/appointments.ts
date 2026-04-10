import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { CreateAppointmentSchema, CreateAppointmentInput } from '@/schemas/appointments'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

// Use centralized schema (organizationId must come from session)
export async function createAppointmentAction(input: CreateAppointmentInput) {
  'use server'

  const parseResult = CreateAppointmentSchema.safeParse(input)
  if (!parseResult.success) {
    return { error: 'Données invalides', details: parseResult.error.format() }
  }

  const { start, end, duration, serviceId, customerId, staffId } = parseResult.data
  const startDate = new Date(start)
  const endDate = new Date(end)

  // Resolve organizationId from the authenticated server session to avoid IDOR
  const session = await auth()
  if (!session || !session.user?.organizationId) {
    return { error: 'Unauthorized' }
  }
  const orgId = session.user.organizationId as string // RAISON: narrowing garanti par la vérification !organizationId ligne 21

  // Récupérer la durée du service si besoin (scoped to organization to avoid IDOR)
  const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId: orgId } })
  if (!service) return { error: 'Service introuvable' }

  // Determine duration to store: prefer explicit duration, else service duration
  const dur = typeof duration === 'number' && Number.isFinite(duration) ? duration : service.durationMinutes

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { error: 'Invalid start or end date' }

  // Determine assigned staff: prefer provided staffId, else fallback to first staff in the org
  let assignedStaffId = staffId
  if (!assignedStaffId) {
    const fallback = await prisma.staff.findFirst({ where: { organizationId: orgId } })
    assignedStaffId = fallback?.id
  }
  if (!assignedStaffId) return { error: 'No staff available to assign' }

  // Anti-overlap : verifier si le staff a un rendez-vous qui chevauche [startDate, endDate)
  // NOTE: use assignedStaffId (never undefined) to avoid Prisma ignoring the filter when staffId is undefined
  const conflict = await prisma.appointment.findFirst({
    where: {
      staffId: assignedStaffId,
      organizationId: orgId,
      AND: [
        { startTime: { lt: endDate } },
        { endTime: { gt: startDate } },
      ],
    },
  })

  if (conflict) {
    return { error: "Ce membre du personnel est déjà occupé sur ce créneau." }
  }

  // Créer le rendez-vous
  const appointment = await prisma.appointment.create({
    data: {
      startTime: startDate,
      endTime: endDate,
      duration: dur,
      serviceId,
      customerId,
      staffId: assignedStaffId,
      organizationId: orgId,
    },
  })

  try {
    revalidatePath('/')
  } catch (e) {
    logger.warn('revalidatePath failed', e)
  }

  return appointment
}

