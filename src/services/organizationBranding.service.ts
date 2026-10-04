import { prisma } from '@/lib/prisma'
import {
  type OrganizationBranding,
  type OrganizationBrandingUpdate,
  organizationBrandingSchema,
} from '@/domain/branding/logoSettings'

export async function getOrganizationBranding(organizationId: string): Promise<OrganizationBranding> {
  const branding = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoDataUrl: true, logoShape: true },
  })

  if (!branding) throw new Error('Organization branding not found')
  return organizationBrandingSchema.parse(branding)
}

export async function updateOrganizationBranding(
  organizationId: string,
  update: OrganizationBrandingUpdate,
): Promise<OrganizationBranding> {
  const branding = await prisma.organization.update({
    where: { id: organizationId },
    data: update,
    select: { logoDataUrl: true, logoShape: true },
  })

  return organizationBrandingSchema.parse(branding)
}
