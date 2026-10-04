'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { TestCampaignDetailResponseSchema } from '@/schemas/testFeedbackResponses'
import { campaignReviewChoiceLabels } from '@/domain/test-feedback/campaignReview'
import {
  testScenarioGroups as scenarioGroupCatalog,
  type TestScenarioGroupId,
} from '@/domain/test-feedback/scenarioGroups'

type CampaignDetail = z.infer<typeof TestCampaignDetailResponseSchema>
type ResultFilter = 'ALL' | 'PASS' | 'FAIL' | 'BLOCKED' | 'UNTESTED'

function parseProfileFilter(value: string): 'ALL' | 'ADMIN' | 'USER' {
  if (value === 'ADMIN' || value === 'USER') return value
  return 'ALL'
}

function parseResultFilter(value: string): ResultFilter {
  if (value === 'PASS' || value === 'FAIL' || value === 'BLOCKED' || value === 'UNTESTED') return value
  return 'ALL'
}

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

function statusLabel(status: string | null): string {
  if (status === 'PASS') return 'Réussi'
  if (status === 'FAIL') return 'Échec'
  if (status === 'BLOCKED') return 'Bloqué'
  return 'À tester'
}

function statusClass(status: string | null): string {
  if (status === 'PASS') return 'bg-green-50 text-green-800'
  if (status === 'FAIL') return 'bg-red-50 text-red-800'
  if (status === 'BLOCKED') return 'bg-amber-50 text-amber-900'
  return 'bg-gray-100 text-gray-700'
}

function scenarioGroupLabel(id: TestScenarioGroupId): string {
  return scenarioGroupCatalog.find((group) => group.id === id)?.label ?? id
}

export default function TestCampaignDetail({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [origin, setOrigin] = useState('')
  const [profileFilter, setProfileFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL')
  const [search, setSearch] = useState('')

  const loadCampaign = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/test-campaigns/${campaignId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseError(response))
      const payload: unknown = await response.json()
      const parsed = TestCampaignDetailResponseSchema.safeParse(payload)
      if (!parsed.success) throw new Error('Réponse invalide du suivi de campagne')
      setData(parsed.data)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger le suivi')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void loadCampaign()
  }, [loadCampaign])

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const visibleScenarios = useMemo(() => (data?.scenarios ?? []).filter((scenario) => {
    const status = scenario.result?.status ?? null
    const matchesProfile = profileFilter === 'ALL' || scenario.profile === profileFilter
    const matchesResult = resultFilter === 'ALL'
      || (resultFilter === 'UNTESTED' ? status === null : status === resultFilter)
    const query = search.trim().toLocaleLowerCase('fr-FR')
    const matchesSearch = !query
      || scenario.id.toLocaleLowerCase('fr-FR').includes(query)
      || scenario.title.toLocaleLowerCase('fr-FR').includes(query)
    return matchesProfile && matchesResult && matchesSearch
  }), [data?.scenarios, profileFilter, resultFilter, search])

  async function copyLink() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/retour-test/${data.campaign.publicToken}`)
      setNotice('Lien testeur copié.')
      setError('')
    } catch {
      setError('Impossible de copier le lien testeur.')
    }
  }

  async function closeCampaign() {
    if (!window.confirm('Clôturer cette campagne ? Les testeurs ne pourront plus envoyer de résultats.')) return
    try {
      const response = await fetch(`/api/test-campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setNotice('La campagne a été clôturée.')
      await loadCampaign()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de clôturer la campagne')
    }
  }

  if (loading) return <p role="status" className="p-8 text-sm text-(--studio-muted)">Chargement du suivi…</p>
  if (error && !data) return <p role="alert" className="m-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>
  if (!data) return null

  const { campaign, progress } = data
  const testerUrl = `${origin}/retour-test/${campaign.publicToken}`
  return (
    <section className="mx-auto max-w-6xl space-y-7 p-5 md:p-10">
      <Link href="/test-campaigns" className="text-sm font-medium text-(--studio-primary)">← Toutes les campagnes</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl text-(--studio-text)">{campaign.name}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${campaign.status === 'ACTIVE' ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
              {campaign.status === 'ACTIVE' ? 'Active' : 'Clôturée'}
            </span>
          </div>
          <p className="mt-2 text-sm text-(--studio-muted)">{campaign.organizationName}</p>
          <p className="mt-1 text-sm text-(--studio-muted)">
            Parcours : {campaign.scenarioGroups.map(scenarioGroupLabel).join(' · ')}
          </p>
          <p className="mt-1 text-xs text-(--studio-muted)">Créée le {formatDate(campaign.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyLink()} className="rounded-lg border border-(--studio-border) px-4 py-2 text-sm font-medium">
            Copier le lien testeur
          </button>
          {campaign.status === 'ACTIVE' && (
            <button type="button" onClick={() => void closeCampaign()} className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
              Clôturer la campagne
            </button>
          )}
        </div>
      </header>

      <label className="grid gap-2 rounded-xl border border-(--studio-border) bg-white p-4 text-sm font-medium">
        Lien public pour les testeurs
        <div className="flex flex-wrap gap-2">
          <input readOnly value={testerUrl} className="min-w-0 flex-1 rounded-lg border border-(--studio-border) px-3 py-2 font-normal" />
          <a href={testerUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-(--studio-border) px-4 py-2 font-medium">
            Ouvrir
          </a>
        </div>
      </label>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

      <section aria-label="Avancement" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Testés', `${progress.tested} / ${progress.total}`],
          ['Réussis', progress.passed],
          ['Échecs', progress.failed],
          ['Bloqués', progress.blocked],
          ['À tester', progress.remaining],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-(--studio-border) bg-white p-5">
            <p className="text-sm text-(--studio-muted)">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-(--studio-text)">{value}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="scenario-results-title" className="space-y-4">
        <div>
          <h2 id="scenario-results-title" className="font-serif text-2xl text-(--studio-text)">Résultat courant par scénario</h2>
          <p className="mt-1 text-sm text-(--studio-muted)">Le statut affiché est le dernier résultat reçu pour ce profil et ce scénario.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Profil
            <select value={profileFilter} onChange={(event) => setProfileFilter(parseProfileFilter(event.target.value))} className="rounded-lg border border-(--studio-border) bg-white px-3 py-2">
              <option value="ALL">Tous</option>
              {campaign.profiles.includes('ADMIN') && <option value="ADMIN">Administration</option>}
              {campaign.profiles.includes('USER') && <option value="USER">Utilisateur</option>}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Résultat
            <select value={resultFilter} onChange={(event) => setResultFilter(parseResultFilter(event.target.value))} className="rounded-lg border border-(--studio-border) bg-white px-3 py-2">
              <option value="ALL">Tous</option>
              <option value="PASS">Réussi</option>
              <option value="FAIL">Échec</option>
              <option value="BLOCKED">Bloqué</option>
              <option value="UNTESTED">À tester</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Rechercher un scénario
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border border-(--studio-border) px-3 py-2" />
          </label>
        </div>
        <div className="grid gap-3">
          {visibleScenarios.map((scenario) => (
            <article key={`${scenario.profile}:${scenario.id}`} className="rounded-xl border border-(--studio-border) bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-(--studio-text)">{scenario.id} — {scenario.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(scenario.result?.status ?? null)}`}>
                  {statusLabel(scenario.result?.status ?? null)}
                </span>
              </div>
              <p className="mt-1 text-xs text-(--studio-muted)">
                {scenario.profile === 'ADMIN' ? 'Administration' : 'Utilisateur'} · {scenario.priority}
                {scenario.result && ` · Dernier retour : ${formatDate(scenario.result.createdAt)}`}
              </p>
              {scenario.result?.comment && <p className="mt-3 whitespace-pre-wrap text-sm text-(--studio-text)">{scenario.result.comment}</p>}
              {scenario.result?.environment && <p className="mt-2 text-xs text-(--studio-muted)">Navigateur/appareil : {scenario.result.environment}</p>}
            </article>
          ))}
          {visibleScenarios.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Aucun scénario ne correspond aux filtres.</p>}
        </div>
      </section>

      <section aria-labelledby="feedback-history-title" className="space-y-3">
        <h2 id="feedback-history-title" className="font-serif text-2xl text-(--studio-text)">Historique complet des retours</h2>
        {data.history.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Aucun retour reçu pour le moment.</p>}
        <div className="grid gap-3">
          {data.history.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-(--studio-border) bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-(--studio-text)">{entry.scenarioId} — {entry.scenarioTitle}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(entry.status)}`}>{statusLabel(entry.status)}</span>
              </div>
              <p className="mt-1 text-xs text-(--studio-muted)">
                {entry.profile === 'ADMIN' ? 'Administration' : 'Utilisateur'} · {entry.scenarioPriority} · {formatDate(entry.createdAt)}
              </p>
              {entry.comment && <p className="mt-3 whitespace-pre-wrap text-sm text-(--studio-text)">{entry.comment}</p>}
              {entry.environment && <p className="mt-2 text-xs text-(--studio-muted)">Navigateur/appareil : {entry.environment}</p>}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="campaign-reviews-title" className="space-y-3">
        <div>
          <h2 id="campaign-reviews-title" className="font-serif text-2xl text-(--studio-text)">Avis général des testeurs</h2>
          <p className="mt-1 text-sm text-(--studio-muted)">Retours anonymes sur la clarté, la durée et l’expérience de la campagne.</p>
        </div>
        {data.campaignReviews.length === 0 && (
          <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Aucun avis général reçu pour le moment.</p>
        )}
        <div className="grid gap-3">
          {data.campaignReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-(--studio-border) bg-white p-4">
              <p className="text-xs text-(--studio-muted)">
                Profil déclaré : {review.profile === 'ADMIN' ? 'Administration' : 'Utilisateur'} · {formatDate(review.createdAt)}
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {review.clarity && (
                  <div>
                    <dt className="text-xs text-(--studio-muted)">Compréhension des consignes</dt>
                    <dd className="text-sm font-medium text-(--studio-text)">{campaignReviewChoiceLabels.clarity[review.clarity]}</dd>
                  </div>
                )}
                {review.duration && (
                  <div>
                    <dt className="text-xs text-(--studio-muted)">Durée de la campagne</dt>
                    <dd className="text-sm font-medium text-(--studio-text)">{campaignReviewChoiceLabels.duration[review.duration]}</dd>
                  </div>
                )}
                {review.links && (
                  <div>
                    <dt className="text-xs text-(--studio-muted)">Utilité des liens directs</dt>
                    <dd className="text-sm font-medium text-(--studio-text)">{campaignReviewChoiceLabels.links[review.links]}</dd>
                  </div>
                )}
                {review.satisfaction && (
                  <div>
                    <dt className="text-xs text-(--studio-muted)">Satisfaction générale</dt>
                    <dd className="text-sm font-medium text-(--studio-text)">{campaignReviewChoiceLabels.satisfaction[review.satisfaction]}</dd>
                  </div>
                )}
              </dl>
              {review.comment && <p className="mt-3 whitespace-pre-wrap text-sm text-(--studio-text)">{review.comment}</p>}
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
