'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import {
  InitialOrganizationAdminResponseSchema,
  TechAdminOrganizationsSchema,
} from '@/schemas/techAdmin'

type Organization = z.infer<typeof TechAdminOrganizationsSchema>[number]
type InitialAdminResult = z.infer<typeof InitialOrganizationAdminResponseSchema>

async function responseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    const parsed = z.object({ error: z.string() }).safeParse(body)
    if (parsed.success) return parsed.data.error
  } catch {
    return `Erreur serveur (${response.status}).`
  }
  return `Erreur serveur (${response.status}).`
}

export default function InitialOrganizationAdminCard() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [email, setEmail] = useState('')
  const [confirmControlledEmail, setConfirmControlledEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<InitialAdminResult | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch('/api/tech-admin/organizations', { cache: 'no-store' })
        if (!response.ok) throw new Error(await responseError(response))
        const body: unknown = await response.json()
        const parsed = TechAdminOrganizationsSchema.safeParse(body)
        if (!parsed.success) throw new Error('La liste des salons reçue est invalide.')
        if (active) {
          setOrganizations(parsed.data)
          setSelectedOrganizationId(parsed.data.find(({ hasAdmin }) => !hasAdmin)?.id ?? '')
        }
      } catch (cause: unknown) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Impossible de charger les salons.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function createInitialAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(
        `/api/tech-admin/organizations/${encodeURIComponent(selectedOrganizationId)}/admin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, confirmControlledEmail }),
        },
      )
      if (!response.ok) throw new Error(await responseError(response))
      const body: unknown = await response.json()
      const parsed = InitialOrganizationAdminResponseSchema.safeParse(body)
      if (!parsed.success) throw new Error('La réponse de création du compte est invalide.')

      setResult(parsed.data)
      setOrganizations((current) => current.map((organization) => (
        organization.id === parsed.data.organization.id
          ? { ...organization, hasAdmin: true }
          : organization
      )))
      setSelectedOrganizationId((current) => (
        current === parsed.data.organization.id
          ? organizations.find(({ id, hasAdmin }) => id !== current && !hasAdmin)?.id ?? ''
          : current
      ))
      if (!parsed.data.invitation.sent) {
        setError(parsed.data.invitation.error ?? 'Le compte est créé, mais l’invitation n’a pas été envoyée.')
      }
      setEmail('')
      setConfirmControlledEmail(false)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer le compte ADMIN.')
    } finally {
      setSubmitting(false)
    }
  }

  const eligibleOrganizations = organizations.filter(({ hasAdmin }) => !hasAdmin)

  return (
    <section className="mb-8 max-w-3xl rounded-3xl border border-studio-border bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-studio-text">Ajouter le premier ADMIN à un salon existant</h2>
        <p className="mt-2 text-sm leading-6 text-studio-muted">
          Cette action est réservée à l’administration technique. Elle n’est proposée que pour les salons qui n’ont pas encore d’ADMIN.
        </p>
      </div>

      {loading ? (
        <p role="status" className="text-sm text-studio-muted">Chargement des salons…</p>
      ) : eligibleOrganizations.length === 0 ? (
        <p role="status" className="text-sm text-studio-muted">Tous les salons possèdent déjà un compte ADMIN.</p>
      ) : (
        <form onSubmit={createInitialAdmin} className="space-y-5">
          <div>
            <label htmlFor="initial-admin-organization" className="mb-2 block text-sm font-semibold text-studio-text">
              Salon
            </label>
            <select
              id="initial-admin-organization"
              required
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
              className="w-full rounded-xl border border-studio-border px-4 py-3 text-sm"
            >
              {eligibleOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="initial-admin-email" className="mb-2 block text-sm font-semibold text-studio-text">
              Adresse e-mail du premier ADMIN
            </label>
            <input
              id="initial-admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-studio-border px-4 py-3 text-sm"
            />
          </div>
          <label className="flex items-start gap-3 text-sm leading-6 text-studio-muted">
            <input
              type="checkbox"
              checked={confirmControlledEmail}
              onChange={(event) => setConfirmControlledEmail(event.target.checked)}
              className="mt-1"
            />
            <span>Je confirme que cette adresse est une boîte contrôlée et j’autorise l’envoi du lien d’activation.</span>
          </label>
          <button
            type="submit"
            disabled={submitting || !selectedOrganizationId || !email.trim() || !confirmControlledEmail}
            className="rounded-2xl bg-studio-primary px-5 py-3 text-sm font-semibold text-studio-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Création en cours…' : 'Créer le premier ADMIN et envoyer l’invitation'}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {result && (
        <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p>Le compte ADMIN de {result.organization.name} a été créé pour {result.account.email}.</p>
          {result.invitation.sent
            ? <p className="mt-2">Le lien d’activation a été envoyé ; il expire dans une heure et ne peut servir qu’une fois.</p>
            : <p className="mt-2">Aucun mot de passe n’a été créé. L’envoi de l’invitation a échoué ; le compte reste en attente d’activation.</p>}
        </div>
      )}
    </section>
  )
}
