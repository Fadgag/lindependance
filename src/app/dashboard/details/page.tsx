import { auth } from '@/auth'
import { getDashboardDetails } from '@/services/dashboard.service'
import { z } from 'zod'
import DetailsFilterBar from '@/components/dashboard/DetailsFilterBar'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DetailsPage({ searchParams }: { searchParams: { from?: string; to?: string; filter?: string } }) {
  const session = await auth()
  // Guard: ensure session and organizationId. Use a single guarded block that returns early after redirect.
  if (!session?.user?.organizationId) {
    redirect('/auth/signin')
    return null
  }
  const orgId = session.user.organizationId as string

  const SearchSchema = z.object({
    from: z.string().optional().refine(v => !v || !isNaN(new Date(v).getTime()), { message: 'Invalid from date' }),
    to: z.string().optional().refine(v => !v || !isNaN(new Date(v).getTime()), { message: 'Invalid to date' }),
    filter: z.enum(['all', 'services', 'products']).optional()
  })
  const parsed = SearchSchema.safeParse(searchParams || {})
  if (!parsed.success) {
    // If the search params are invalid, redirect back to dashboard
    redirect('/dashboard')
    return null
  }
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const to = parsed.data.to ? new Date(parsed.data.to) : new Date()
  const filter = parsed.data.filter ?? 'all'

  const { items } = await getDashboardDetails(orgId, from, to, filter)

  return (
    <div className="h-full w-full overflow-y-auto bg-[#fafafa] p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Détails des encaissements</h2>
        <DetailsFilterBar currentFilter={filter as 'all'|'services'|'products'} />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-500">
                <th className="py-2">Date</th>
                <th>Client</th>
                <th>Prestation</th>
                <th>Produits</th>
                <th className="text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.appointmentId} className="border-t">
                  <td className="py-3 text-sm text-gray-600">{new Date(it.date).toLocaleString()}</td>
                  <td className="py-3">{it.clientName}</td>
                  <td className="py-3">{it.serviceName}</td>
                  <td className="py-3">{it.products.map(p => `${p.name ?? 'Produit'} x${p.quantity ?? 1}`).join(', ') || '—'}</td>
                  <td className="py-3 text-right font-black">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(it.totalTTC)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


