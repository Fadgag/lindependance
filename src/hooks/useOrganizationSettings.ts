'use client'
import { useState, useEffect } from 'react'
import { clientError } from '@/lib/clientLogger'

export interface OrgSettings {
  openingTime: string
  closingTime: string
  dailyTarget?: number
  name?: string
}

const DEFAULT: OrgSettings = { openingTime: '08:00', closingTime: '20:00' }

/** Cache partagé en mémoire pour éviter N appels redondants au montage */
let cache: OrgSettings | null = null
let inflightPromise: Promise<OrgSettings> | null = null

async function fetchSettings(): Promise<OrgSettings> {
  if (inflightPromise) return inflightPromise
  inflightPromise = fetch('/api/organization/settings', { credentials: 'include' })
    .then(res => (res.ok ? res.json() as Promise<OrgSettings> : DEFAULT))
    .catch(() => DEFAULT)
    .finally(() => { inflightPromise = null })
  return inflightPromise
}

/**
 * Hook centralisé pour les paramètres organisation.
 * Un seul fetch au démarrage (partagé via cache en mémoire).
 * Se met à jour automatiquement quand `organization:settings-updated` est émis.
 */
export function useOrganizationSettings(): OrgSettings {
  const [settings, setSettings] = useState<OrgSettings>(cache ?? DEFAULT)

  useEffect(() => {
    let active = true
    if (!cache) {
      fetchSettings().then(data => {
        cache = data
        if (active) setSettings(data)
      }).catch(err => clientError('useOrganizationSettings fetch failed', err))
    }

    const handler = () => {
      fetchSettings().then(data => {
        cache = data
        if (active) setSettings(data)
      }).catch(err => clientError('useOrganizationSettings refresh failed', err))
    }
    window.addEventListener('organization:settings-updated', handler)
    return () => {
      active = false
      window.removeEventListener('organization:settings-updated', handler)
    }
  }, [])

  return settings
}

/**
 * Réinitialise le cache module-level.
 * À utiliser dans les tests (vi.resetModules() ou appel direct entre les cas).
 * @internal
 */
export function resetOrganizationSettingsCache(): void {
  cache = null
  inflightPromise = null
}
