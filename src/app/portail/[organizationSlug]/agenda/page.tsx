import PortalAgenda from '@/components/customer-portal/PortalAgenda'
import { notFound } from 'next/navigation'
import { findEnabledPortalOrganization } from '@/services/customerPortal.service'

export default async function PortalAgendaPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const organization = await findEnabledPortalOrganization(organizationSlug)
  if (!organization) notFound()
  return <PortalAgenda organizationSlug={organizationSlug} organizationTimezone={organization.timezone} />
}
