import PortalAppointments from '@/components/customer-portal/PortalAppointments'
import { notFound } from 'next/navigation'
import { findEnabledPortalOrganization } from '@/services/customerPortal.service'

export default async function PortalAppointmentsPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const organization = await findEnabledPortalOrganization(organizationSlug)
  if (!organization) notFound()

  return (
    <PortalAppointments
      organizationSlug={organizationSlug}
      organizationTimezone={organization.timezone}
    />
  )
}
