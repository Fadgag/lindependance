import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { CreateAppointmentSchema, CreateAppointmentInput } from '@/schemas/appointments'

export async function createAppointmentForOrg(payload: CreateAppointmentInput, organizationId: string) {
  // Validate payload via Zod
  const parsed = CreateAppointmentSchema.safeParse(payload)
  if (!parsed.success) {
    // normalize error for caller
    throw new Error('Invalid appointment payload')
  }

  await prisma.appointment.create({
    data: {
      startTime: new Date(parsed.data.start),
      endTime: new Date(parsed.data.end),
      duration: parsed.data.duration,
      serviceId: parsed.data.serviceId,
      customerId: parsed.data.customerId,
      note: parsed.data.note ?? null,
      organizationId,
    },
  })

  try {
    revalidatePath('/')
    revalidatePath('/agenda')
  } catch {
    // ignore
  }

  return { success: true }
}


