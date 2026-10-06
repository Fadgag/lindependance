import { redirect } from 'next/navigation'
import IssueReportsDashboard from '@/components/issue-reports/IssueReportsDashboard'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'

export default async function IssueReportsPage() {
  const access = await getTestCampaignAdminAccess()
  if (!access.authorized && access.status === 401) redirect('/auth/signin')
  if (!access.authorized) {
    return <main className="p-8"><p role="alert">Accès réservé aux administrateurs techniques.</p></main>
  }
  return <IssueReportsDashboard />
}
