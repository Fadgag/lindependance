import { redirect } from 'next/navigation'
import { findDefaultEnabledPortalOrganization } from '@/services/customerPortal.service'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const organization = await findDefaultEnabledPortalOrganization()
  if (!organization) redirect('/auth/signin')

  redirect(`/portail/${encodeURIComponent(organization.slug)}/reserver`)
}
