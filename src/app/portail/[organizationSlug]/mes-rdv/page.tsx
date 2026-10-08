import PortalAppointments from '@/components/customer-portal/PortalAppointments'
import PortalBrandIdentity from '@/components/customer-portal/PortalBrandIdentity'
import { notFound } from 'next/navigation'
import { findEnabledPortalAppointmentOrganization } from '@/services/customerPortal.service'

export default async function PortalAppointmentsPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const organization = await findEnabledPortalAppointmentOrganization(organizationSlug)
  if (!organization) notFound()

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <PortalBrandIdentity organizationName={organization.name} branding={organization} />
      </div>
      <PortalAppointments
        organizationSlug={organizationSlug}
        organizationTimezone={organization.timezone}
      />
    </>
  )
}
