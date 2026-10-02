import { redirect } from 'next/navigation'
import TestCampaignDetail from '@/components/test-feedback/TestCampaignDetail'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'

export default async function TestCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const access = await getTestCampaignAdminAccess()
  if (!access.authorized && access.status === 401) redirect('/auth/signin')
  if (!access.authorized) {
    return <main className="p-8"><p role="alert">Accès réservé aux administrateurs techniques.</p></main>
  }
  const { id } = await params
  return <TestCampaignDetail campaignId={id} />
}
