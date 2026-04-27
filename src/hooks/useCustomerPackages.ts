'use client'
import { useState, useEffect } from 'react'
import { isAbortError } from '@/lib/utils'
import { z } from 'zod'
import type { CustomerPackageSummary } from '@/types/models'

const CustomerPackageResponseSchema = z.array(z.object({
  id: z.string(),
  sessionsRemaining: z.number(),
  package: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
  serviceId: z.string().nullable().optional(),
}))

export interface UseCustomerPackagesReturn {
  customerPackages: CustomerPackageSummary[]
  usePackage: boolean
  setUsePackage: (v: boolean) => void
  selectedCustomerPackageId: string | null
  setSelectedCustomerPackageId: (v: string | null) => void
}

/**
 * Charge les forfaits disponibles pour un client + service donnés.
 * Se réinitialise automatiquement quand le client ou le service change.
 */
export function useCustomerPackages(
  isOpen: boolean,
  customerId: string | undefined,
  serviceId: string,
): UseCustomerPackagesReturn {
  const [customerPackages, setCustomerPackages] = useState<CustomerPackageSummary[]>([])
  const [usePackage, setUsePackage] = useState(false)
  const [selectedCustomerPackageId, setSelectedCustomerPackageId] = useState<string | null>(null)

  useEffect(() => {
    setCustomerPackages([])
    setUsePackage(false)
    setSelectedCustomerPackageId(null)
    if (!isOpen || !customerId || !serviceId) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await fetch(
          `/api/customers/${encodeURIComponent(customerId)}/packages?serviceId=${encodeURIComponent(serviceId)}`,
          { signal: controller.signal, credentials: 'include' }
        )
        if (res.ok) {
          const parsed = CustomerPackageResponseSchema.safeParse(await res.json())
          // RAISON: l'API retourne CustomerPackage[] — res.json() est unknown, shape vérifiée par Zod
          if (parsed.success) setCustomerPackages(parsed.data as CustomerPackageSummary[])
        }
      } catch (err) {
        if (isAbortError(err)) return
        import('@/lib/clientLogger').then(({ clientError }) => clientError('Erreur chargement forfaits client', err))
      }
    }
    load()
    return () => controller.abort()
  }, [isOpen, customerId, serviceId])

  return { customerPackages, usePackage, setUsePackage, selectedCustomerPackageId, setSelectedCustomerPackageId }
}

