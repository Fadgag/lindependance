import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  findDefaultEnabledPortalOrganization,
  findEnabledPortalOrganization,
} from '@/services/customerPortal.service'
import { getPortalHostnameFromHeaders } from '@/domain/customer-portal/portalDomains'
import { findCustomerPortalDomainMapping } from '@/services/customerPortalDomains.service'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const requestHeaders = await headers()
  const hostname = getPortalHostnameFromHeaders(requestHeaders)
  const domainMapping = await findCustomerPortalDomainMapping(hostname)

  if (domainMapping.status === 'mapped') {
    if (!domainMapping.organizationSlug) redirect('/auth/signin')
    const organization = await findEnabledPortalOrganization(domainMapping.organizationSlug)
    if (!organization) redirect('/auth/signin')
    redirect(`/portail/${encodeURIComponent(domainMapping.organizationSlug)}/reserver`)
  }

  const organization = await findDefaultEnabledPortalOrganization()
  if (!organization) redirect('/auth/signin')

  redirect(`/portail/${encodeURIComponent(organization.slug)}/reserver`)
}
