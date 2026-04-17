import { auth } from '@/auth'
import { getDashboardDetails } from '@/services/dashboard.service'
import { z } from 'zod'
import DetailsFilterBar from '@/components/dashboard/DetailsFilterBar'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function DetailsPage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; to?: string | string[]; start?: string | string[]; end?: string | string[]; filter?: string | string[]; status?: string | string[] }> }) {
  const resolvedParams = await searchParams
  const session = await auth()
  // Guard: ensure session and organizationId. Use a single guarded block that returns early after redirect.
  if (!session?.user?.organizationId) {
    redirect('/auth/signin')
    return null
  }
  const orgId = session.user.organizationId as string

  // Next.js can pass searchParams values as string | string[]; coerce to string before validation
  const coerceToString = (v: unknown) => (Array.isArray(v) ? v[0] : v)

  // Normalize incoming params: accept both `start`/`end` (used by other components)
  // and `from`/`to`. Also make `status` case-insensitive by lowercasing it
  const rawParams = resolvedParams || {}
  const startRaw = coerceToString(rawParams.start ?? rawParams.from)
  const endRaw = coerceToString(rawParams.end ?? rawParams.to)
  const filterRaw = coerceToString(rawParams.filter)
  const statusRaw = coerceToString(rawParams.status)

  const normalizedParams = {
    from: startRaw ?? undefined,
    to: endRaw ?? undefined,
    filter: filterRaw ?? undefined,
    // ensure case-insensitive handling for status
    status: typeof statusRaw === 'string' ? statusRaw.toLowerCase() : undefined
  }

  const SearchSchema = z.object({
    from: z.string().optional().refine((v) => !v || !isNaN(new Date(v).getTime()), { message: 'Invalid from date' }),
    to: z.string().optional().refine((v) => !v || !isNaN(new Date(v).getTime()), { message: 'Invalid to date' }),
    filter: z.enum(['all', 'services', 'products']).optional(),
    status: z.enum(['all', 'paid']).optional()
  })

  const parsed = SearchSchema.safeParse(normalizedParams)
  if (!parsed.success) {
    // Show an error message instead of silently redirecting — helps debug why params fail
    return (
      <div className="h-full w-full overflow-y-auto bg-[#fafafa] p-8">
        <div className="max-w-xl mx-auto bg-white p-6 rounded-xl border border-red-100">
          <h2 className="text-xl font-bold text-red-600 mb-2">Paramètres invalides</h2>
          <p className="text-sm text-gray-600 mb-4">Les filtres transmis ne sont pas valides.</p>
          <a href="/dashboard" className="text-indigo-600 text-sm underline">← Retour au dashboard</a>
        </div>
      </div>
    )
  }
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const to = parsed.data.to ? new Date(parsed.data.to) : new Date()
  const filter = parsed.data.filter ?? 'all'
  const status = parsed.data.status ?? 'all'
  const onlyPaid = status === 'paid'

  let items, total, totals
  try {
    const res = await getDashboardDetails(orgId, from, to, filter, 1, 50, onlyPaid)
    items = res.items
    total = res.total
    totals = res.totals
  } catch (err: unknown) {
    // Detailed server-side logging in development to help debug Server Component render errors.
    if (process.env.NODE_ENV !== 'production') {
      try {
        // Avoid logging sensitive orgId; log non-sensitive params only
        console.error('[DetailsPage] getDashboardDetails failed', {
          from: from.toISOString?.() ?? String(from),
          to: to.toISOString?.() ?? String(to),
          filter,
          status
        }, err instanceof Error ? { message: err.message, stack: err.stack } : String(err))
      } catch (e) {
        // swallow logging errors
      }
    }
    throw err
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#fafafa] p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Détails des encaissements {onlyPaid ? '— Encaissés' : ''}</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-sm text-gray-500">Affichage {onlyPaid ? 'des rendez‑vous encaissés' : 'de tous les rendez‑vous'} sur la période sélectionnée. ({total} rendez-vous)</p>
          <div className="px-3 py-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700">
            <div className="font-medium">Récapitulatif</div>
            <div className="flex gap-4 mt-1">
              <div>Total TTC: <span className="font-black">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals?.totalAmount ?? 0)}</span></div>
              <div>Prestations: <span className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals?.totalServicesSum ?? 0)}</span></div>
              <div>Ventes: <span className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals?.totalProductsSum ?? 0)}</span></div>
            </div>
          </div>
        </div>
        <Suspense fallback={null}>
          <DetailsFilterBar currentFilter={filter} />
        </Suspense>
        <div className="overflow-x-auto">
          {items.length === 0 && (
            <div className="p-4 mb-4 bg-yellow-50 border border-yellow-100 rounded">
              <p className="text-sm text-yellow-800">Aucun rendez‑vous trouvé pour les filtres sélectionnés.</p>
            </div>
          )}
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


