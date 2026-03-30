import { prisma } from '../../lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateAppointmentSchema = z.object({
  startTime: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: 'startTime must be a valid ISO date string' }),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  staffId: z.string().min(1),
  organizationId: z.string().min(1),
  title: z.string().optional(),
})

type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>

export async function createAppointmentAction(input: FormData | CreateAppointmentInput) {
  'use server'

  // Normalize input whether it's FormData (from forms) or a plain object
  let payload: any
  if (typeof (input as FormData).get === 'function') {
    const fd = input as FormData
    payload = {
      startTime: fd.get('startTime')?.toString() ?? '',
      serviceId: fd.get('serviceId')?.toString() ?? '',
      customerId: fd.get('customerId')?.toString() ?? '',
      staffId: fd.get('staffId')?.toString() ?? '',
      organizationId: fd.get('organizationId')?.toString() ?? '',
      title: fd.get('title')?.toString() ?? undefined,
    }
  } else {
    payload = input as CreateAppointmentInput
  }

  const parseResult = CreateAppointmentSchema.safeParse(payload)
  if (!parseResult.success) {
    return { error: 'Données invalides', details: parseResult.error.format() }
  }

  const { startTime, serviceId, customerId, staffId, organizationId, title } = parseResult.data

  const start = new Date(startTime)

  // Récupérer la durée du service
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) return { error: "Service introuvable" }

  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000)

  // Anti-overlap : verifier si le staff a un rendez-vous qui chevauche [start, end)
  const conflict = await prisma.appointment.findFirst({
    where: {
      staffId,
      organizationId,
      AND: [
        { startTime: { lt: end } },
        { endTime: { gt: start } },
      ],
    },
  })

  if (conflict) {
    return { error: "Ce membre du personnel est déjà occupé sur ce créneau." }
  }

  // Créer le rendez-vous
  const appointment = await prisma.appointment.create({
    data: {
      startTime: start,
      endTime: end,
      serviceId,
      customerId,
      staffId,
      organizationId,
      // title isn't a field on the schema; if you want to store it, extend the schema.
    },
  })

  // Révalider la page racine pour rafraîchir les données (calendrier)
  try {
    revalidatePath('/')
  } catch (e) {
    // revalidation best-effort, ignore errors
    console.warn('revalidatePath failed', e)
  }

  return appointment
}

