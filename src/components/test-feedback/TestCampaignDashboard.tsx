'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { TestCampaignListResponseSchema } from '@/schemas/testFeedbackResponses'
import { CreateTestCampaignSchema } from '@/schemas/testFeedback'

type CampaignDashboard = z.infer<typeof TestCampaignListResponseSchema>
type CampaignDraft = z.infer<typeof CreateTestCampaignSchema>
const testProfiles: Array<'ADMIN' | 'USER'> = ['ADMIN', 'USER']

async function responseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    return `Erreur serveur (${response.status})`
  }
  return `Erreur serveur (${response.status})`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function profileLabel(profile: 'ADMIN' | 'USER'): string {
  return profile === 'ADMIN' ? 'Administration' : 'Utilisateur'
}

export default function TestCampaignDashboard() {
  const [data, setData] = useState<CampaignDashboard | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [build, setBuild] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [profiles, setProfiles] = useState<Array<'ADMIN' | 'USER'>>(['ADMIN', 'USER'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/test-campaigns', { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseError(response))
      const payload: unknown = await response.json()
      const parsed = TestCampaignListResponseSchema.safeParse(payload)
      if (!parsed.success) throw new Error('Réponse invalide du tableau de bord')
      setData(parsed.data)
      setOrganizationId((current) => current || parsed.data.organizations[0]?.id || '')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les campagnes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const draft: CampaignDraft = { name: campaignName, build, organizationId, profiles }
    const validDraft = CreateTestCampaignSchema.safeParse(draft)
    if (!validDraft.success) {
      setError('Renseignez le nom, l’organisation, le build et au moins un profil.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/test-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validDraft.data),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setCampaignName('')
      setBuild('')
      setNotice('La campagne a été créée.')
      await loadCampaigns()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer la campagne')
    } finally {
      setSaving(false)
    }
  }

  async function closeCampaign(id: string) {
    if (!window.confirm('Clôturer cette campagne ? Les testeurs ne pourront plus envoyer de résultats.')) return
    setError('')
    try {
      const response = await fetch(`/api/test-campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setNotice('La campagne a été clôturée.')
      await loadCampaigns()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de clôturer la campagne')
    }
  }

  async function copyTesterLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/retour-test/${token}`)
      setNotice('Lien testeur copié.')
      setError('')
    } catch {
      setError('Impossible de copier le lien. Ouvrez le détail de la campagne pour le copier manuellement.')
    }
  }

  const campaigns = data?.campaigns ?? []
  const totals = campaigns.reduce((summary, campaign) => ({
    active: summary.active + Number(campaign.status === 'ACTIVE'),
    passed: summary.passed + campaign.progress.passed,
    failed: summary.failed + campaign.progress.failed,
    blocked: summary.blocked + campaign.progress.blocked,
  }), { active: 0, passed: 0, failed: 0, blocked: 0 })

  return (
    <section className="mx-auto max-w-6xl space-y-8 p-5 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--studio-primary)">Recette produit</p>
          <h1 className="mt-2 font-serif text-3xl text-(--studio-text) md:text-4xl">Suivi des campagnes de test</h1>
          <p className="mt-2 text-sm text-(--studio-muted)">Créez une campagne et partagez son lien de recette.</p>
        </div>
        <a href="#nouvelle-campagne" className="rounded-xl bg-(--studio-text) px-5 py-3 text-sm font-semibold text-white">
          Nouvelle campagne
        </a>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Campagnes actives', totals.active],
          ['Scénarios réussis', totals.passed],
          ['Échecs', totals.failed],
          ['Bloqués', totals.blocked],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-(--studio-border) bg-white p-5 shadow-sm">
            <p className="text-sm text-(--studio-muted)">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-(--studio-text)">{value}</p>
          </article>
        ))}
      </div>

      <section aria-labelledby="campaign-list-title" className="space-y-4">
        <h2 id="campaign-list-title" className="font-serif text-2xl text-(--studio-text)">Campagnes</h2>
        {loading && <p role="status" className="text-sm text-(--studio-muted)">Chargement des campagnes…</p>}
        {!loading && campaigns.length === 0 && (
          <p className="rounded-2xl border border-dashed border-(--studio-border) bg-white p-8 text-center text-sm text-(--studio-muted)">
            Aucune campagne. Créez-en une pour commencer la recette.
          </p>
        )}
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const completion = campaign.progress.total
              ? Math.round((campaign.progress.tested / campaign.progress.total) * 100)
              : 0
            return (
              <article key={campaign.id} className="rounded-2xl border border-(--studio-border) bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-(--studio-text)">{campaign.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${campaign.status === 'ACTIVE' ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {campaign.status === 'ACTIVE' ? 'Active' : 'Clôturée'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-(--studio-muted)">
                      {campaign.organizationName} · Build {campaign.build} · {formatDate(campaign.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-(--studio-muted)">
                      Profils : {campaign.profiles.map(profileLabel).join(' et ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/test-campaigns/${campaign.id}`} className="rounded-lg border border-(--studio-border) px-4 py-2 text-sm font-medium">
                      Ouvrir le suivi
                    </Link>
                    <button type="button" onClick={() => void copyTesterLink(campaign.publicToken)} className="rounded-lg border border-(--studio-border) px-4 py-2 text-sm font-medium">
                      Copier le lien testeur
                    </button>
                    {campaign.status === 'ACTIVE' && (
                      <button type="button" onClick={() => void closeCampaign(campaign.id)} className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                        Clôturer
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <p className="text-sm text-(--studio-muted)">Progression <strong className="text-(--studio-text)">{campaign.progress.tested} / {campaign.progress.total}</strong></p>
                  <p className="text-sm text-green-800">Réussis <strong>{campaign.progress.passed}</strong></p>
                  <p className="text-sm text-red-800">Échecs <strong>{campaign.progress.failed}</strong></p>
                  <p className="text-sm text-amber-800">Bloqués <strong>{campaign.progress.blocked}</strong></p>
                </div>
                <progress aria-label={`Avancement de ${campaign.name}`} value={completion} max={100} className="mt-3 h-2 w-full accent-(--studio-primary)" />
              </article>
            )
          })}
        </div>
      </section>

      <section id="nouvelle-campagne" aria-labelledby="new-campaign-title" className="rounded-2xl border border-(--studio-border) bg-white p-5 shadow-sm md:p-7">
        <h2 id="new-campaign-title" className="font-serif text-2xl text-(--studio-text)">Nouvelle campagne</h2>
        <form onSubmit={(event) => void createCampaign(event)} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
            Nom de la campagne
            <input required maxLength={100} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className="rounded-lg border border-(--studio-border) px-3 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
            Organisation
            <select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="rounded-lg border border-(--studio-border) bg-white px-3 py-2">
              <option value="" disabled>Choisir une organisation</option>
              {(data?.organizations ?? []).map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
            Build ou commit testé
            <input required maxLength={128} value={build} onChange={(event) => setBuild(event.target.value)} className="rounded-lg border border-(--studio-border) px-3 py-2" />
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-(--studio-text)">Profils de test</legend>
            {testProfiles.map((profile) => (
              <label key={profile} className="flex items-center gap-2 text-sm text-(--studio-muted)">
                <input
                  type="checkbox"
                  checked={profiles.includes(profile)}
                  onChange={(event) => setProfiles((current) => (
                    event.target.checked
                      ? [...current, profile]
                      : current.filter((value) => value !== profile)
                  ))}
                />
                {profileLabel(profile)}
              </label>
            ))}
          </fieldset>
          <div className="md:col-span-2">
            <button type="submit" disabled={saving || !data?.organizations.length} className="rounded-xl bg-(--studio-text) px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Création…' : 'Créer la campagne'}
            </button>
          </div>
        </form>
      </section>
    </section>
  )
}
