import PortalBooking from '@/components/customer-portal/PortalBooking'
import { notFound } from 'next/navigation'
import { findEnabledPortalOrganization } from '@/services/customerPortal.service'

export default async function PortalBookingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const organization = await findEnabledPortalOrganization(organizationSlug)
  if (!organization) notFound()
  return <PortalBooking organizationSlug={organizationSlug} organizationTimezone={organization.timezone} />
}
