import type { PortalDomainMapping } from '@/domain/customer-portal/portalDomains'
import { normalizePortalHostname } from '@/domain/customer-portal/portalDomains'
import { prisma } from '@/lib/prisma'

export class CustomerPortalDomainConfigurationError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'CustomerPortalDomainConfigurationError'
  }
}

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === 'object'
    && 'code' in error
    && error.code === code
}

export async function findCustomerPortalDomainMapping(
  hostname: string | null,
): Promise<PortalDomainMapping> {
  const normalizedHostname = hostname ? normalizePortalHostname(hostname) : null
  if (!normalizedHostname) return { status: 'unmapped' }

  const mapping = await prisma.customerPortalDomain.findUnique({
    where: { hostname: normalizedHostname },
    select: { organization: { select: { slug: true } } },
  })
  if (!mapping) return { status: 'unmapped' }
  return { status: 'mapped', organizationSlug: mapping.organization.slug }
}

export async function listTechAdminPortalDomains() {
  const [domains, organizations] = await Promise.all([
    prisma.customerPortalDomain.findMany({
      orderBy: { hostname: 'asc' },
      select: {
        id: true,
        hostname: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
            slug: true,
            portalEnabled: true,
            staff: {
              where: { active: true },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.organization.findMany({
      where: {
        portalEnabled: true,
        slug: { not: null },
        staff: { some: { active: true } },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ])

  return {
    domains: domains.map((domain) => ({
      id: domain.id,
      hostname: domain.hostname,
      organizationId: domain.organizationId,
      organizationName: domain.organization.name,
      organizationSlug: domain.organization.slug,
      portalAvailable: domain.organization.portalEnabled && domain.organization.staff.length > 0,
    })),
    organizations: organizations.flatMap((organization) => (
      organization.slug
        ? [{ id: organization.id, name: organization.name, slug: organization.slug }]
        : []
    )),
  }
}

export async function createTechAdminPortalDomain(input: {
  hostname: string
  organizationId: string
}): Promise<{ id: string; hostname: string }> {
  const hostname = normalizePortalHostname(input.hostname)
  if (!hostname) {
    throw new CustomerPortalDomainConfigurationError(400, 'Saisissez un nom de domaine valide.')
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: input.organizationId,
      portalEnabled: true,
      slug: { not: null },
      staff: { some: { active: true } },
    },
    select: { id: true },
  })
  if (!organization) {
    throw new CustomerPortalDomainConfigurationError(
      400,
      'Le salon choisi n’a pas de portail actif avec un praticien disponible.',
    )
  }

  try {
    return await prisma.customerPortalDomain.create({
      data: { hostname, organizationId: organization.id },
      select: { id: true, hostname: true },
    })
  } catch (error: unknown) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      throw new CustomerPortalDomainConfigurationError(
        409,
        'Ce nom de domaine est déjà associé à un salon.',
      )
    }
    throw error
  }
}

export async function deleteTechAdminPortalDomain(id: string): Promise<boolean> {
  const result = await prisma.customerPortalDomain.deleteMany({ where: { id } })
  return result.count > 0
}
