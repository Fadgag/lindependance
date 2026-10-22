'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import {
  TechAdminPortalDomainConfigurationSchema,
  TechAdminPortalDomainMutationResponseSchema,
} from '@/schemas/techAdmin'

type PortalDomainConfiguration = z.infer<typeof TechAdminPortalDomainConfigurationSchema>

const endpoint = '/api/tech-admin/customer-portal-domains'

async function fetchPortalDomainConfiguration(): Promise<PortalDomainConfiguration> {
  const response = await fetch(endpoint, { cache: 'no-store' })
  if (!response.ok) throw new Error(await responseError(response))
  const payload: unknown = await response.json()
  const parsed = TechAdminPortalDomainConfigurationSchema.safeParse(payload)
  if (!parsed.success) throw new Error('La configuration des domaines reçue est invalide.')
  return parsed.data
}

async function responseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    return `Erreur serveur (${response.status}).`
  }
  return `Erreur serveur (${response.status}).`
}

export default function CustomerPortalDomainManager() {
  const [configuration, setConfiguration] = useState<PortalDomainConfiguration | null>(null)
  const [hostname, setHostname] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadConfiguration = useCallback(async (): Promise<boolean> => {
    try {
      setError('')
      setConfiguration(await fetchPortalDomainConfiguration())
      return true
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les domaines des portails.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchPortalDomainConfiguration()
      .then((value) => {
        if (active) setConfiguration(value)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Impossible de charger les domaines des portails.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname, organizationId }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const payload: unknown = await response.json()
      if (!TechAdminPortalDomainMutationResponseSchema.safeParse(payload).success) {
        throw new Error('La réponse de création du domaine est invalide.')
      }

      setHostname('')
      setOrganizationId('')
      const refreshed = await loadConfiguration()
      setNotice(refreshed
        ? 'Association enregistrée.'
        : 'Association enregistrée, mais la liste n’a pas pu être actualisée.')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer cette association.')
    } finally {
      setSaving(false)
    }
  }

  async function removeDomain(id: string, domainHostname: string) {
    setRemovingId(id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await responseError(response))
      const refreshed = await loadConfiguration()
      setNotice(refreshed
        ? `Association supprimée pour ${domainHostname}.`
        : 'Association supprimée, mais la liste n’a pas pu être actualisée.')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de supprimer cette association.')
    } finally {
      setRemovingId('')
    }
  }

  return (
    <section className="max-w-4xl rounded-3xl border border-(--studio-border) bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-(--studio-text)">Associer un domaine à un salon</h2>
        <p className="mt-2 text-sm leading-6 text-(--studio-muted)">
          Un domaine associé ouvre directement la réservation du salon sélectionné.
          Seuls les salons avec un portail actif sont proposés.
        </p>
      </div>

      <form onSubmit={addDomain} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="portal-domain-hostname" className="mb-2 block text-sm font-semibold text-(--studio-text)">
            Nom de domaine
          </label>
          <input
            id="portal-domain-hostname"
            type="text"
            autoComplete="url"
            required
            maxLength={253}
            placeholder="reservation.exemple.fr"
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            className="w-full rounded-xl border border-(--studio-border) px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="portal-domain-organization" className="mb-2 block text-sm font-semibold text-(--studio-text)">
            Salon associé
          </label>
          <select
            id="portal-domain-organization"
            required
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={loading || !configuration?.organizations.length}
            className="w-full rounded-xl border border-(--studio-border) bg-white px-4 py-3 text-sm"
          >
            <option value="">Choisir un salon</option>
            {configuration?.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} — {organization.slug}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || saving || !configuration?.organizations.length}
          className="rounded-xl bg-studio-primary px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Ajouter le domaine'}
        </button>
      </form>

      {!loading && configuration?.organizations.length === 0 && (
        <p className="mt-4 text-sm text-(--studio-muted)">
          Aucun salon avec un portail actif et un praticien disponible.
        </p>
      )}

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}

      <section className="mt-8 border-t border-(--studio-border) pt-6">
        <h3 className="text-lg font-bold text-(--studio-text)">Domaines configurés</h3>
        {loading && <p role="status" className="mt-4 text-sm text-(--studio-muted)">Chargement des associations…</p>}
        {!loading && configuration?.domains.length === 0 && (
          <p className="mt-4 text-sm text-(--studio-muted)">Aucun domaine n’est configuré.</p>
        )}
        {!!configuration?.domains.length && (
          <ul className="mt-4 divide-y divide-(--studio-border)">
            {configuration.domains.map((domain) => (
              <li key={domain.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold text-(--studio-text)">{domain.hostname}</p>
                  <p className="mt-1 text-sm text-(--studio-muted)">
                    {domain.organizationName}
                    {domain.organizationSlug ? ` — ${domain.organizationSlug}` : ''}
                  </p>
                  {!domain.portalAvailable && (
                    <p className="mt-1 text-sm text-amber-800">
                      Le portail de ce salon est actuellement indisponible.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={() => void removeDomain(domain.id, domain.hostname)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Supprimer ${domain.hostname}`}
                >
                  {removingId === domain.id ? 'Suppression…' : 'Supprimer'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
