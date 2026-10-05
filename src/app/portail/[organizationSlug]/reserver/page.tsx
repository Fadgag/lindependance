import PortalBooking from '@/components/customer-portal/PortalBooking'
import { notFound } from 'next/navigation'
import { findEnabledPortalBookingOrganization } from '@/services/customerPortal.service'

export default async function PortalBookingPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const organization = await findEnabledPortalBookingOrganization(organizationSlug)
  if (!organization) notFound()
  return (
    <PortalBooking
      organizationSlug={organizationSlug}
      organizationTimezone={organization.timezone}
      organizationName={organization.name}
      logoDataUrl={organization.logoDataUrl}
      logoShape={organization.logoShape}
      logoSize={organization.logoSize}
    />
  )
}
