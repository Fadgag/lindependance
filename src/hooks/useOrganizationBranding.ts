'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { clientError } from '@/lib/clientLogger'
import {
  DEFAULT_ORGANIZATION_BRANDING,
  organizationBrandingSchema,
  type OrganizationBranding,
} from '@/domain/branding/logoSettings'

const cache = new Map<string, { generation: number; branding: OrganizationBranding }>()
const inflightPromises = new Map<string, { generation: number; promise: Promise<OrganizationBranding> }>()
const generations = new Map<string, number>()

function fetchOrganizationBranding(organizationId: string): Promise<OrganizationBranding> {
  const generation = generations.get(organizationId) ?? 0
  const cachedBranding = cache.get(organizationId)
  if (cachedBranding?.generation === generation) return Promise.resolve(cachedBranding.branding)

  const inflightPromise = inflightPromises.get(organizationId)
  if (inflightPromise?.generation === generation) return inflightPromise.promise

  const request = fetch('/api/organization/branding', { credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) throw new Error('Impossible de charger le logo de l’organisation.')
      const parsed = organizationBrandingSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error('Réponse invalide pour le logo de l’organisation.')
      if ((generations.get(organizationId) ?? 0) === generation) {
        cache.set(organizationId, { generation, branding: parsed.data })
      }
      return parsed.data
    })
  const trackedRequest = request
    .finally(() => {
      if (inflightPromises.get(organizationId)?.promise === trackedRequest) {
        inflightPromises.delete(organizationId)
      }
    })
  inflightPromises.set(organizationId, { generation, promise: trackedRequest })
  return trackedRequest
}

function invalidateOrganizationBranding(organizationId: string): void {
  generations.set(organizationId, (generations.get(organizationId) ?? 0) + 1)
  cache.delete(organizationId)
  inflightPromises.delete(organizationId)
}

export function useOrganizationBranding(): OrganizationBranding {
  const { data: session, status } = useSession()
  const organizationId = session?.user?.organizationId ?? null
  const [state, setState] = useState({
    organizationId,
    branding: organizationId ? cache.get(organizationId)?.branding ?? DEFAULT_ORGANIZATION_BRANDING : DEFAULT_ORGANIZATION_BRANDING,
  })

  useEffect(() => {
    let active = true
    let latestRequest = 0
    if (status === 'loading') return () => { active = false }
    if (!organizationId) {
      setState({ organizationId: null, branding: DEFAULT_ORGANIZATION_BRANDING })
      return () => { active = false }
    }

    const loadBranding = () => {
      const requestNumber = ++latestRequest
      fetchOrganizationBranding(organizationId)
        .then((nextBranding) => {
          if (active && latestRequest === requestNumber) {
            setState({ organizationId, branding: nextBranding })
          }
        })
        .catch((error: unknown) => {
          if (active && latestRequest === requestNumber) {
            clientError('Le logo de l’organisation n’a pas pu être chargé.', error)
          }
        })
    }

    loadBranding()
    const refreshBranding = () => {
      invalidateOrganizationBranding(organizationId)
      loadBranding()
    }
    window.addEventListener('organization:branding-updated', refreshBranding)

    return () => {
      active = false
      window.removeEventListener('organization:branding-updated', refreshBranding)
    }
  }, [organizationId, status])

  return state.organizationId === organizationId ? state.branding : DEFAULT_ORGANIZATION_BRANDING
}

export function resetOrganizationBrandingCache(): void {
  cache.clear()
  inflightPromises.clear()
  generations.clear()
}
