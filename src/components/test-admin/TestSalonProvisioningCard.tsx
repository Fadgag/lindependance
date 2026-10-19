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

  async function createSalon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setSalon(null)

    try {
      const response = await fetch('/api/tech-admin/test-salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error(await readError(response))

      const payload: unknown = await response.json()
      const parsed = TestSalonProvisionResponseSchema.safeParse(payload)
      if (!parsed.success) {
        throw new Error('La réponse de création du salon est invalide.')
      }
      setSalon(parsed.data)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer le salon de test.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="max-w-3xl rounded-3xl border border-(--studio-border) bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-(--studio-text)">Créer un salon de test</h2>
        <p className="mt-2 text-sm leading-6 text-(--studio-muted)">
          Génère un salon isolé avec un portail client actif, une prestation, un praticien et des données fictives.
          Cette action est disponible uniquement sur l’aperçu de la branche preprod.
        </p>
      </div>

      <form onSubmit={createSalon}>
        <button
          type="submit"
          disabled={creating}
          className="rounded-2xl bg-(--studio-primary) px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-wait disabled:opacity-60"
        >
          {creating ? 'Création en cours…' : 'Créer un salon de test'}
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
          </dl>
          <Link
            href={`/portail/${encodeURIComponent(salon.slug)}/reserver`}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-300 hover:bg-emerald-100"
          >
            Ouvrir le portail client
          </Link>
          <p className="mt-4 text-sm text-emerald-900">
            Aucune invitation ni aucun e-mail n’a été envoyé.
          </p>
        </section>
      )}
    </section>
  )
}
