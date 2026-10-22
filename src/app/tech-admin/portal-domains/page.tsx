import { redirect } from 'next/navigation'
import CustomerPortalDomainManager from '@/components/test-admin/CustomerPortalDomainManager'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'

export default async function TechAdminPortalDomainsPage() {
  const access = await getTestCampaignAdminAccess()
  if (!access.authorized && access.status === 401) redirect('/auth/signin')
  if (!access.authorized) {
    return <main className="p-8"><p role="alert">Accès réservé aux administrateurs techniques.</p></main>
  }

  return (
    <main className="min-h-full bg-(--studio-bg) px-4 py-8 md:px-10 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--studio-primary)">
          Administration technique
        </p>
        <h1 className="mt-2 text-3xl font-bold text-(--studio-text)">Domaines des portails</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-(--studio-muted)">
          Associez chaque domaine public au portail du salon correspondant.
        </p>
      </header>
      <CustomerPortalDomainManager />
    </main>
  )
}
