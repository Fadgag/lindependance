import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  findDefaultEnabledPortalOrganization,
  findEnabledPortalOrganization,
} from '@/services/customerPortal.service'
import {
  getPortalHostnameFromHeaders,
  resolvePortalDomainMapping,
} from '@/domain/customer-portal/portalDomains'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const requestHeaders = await headers()
  const hostname = getPortalHostnameFromHeaders(requestHeaders)
  const domainMapping = resolvePortalDomainMapping(
    hostname,
    process.env.CUSTOMER_PORTAL_DOMAIN_MAP,
  )

  if (domainMapping.status === 'mapped') {
    const organization = await findEnabledPortalOrganization(domainMapping.organizationSlug)
    if (!organization) redirect('/auth/signin')
    redirect(`/portail/${encodeURIComponent(domainMapping.organizationSlug)}/reserver`)
  }

  const organization = await findDefaultEnabledPortalOrganization()
  if (!organization) redirect('/auth/signin')

  redirect(`/portail/${encodeURIComponent(organization.slug)}/reserver`)
}
