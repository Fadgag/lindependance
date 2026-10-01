import { prisma } from '@/lib/prisma'

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
  const updated = await prisma.staff.updateMany({
    where: { id: input.id, organizationId: input.organizationId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  })
  return updated.count === 1
}

export type ArchiveOrganizationStaffResult =
  | { status: 'not_found' }
  | { status: 'confirmation_required'; appointmentCount: number }
  | { status: 'archived'; appointmentCount: number }

export async function archiveOrganizationStaff(input: {
  id: string
  organizationId: string
  expectedAppointmentCount?: number
}): Promise<ArchiveOrganizationStaffResult> {
  return prisma.$transaction(async (transaction): Promise<ArchiveOrganizationStaffResult> => {
    const practitioner = await transaction.staff.findFirst({
      where: { id: input.id, organizationId: input.organizationId, active: true },
      select: { id: true },
    })
    if (!practitioner) return { status: 'not_found' }

    const appointmentCount = await transaction.appointment.count({
      where: { staffId: input.id, organizationId: input.organizationId },
    })
    if (
      appointmentCount > 0
      && input.expectedAppointmentCount !== appointmentCount
    ) {
      return { status: 'confirmation_required', appointmentCount }
    }

    const archived = await transaction.staff.updateMany({
      where: { id: input.id, organizationId: input.organizationId, active: true },
      data: { active: false },
    })
    if (archived.count !== 1) return { status: 'not_found' }
    return { status: 'archived', appointmentCount }
  }, { isolationLevel: 'Serializable' })
}
