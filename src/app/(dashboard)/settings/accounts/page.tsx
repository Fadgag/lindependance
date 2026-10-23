import { redirect } from 'next/navigation'
import OrganizationAccountManager from '@/components/settings/OrganizationAccountManager'
import { getOrganizationAdminAccess } from '@/lib/organizationAdminAccess'
import { listOrganizationAccounts } from '@/services/userAccounts.service'

export default async function OrganizationAccountsPage() {
  const access = await getOrganizationAdminAccess()
  if (!access.authorized && access.status === 401) redirect('/auth/signin')
  if (!access.authorized) {
    return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Accès réservé aux administrateurs du salon.</p>
  }
  const accounts = await listOrganizationAccounts(access.organizationId)
  return <OrganizationAccountManager actorId={access.userId} initialAccounts={accounts} />
}
