import { redirect } from 'next/navigation'
import TestSalonProvisioningCard from '@/components/test-admin/TestSalonProvisioningCard'
import { canProvisionTestSalon } from '@/domain/tech-admin/testSalonProvisioning'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import InitialOrganizationAdminCard from '@/components/test-admin/InitialOrganizationAdminCard'

export default async function TestSalonsPage() {
  const access = await getTestCampaignAdminAccess()
  if (!access.authorized && access.status === 401) redirect('/auth/signin')
  if (!access.authorized) {
    return <main className="p-8"><p role="alert">Accès réservé aux administrateurs techniques.</p></main>
  }
  if (!canProvisionTestSalon({
    vercelEnvironment: process.env.VERCEL_ENV,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
  })) {
    return <main className="p-8"><p role="alert">Cette fonction est disponible uniquement sur l’aperçu de la branche preprod.</p></main>
  }

  return (
    <main className="min-h-full bg-studio-bg px-4 py-8 md:px-10 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-studio-primary">Administration technique</p>
        <h1 className="mt-2 text-3xl font-bold text-studio-text">Salons de test</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-studio-muted">
          Préparez un environnement fictif pour vérifier le portail client et l’isolation entre salons.
        </p>
      </header>
      <InitialOrganizationAdminCard />
      <TestSalonProvisioningCard />
    </main>
  )
}
