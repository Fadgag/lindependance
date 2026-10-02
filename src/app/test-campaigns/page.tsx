import { redirect } from 'next/navigation'
import TestCampaignDashboard from '@/components/test-feedback/TestCampaignDashboard'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'

export default async function TestCampaignsPage() {
  const access = await getTestCampaignAdminAccess()
  if (!access.authorized && access.status === 401) redirect('/auth/signin')
  if (!access.authorized) {
    return <main className="p-8"><p role="alert">Accès réservé aux administrateurs techniques.</p></main>
  }
  return <TestCampaignDashboard />
}
