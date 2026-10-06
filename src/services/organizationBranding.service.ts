import { prisma } from '@/lib/prisma'
import {
  type OrganizationBranding,
  type OrganizationBrandingUpdate,
  organizationBrandingSchema,
} from '@/domain/branding/logoSettings'

export async function getOrganizationBranding(organizationId: string): Promise<OrganizationBranding> {
  const branding = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, logoDataUrl: true, logoShape: true, logoSize: true, showNameWithLogo: true },
  })

  if (!branding) throw new Error('Organization branding not found')
  return organizationBrandingSchema.parse({
    organizationName: branding.name,
    logoDataUrl: branding.logoDataUrl,
    logoShape: branding.logoShape,
    logoSize: branding.logoSize,
    showNameWithLogo: branding.showNameWithLogo,
  })
}

export async function updateOrganizationBranding(
  organizationId: string,
  update: OrganizationBrandingUpdate,
): Promise<OrganizationBranding> {
  const { organizationName, ...brandingUpdate } = update
  const branding = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...brandingUpdate,
      ...(organizationName === undefined ? {} : { name: organizationName }),
    },
    select: { name: true, logoDataUrl: true, logoShape: true, logoSize: true, showNameWithLogo: true },
  })

  return organizationBrandingSchema.parse({
    organizationName: branding.name,
    logoDataUrl: branding.logoDataUrl,
    logoShape: branding.logoShape,
    logoSize: branding.logoSize,
    showNameWithLogo: branding.showNameWithLogo,
  })
}
