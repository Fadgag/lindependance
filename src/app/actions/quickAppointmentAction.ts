"use server"

import { auth } from '@/auth'
import type { CreateAppointmentInput } from '@/schemas/appointments'
import { createAppointmentForOrg } from '@/services/appointmentService'

// Server Action wrapper to accept FormData from the client form
export async function createQuickAppointment(formData: FormData): Promise<void> {

  const startRaw = formData.get('start')
  const durationRaw = formData.get('duration')
  const serviceId = formData.get('serviceId')?.toString() || ''
  const customerId = formData.get('customerId')?.toString() || ''
  const note = formData.get('note')?.toString() || undefined

  const duration = Number(durationRaw || 0)
  const start = startRaw?.toString() || ''
  const endDate = new Date(start)
  endDate.setMinutes(endDate.getMinutes() + duration)
  const end = endDate.toISOString()

  const payload: CreateAppointmentInput = {
    start,
    end,
    duration,
    serviceId,
    customerId,
    note,
  }

  // Ensure the user is authenticated and belongs to an organization
  const session = await auth()
  if (!session || !session.user?.organizationId) throw new Error('Unauthorized')

  // RAISON: session.user.organizationId non-null garanti par le guard ligne précédente
  await createAppointmentForOrg(payload, session.user.organizationId!)

  return
}




