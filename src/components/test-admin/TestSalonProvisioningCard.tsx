'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { TestSalonProvisionResponseSchema } from '@/schemas/techAdmin'

type ProvisionedSalon = z.infer<typeof TestSalonProvisionResponseSchema>

async function readError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    const parsed = z.object({
      error: z.string(),
      detail: z.string().optional(),
    }).safeParse(body)
    if (parsed.success) {
      return parsed.data.detail
        ? `${parsed.data.error} ${parsed.data.detail}`
        : parsed.data.error
    }
  } catch {
    return `Erreur serveur (${response.status}).`
  }
  return `Erreur serveur (${response.status}).`
}

export default function TestSalonProvisioningCard() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [salon, setSalon] = useState<ProvisionedSalon | null>(null)
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRole, setStaffRole] = useState<'USER' | 'ADMIN'>('USER')
  const [confirmControlledEmail, setConfirmControlledEmail] = useState(false)

  async function createSalon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setSalon(null)

    try {
      const response = await fetch('/api/tech-admin/test-salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: staffEmail,
          role: staffRole,
          confirmControlledEmail,
        }),
      })
      if (!response.ok) throw new Error(await readError(response))

      const payload: unknown = await response.json()
      const parsed = TestSalonProvisionResponseSchema.safeParse(payload)
      if (!parsed.success) {
        throw new Error('La réponse de création du salon est invalide.')
      }
      if (!parsed.data.invitation.sent) {
        setError(parsed.data.invitation.error ?? 'Le compte a été créé, mais son e-mail d’activation n’a pas été envoyé.')
      }
      setSalon(parsed.data)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer le salon de test.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="max-w-3xl rounded-3xl border border-studio-border bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-studio-text">Créer un salon de test</h2>
        <p className="mt-2 text-sm leading-6 text-studio-muted">
          Génère un salon isolé avec un portail client actif, une prestation, un praticien et des données fictives.
          Cette action est disponible uniquement sur l’aperçu de la branche preprod.
        </p>
      </div>

      <form onSubmit={createSalon}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="test-staff-email" className="mb-2 block text-sm font-semibold text-studio-text">
              Adresse e-mail du compte staff
            </label>
            <input
              id="test-staff-email"
              type="email"
              autoComplete="email"
              required
              value={staffEmail}
              onChange={(event) => setStaffEmail(event.target.value)}
              className="w-full rounded-xl border border-studio-border px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="test-staff-role" className="mb-2 block text-sm font-semibold text-studio-text">
              Rôle du compte
            </label>
            <select
              id="test-staff-role"
              value={staffRole}
              onChange={(event) => setStaffRole(event.target.value === 'ADMIN' ? 'ADMIN' : 'USER')}
              className="w-full rounded-xl border border-studio-border px-4 py-3 text-sm"
            >
              <option value="USER">USER — accès staff standard</option>
              <option value="ADMIN">ADMIN — accès administrateur du salon</option>
            </select>
          </div>
        </div>
        <label className="mb-5 flex items-start gap-3 text-sm leading-6 text-studio-muted">
          <input
            type="checkbox"
            checked={confirmControlledEmail}
            onChange={(event) => setConfirmControlledEmail(event.target.checked)}
            className="mt-1"
          />
          <span>Je confirme que cette adresse est une boîte de test sous mon contrôle et j’autorise l’envoi du lien d’activation.</span>
        </label>
        <button
          type="submit"
          disabled={creating || salon !== null || !staffEmail.trim() || !confirmControlledEmail}
          className="rounded-2xl bg-studio-primary px-5 py-3 text-sm font-semibold text-studio-text transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? 'Création en cours…' : 'Créer le salon et envoyer l’activation'}
        </button>
      </form>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {salon && (
        <section role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-950">Salon créé</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-emerald-950">Salon</dt>
              <dd className="mt-1 text-emerald-900">{salon.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-emerald-950">Identifiant du portail</dt>
              <dd className="mt-1 break-all font-mono text-emerald-900">{salon.slug}</dd>
            </div>
            <div>
              <dt className="font-semibold text-emerald-950">Client fictif</dt>
              <dd className="mt-1 break-all text-emerald-900">{salon.customerEmail}</dd>
            </div>
            <div>
              <dt className="font-semibold text-emerald-950">Compte staff</dt>
              <dd className="mt-1 break-all text-emerald-900">{salon.staffAccount.email}</dd>
              <dd className="mt-1 text-emerald-900">Compte staff · {salon.staffAccount.role}</dd>
            </div>
          </dl>
          <Link
            href={`/portail/${encodeURIComponent(salon.slug)}/reserver`}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-300 hover:bg-emerald-100"
          >
            Ouvrir le portail client
          </Link>
          {salon.invitation.sent
            ? <p className="mt-4 text-sm text-emerald-900">E-mail d’activation envoyé. Le lien expire dans une heure.</p>
            : <p className="mt-4 text-sm text-emerald-900">Le compte est créé sans mot de passe. Le titulaire peut demander un nouveau lien depuis « Mot de passe oublié ».</p>}
        </section>
      )}
    </section>
  )
}
