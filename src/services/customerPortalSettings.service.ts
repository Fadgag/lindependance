import { Prisma } from '@prisma/client'
import { getPortalActivationIssue } from '@/domain/customer-portal/portalAvailability'
import { prisma } from '@/lib/prisma'

export type CustomerPortalSettingsInput = {
  slug: string | null
  portalEnabled: boolean
  timezone: string
  portalContactPhone: string | null
  portalContactEmail: string | null
}

export type CustomerPortalSettings = CustomerPortalSettingsInput & {
  activePractitionerCount: number
}

export async function getOrganizationPortalSettings(
  organizationId: string,
): Promise<CustomerPortalSettings | null> {
  const settings = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      portalEnabled: true,
      timezone: true,
      portalContactPhone: true,
      portalContactEmail: true,
    },
  })
  if (!settings) return null

  const activePractitionerCount = await prisma.staff.count({
    where: { organizationId, active: true },
  })
  return { ...settings, activePractitionerCount }
}

export type UpdateCustomerPortalSettingsResult =
  | { status: 'not_found' }
  | { status: 'practitioner_required' | 'contact_required' }
  | { status: 'updated'; settings: CustomerPortalSettings }

export async function updateOrganizationPortalSettings(input: {
  organizationId: string
  settings: CustomerPortalSettingsInput
}): Promise<UpdateCustomerPortalSettingsResult> {
  return prisma.$transaction(async (transaction) => {
    const organization = await transaction.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, portalEnabled: true },
    })
    if (!organization) return { status: 'not_found' }

    const activePractitionerCount = await transaction.staff.count({
      where: { organizationId: input.organizationId, active: true },
    })
    if (input.settings.portalEnabled && !organization.portalEnabled) {
      const issue = getPortalActivationIssue({
        activePractitionerCount,
        portalContactPhone: input.settings.portalContactPhone,
        portalContactEmail: input.settings.portalContactEmail,
      })
      if (issue) return { status: issue }
    }

    const settings = await transaction.organization.update({
      where: { id: input.organizationId },
      data: input.settings,
      select: {
        slug: true,
        portalEnabled: true,
        timezone: true,
        portalContactPhone: true,
        portalContactEmail: true,
      },
    })
    return { status: 'updated', settings: { ...settings, activePractitionerCount } }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
