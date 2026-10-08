'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { TechAdminOrganizationsSchema } from '@/schemas/techAdmin'

const STORAGE_KEY = 'tech-admin-selected-organization'

type Organization = typeof TechAdminOrganizationsSchema._output[number]

type TechAdminDomainContextValue = {
  isTechAdmin: boolean
  organizations: Organization[]
  selectedOrganizationIds: string[]
  selectOrganizations: (organizationIds: string[]) => void
  loading: boolean
  error: string
}

const emptyContext: TechAdminDomainContextValue = {
  isTechAdmin: false,
  organizations: [],
  selectedOrganizationIds: [],
  selectOrganizations: () => {},
  loading: false,
  error: '',
}

const TechAdminDomainContext = createContext(emptyContext)

function responseError(body: unknown): string {
  return body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : 'Impossible de charger les domaines.'
}

export function useTechAdminDomain(): TechAdminDomainContextValue {
  return useContext(TechAdminDomainContext)
}

export default function TechAdminDomainProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const isTechAdmin = session?.user?.accountType === 'STAFF' && session.user.role === 'TECH_ADMIN'
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isTechAdmin) {
      setOrganizations([])
      setSelectedOrganizationIds([])
      setLoading(false)
      setError('')
      return
    }

    let active = true
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const response = await fetch('/api/tech-admin/organizations', { cache: 'no-store' })
        const body: unknown = await response.json()
        if (!response.ok) throw new Error(responseError(body))
        const parsed = TechAdminOrganizationsSchema.safeParse(body)
        if (!parsed.success) throw new Error('La liste des domaines reçue est invalide.')
        if (!active) return

        setOrganizations(parsed.data)
        let storedSelection: string | null = null
        try {
          storedSelection = window.localStorage.getItem(STORAGE_KEY)
        } catch {
          setError('Impossible de restaurer les domaines précédemment sélectionnés.')
        }
        let storedValue: unknown = storedSelection
        if (storedSelection) {
          try {
            storedValue = JSON.parse(storedSelection)
          } catch {
            // The previous version stored one organization ID without JSON encoding.
          }
        }
        const storedIds = typeof storedValue === 'string'
          ? [storedValue]
          : Array.isArray(storedValue)
            ? storedValue.filter((id): id is string => typeof id === 'string')
            : []
        const availableIds = new Set(parsed.data.map(({ id }) => id))
        setSelectedOrganizationIds([...new Set(storedIds.filter((id) => availableIds.has(id)))])
      } catch (cause: unknown) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Impossible de charger les domaines.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [isTechAdmin])

  const selectOrganizations = useCallback((organizationIds: string[]) => {
    const availableIds = new Set(organizations.map(({ id }) => id))
    const selectedIds = [...new Set(organizationIds.filter((id) => availableIds.has(id)))]
    setSelectedOrganizationIds(selectedIds)
    setError('')
    try {
      if (selectedIds.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      setError('Les domaines sont sélectionnés, mais ce choix ne pourra pas être conservé.')
    }
  }, [organizations])

  return (
    <TechAdminDomainContext.Provider value={{
      isTechAdmin,
      organizations,
      selectedOrganizationIds,
      selectOrganizations,
      loading,
      error,
    }}>
      {children}
    </TechAdminDomainContext.Provider>
  )
}
