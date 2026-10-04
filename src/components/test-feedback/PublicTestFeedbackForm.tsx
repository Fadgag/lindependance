'use client'

import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import {
  PublicTestCampaignResponseSchema,
} from '@/schemas/testFeedbackResponses'
import {
  campaignReviewChoiceLabels,
  campaignReviewChoiceValues,
} from '@/domain/test-feedback/campaignReview'
import {
  TestCampaignReviewClaritySchema,
  TestCampaignReviewDurationSchema,
  TestCampaignReviewLinksSchema,
  TestCampaignReviewSatisfactionSchema,
} from '@/schemas/testFeedback'
import type { FeedbackStatus, TestProfile, TestScenario } from '@/domain/test-feedback/scenarios'
import { getTestScenarioLinks } from '@/domain/test-feedback/scenarioLinks'
import type { TestScenarioGroupId } from '@/domain/test-feedback/scenarioGroups'

type PublicCampaign = z.infer<typeof PublicTestCampaignResponseSchema>
type ScenarioEntry = { status: FeedbackStatus; comment: string }
const scenarioEntryDraftSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  comment: z.string().max(2000),
})
const campaignReviewDraftSchema = z.object({
  clarity: z.union([z.literal(''), TestCampaignReviewClaritySchema]),
  duration: z.union([z.literal(''), TestCampaignReviewDurationSchema]),
  links: z.union([z.literal(''), TestCampaignReviewLinksSchema]),
  satisfaction: z.union([z.literal(''), TestCampaignReviewSatisfactionSchema]),
  comment: z.string().max(2000),
})
const storedCampaignDraftSchema = z.object({
  version: z.literal(1),
  selected: z.record(z.string(), scenarioEntryDraftSchema),
  submitted: z.record(z.string(), z.boolean()),
  campaignReview: campaignReviewDraftSchema,
  environment: z.string().max(120),
})

type CampaignReviewDraft = z.infer<typeof campaignReviewDraftSchema>
type StoredCampaignDraft = z.infer<typeof storedCampaignDraftSchema>

function readCampaignDraft(
  campaignToken: string,
  profile: TestProfile,
  scenarioIds: ReadonlySet<string>,
): { draft: StoredCampaignDraft | null; warning: string } {
  try {
    const raw = window.localStorage.getItem(`test-feedback:draft:${campaignToken}:${profile}`)
    if (!raw) return { draft: null, warning: '' }

    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return {
        draft: null,
        warning: 'Le brouillon local est illisible et n’a pas pu être restauré.',
      }
    }

    const parsed = storedCampaignDraftSchema.safeParse(value)
    if (!parsed.success) {
      return {
        draft: null,
        warning: 'Le brouillon local n’a pas pu être restauré car son format est invalide.',
      }
    }

    const selected = Object.fromEntries(
      Object.entries(parsed.data.selected).filter(([scenarioId]) => scenarioIds.has(scenarioId)),
    )
    const submitted = Object.fromEntries(
      Object.entries(parsed.data.submitted)
        .filter(([scenarioId, isSubmitted]) => scenarioIds.has(scenarioId) && isSubmitted && scenarioId in selected),
    )

    return {
      draft: { ...parsed.data, selected, submitted },
      warning: '',
    }
  } catch {
    return {
      draft: null,
      warning: 'Le stockage local est indisponible ; le brouillon n’a pas pu être restauré.',
    }
  }
}

const emptyCampaignReview: CampaignReviewDraft = {
  clarity: '',
  duration: '',
  links: '',
  satisfaction: '',
  comment: '',
}

function scenarioGroupLabel(id: TestScenarioGroupId): string {
  const labels: Record<TestScenarioGroupId, string> = {
    ONLINE_BOOKING: 'Prendre rendez-vous',
    APPOINTMENTS_AND_CHANGES: 'Gérer mes rendez-vous',
    SECURITY_AND_MOBILE: 'Confidentialité et téléphone',
    STAFF_ADMINISTRATION: 'Gérer le salon',
  }
  return labels[id]
}

const guideTokenPattern = /(ORG-A|ORG-B|ORG-SOLO|SVC-30|SVC-60|STAFF-A1|STAFF-A2|EMAIL-SINGLE|EMAIL-FAMILY|EMAIL-OTHER|RDV-FAR|RDV-NEAR|RDV-PACKAGE|\/change-requests)/g
const guideAliases: Record<string, string> = {
  'ORG-B': 'une autre organisation',
  'ORG-SOLO': 'l’organisation de test avec un seul praticien actif',
  'SVC-30': 'la prestation de 30 minutes',
  'SVC-60': 'la prestation de 60 minutes',
  'STAFF-A1': 'le premier praticien actif',
  'STAFF-A2': 'le deuxième praticien actif',
  'EMAIL-SINGLE': 'l’adresse liée à une seule fiche client',
  'EMAIL-FAMILY': 'l’adresse partagée par plusieurs fiches client',
  'EMAIL-OTHER': 'l’adresse sans fiche client dans cette organisation',
  'RDV-FAR': 'le rendez-vous prévu dans plus de 24 heures',
  'RDV-NEAR': 'le rendez-vous prévu dans 24 heures ou moins',
  'RDV-PACKAGE': 'le rendez-vous lié à un forfait',
}

function findChoice<T extends string>(choices: readonly T[], value: string): T | '' {
  return choices.find((choice) => choice === value) ?? ''
}

function renderScenarioText(text: string, campaign: PublicCampaign) {
  return text.split(guideTokenPattern).map((part, index) => {
    if (part === '/change-requests') {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-(--studio-primary) underline underline-offset-2"
        >
          {part}
        </a>
      )
    }

    if (part === 'ORG-A') {
      return campaign.organizationName
    }
    return guideAliases[part] ?? part
  })
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

export default function PublicTestFeedbackForm({ campaignToken }: { campaignToken: string }) {
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const [profile, setProfile] = useState<TestProfile | ''>('')
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [selected, setSelected] = useState<Record<string, ScenarioEntry>>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [campaignReview, setCampaignReview] = useState<CampaignReviewDraft>(emptyCampaignReview)
  const [environment, setEnvironment] = useState('')
  const [draftReadyForProfile, setDraftReadyForProfile] = useState<TestProfile | ''>('')
  const [draftWarning, setDraftWarning] = useState('')
  const [draftSaveWarning, setDraftSaveWarning] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const pendingResultCount = Object.keys(selected).filter((scenarioId) => !submitted[scenarioId]).length

  useEffect(() => {
    if (!profile || draftReadyForProfile !== profile) return

    const key = `test-feedback:draft:${campaignToken}:${profile}`
    const draft: StoredCampaignDraft = {
      version: 1,
      selected,
      submitted,
      campaignReview,
      environment,
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(draft))
      setDraftSaveWarning('')
    } catch {
      setDraftSaveWarning('Le stockage local est indisponible ; vos réponses ne pourront pas être restaurées après fermeture de la page.')
    }
  }, [campaignReview, campaignToken, draftReadyForProfile, environment, profile, selected, submitted])

  const loadCampaign = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/test-feedback/${campaignToken}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseError(response))
      const payload: unknown = await response.json()
      const parsed = PublicTestCampaignResponseSchema.safeParse(payload)
      if (!parsed.success) throw new Error('Informations de campagne invalides')
      setCampaign(parsed.data)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger cette campagne')
    } finally {
      setLoading(false)
    }
  }, [campaignToken])

  useEffect(() => {
    void loadCampaign()
  }, [loadCampaign])

  async function chooseProfile(value: TestProfile) {
    setProfile(value)
    setDraftReadyForProfile('')
    setSelected({})
    setSubmitted({})
    setCampaignReview(emptyCampaignReview)
    setEnvironment('')
    setScenarios([])
    setDraftWarning('')
    setDraftSaveWarning('')
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/test-feedback/${campaignToken}?profile=${value}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseError(response))
      const payload: unknown = await response.json()
      const parsed = PublicTestCampaignResponseSchema.safeParse(payload)
      if (!parsed.success) throw new Error('Liste des scénarios invalide')
      setScenarios(parsed.data.scenarios)
      const restored = readCampaignDraft(
        campaignToken,
        value,
        new Set(parsed.data.scenarios.map((scenario) => scenario.id)),
      )
      if (restored.draft) {
        setSelected(restored.draft.selected)
        setSubmitted(restored.draft.submitted)
        setCampaignReview(restored.draft.campaignReview)
        setEnvironment(restored.draft.environment)
      }
      setDraftWarning(restored.warning)
      setDraftReadyForProfile(value)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les scénarios')
    }
  }

  function updateScenario(id: string, update: Partial<ScenarioEntry>) {
    setSelected((current) => ({
      ...current,
      [id]: { status: current[id]?.status ?? 'PASS', comment: current[id]?.comment ?? '', ...update },
    }))
    setSubmitted((current) => ({ ...current, [id]: false }))
  }

  async function submitFeedback() {
    setError('')
    setNotice('')
    const results = Object.entries(selected)
      .filter(([scenarioId]) => !submitted[scenarioId])
      .map(([scenarioId, value]) => ({
        scenarioId,
        status: value.status,
        ...(value.comment.trim() ? { comment: value.comment.trim() } : {}),
      }))
    if (results.length === 0) {
      setError('Sélectionnez au moins un résultat à envoyer.')
      return
    }
    if (results.some((result) => result.status !== 'PASS' && !result.comment)) {
      setError('Ajoutez un commentaire pour chaque scénario en échec ou bloqué.')
      return
    }
    if (!profile) {
      setError('Choisissez votre profil de test.')
      return
    }
    const campaignReviewInput = {
      ...(campaignReview.clarity ? { clarity: campaignReview.clarity } : {}),
      ...(campaignReview.duration ? { duration: campaignReview.duration } : {}),
      ...(campaignReview.links ? { links: campaignReview.links } : {}),
      ...(campaignReview.satisfaction ? { satisfaction: campaignReview.satisfaction } : {}),
      ...(campaignReview.comment.trim() ? { comment: campaignReview.comment.trim() } : {}),
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/test-feedback/${campaignToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          environment,
          results,
          ...(Object.keys(campaignReviewInput).length > 0 ? { campaignReview: campaignReviewInput } : {}),
        }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setNotice(`${results.length} réponse${results.length > 1 ? 's' : ''} enregistrée${results.length > 1 ? 's' : ''}. Merci pour votre retour.`)
      setSubmitted((current) => ({
        ...current,
        ...Object.fromEntries(results.map(({ scenarioId }) => [scenarioId, true])),
      }))
      setCampaignReview(emptyCampaignReview)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer vos résultats')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p role="status" className="mx-auto max-w-3xl p-8 text-sm text-(--studio-muted)">Chargement de la campagne…</p>
  }

  if (!campaign) {
    return <main className="mx-auto max-w-3xl p-6"><p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error || 'Campagne introuvable.'}</p></main>
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <header className="rounded-2xl border border-(--studio-border) bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--studio-primary)">Test du salon</p>
        <h1 className="mt-2 font-serif text-3xl text-(--studio-text)">{campaign.name}</h1>
        <p className="mt-2 text-sm text-(--studio-muted)">
          Salon : <strong className="text-(--studio-text)">{campaign.organizationName}</strong>
        </p>
        {!campaign.organizationPortalEnabled && (
          <p className="mt-1 text-sm text-amber-800">La prise de rendez-vous en ligne n’est pas disponible pour ce salon.</p>
        )}
        <p className="mt-1 text-sm text-(--studio-muted)">
          Vous allez essayer : {campaign.scenarioGroups.map(scenarioGroupLabel).join(' · ')}
        </p>
        <p className="mt-4 text-sm text-(--studio-muted)">
          Pas besoin de créer un compte ni d’indiquer votre nom. Choisissez ci-dessous si vous testez en tant que client ou gérant du salon.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {draftWarning && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{draftWarning}</p>}
      {draftSaveWarning && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{draftSaveWarning}</p>}

      {campaign.status !== 'ACTIVE' ? (
        <p className="rounded-2xl border border-(--studio-border) bg-white p-6 text-sm text-(--studio-muted)">
          Ce test est terminé. Il n’est plus possible d’envoyer de réponses.
        </p>
      ) : (
        <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
          <p className="rounded-xl bg-white p-4 text-sm text-(--studio-muted)">
            Vos réponses sont gardées sur cet appareil jusqu’à leur envoi. Vous pourrez les retrouver si vous fermez cette page.
          </p>
          <fieldset className="rounded-2xl border border-(--studio-border) bg-white p-6">
            <legend className="px-2 text-base font-semibold text-(--studio-text)">Vous testez en tant que… *</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {campaign.profiles.map((availableProfile) => (
                <label key={availableProfile} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${profile === availableProfile ? 'border-(--studio-primary) bg-orange-50/40' : 'border-(--studio-border)'}`}>
                  <input
                    type="radio"
                    name="profile"
                    value={availableProfile}
                    checked={profile === availableProfile}
                    onChange={() => void chooseProfile(availableProfile)}
                  />
                  <span>
                    <span className="block font-medium text-(--studio-text)">
                      {availableProfile === 'ADMIN' ? 'Gérant du salon' : 'Client du salon'}
                    </span>
                    <span className="mt-1 block text-xs text-(--studio-muted)">
                      {availableProfile === 'ADMIN'
                        ? 'Je teste les outils de gestion du salon.'
                        : 'Je teste la prise de rendez-vous comme un client.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-2 rounded-2xl border border-(--studio-border) bg-white p-6 text-sm font-medium text-(--studio-text)">
            Sur quel appareil faites-vous le test ? (facultatif)
            <input maxLength={120} value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="Ex. iPhone ou ordinateur" className="rounded-lg border border-(--studio-border) px-3 py-2 font-normal" />
          </label>

          {!profile && <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Choisissez votre rôle pour voir les points à essayer.</p>}
          {profile && (
            <section aria-labelledby="scenario-checklist-title" className="space-y-3">
              <h2 id="scenario-checklist-title" className="font-serif text-2xl text-(--studio-text)">Points à essayer</h2>
              {scenarios.map((scenario) => {
                const entry = selected[scenario.id]
                const scenarioLinks = getTestScenarioLinks(
                  scenario.profile,
                  scenario.id,
                  campaign.organizationSlug,
                  campaign.organizationPortalEnabled,
                )
                return (
                  <article key={scenario.id} className="rounded-2xl border border-(--studio-border) bg-white p-5">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={Boolean(entry)} onChange={(event) => {
                        const checked = event.target.checked
                        setSelected((current) => {
                          if (!checked) {
                            const next = { ...current }
                            delete next[scenario.id]
                            return next
                          }
                          return { ...current, [scenario.id]: { status: 'PASS', comment: '' } }
                        })
                        if (!checked) {
                          setSubmitted((current) => {
                            const next = { ...current }
                            delete next[scenario.id]
                            return next
                          })
                        }
                      }} />
                      <span>
                        <span className="block font-semibold text-(--studio-text)">{scenario.title}</span>
                      </span>
                    </label>
                    {entry && (
                      <p role="status" className="mt-2 pl-7 text-xs font-medium text-(--studio-muted)">
                        {submitted[scenario.id] ? 'Réponse envoyée' : 'À envoyer'}
                      </p>
                    )}
                    <div className="mt-4 space-y-2 border-l-2 border-(--studio-border) pl-4 text-sm">
                      <p><strong>Étapes :</strong> {renderScenarioText(scenario.steps, campaign)}</p>
                      <p><strong>Ce qui devrait se passer :</strong> {renderScenarioText(scenario.expected, campaign)}</p>
                    </div>
                    {scenarioLinks.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {scenarioLinks.map((link) => (
                          <a
                            key={`${scenario.id}-${link.href}`}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg border border-(--studio-primary) px-3 py-2 text-sm font-medium text-(--studio-primary) hover:bg-orange-50"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                    {entry && (
                      <div className="mt-4 grid gap-3 border-t border-(--studio-border) pt-4 md:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium text-(--studio-text)">
                          Comment cela s’est-il passé ?
                          <select value={entry.status} onChange={(event) => {
                            const value = event.target.value
                            if (value === 'PASS' || value === 'FAIL' || value === 'BLOCKED') {
                              updateScenario(scenario.id, { status: value })
                            }
                          }} className="rounded-lg border border-(--studio-border) bg-white px-3 py-2">
                            <option value="PASS">Tout s’est bien passé</option>
                            <option value="FAIL">Ça n’a pas marché</option>
                            <option value="BLOCKED">Je n’ai pas pu terminer</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-(--studio-text) md:col-span-2">
                          Que s’est-il passé ? {entry.status !== 'PASS' && '(obligatoire)'}
                          <textarea
                            maxLength={2000}
                            required={entry.status !== 'PASS'}
                            value={entry.comment}
                            onChange={(event) => updateScenario(scenario.id, { comment: event.target.value })}
                            rows={3}
                            className="rounded-lg border border-(--studio-border) px-3 py-2 font-normal"
                          />
                        </label>
                      </div>
                    )}
                  </article>
                )
              })}
              {scenarios.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Aucun point à essayer n’est disponible pour ce rôle.</p>}
            </section>
          )}

          {profile && (
            <section aria-labelledby="campaign-review-title" className="space-y-4 rounded-2xl border border-(--studio-border) bg-white p-5 md:p-6">
              <div>
                <h2 id="campaign-review-title" className="font-serif text-2xl text-(--studio-text)">Votre avis sur ce test (facultatif)</h2>
                <p className="mt-1 text-sm text-(--studio-muted)">
                  Votre avis est anonyme et sera envoyé avec au moins une réponse. N’indiquez pas votre nom ni vos coordonnées.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
                  Les consignes étaient-elles compréhensibles ?
                  <select
                    value={campaignReview.clarity}
                    onChange={(event) => setCampaignReview((current) => ({
                      ...current,
                      clarity: findChoice(campaignReviewChoiceValues.clarity, event.target.value),
                    }))}
                    className="rounded-lg border border-(--studio-border) bg-white px-3 py-2"
                  >
                    <option value="">Choisir une réponse</option>
                    {campaignReviewChoiceValues.clarity.map((choice) => (
                      <option key={choice} value={choice}>{campaignReviewChoiceLabels.clarity[choice]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
                  Comment avez-vous trouvé la durée de ce test ?
                  <select
                    value={campaignReview.duration}
                    onChange={(event) => setCampaignReview((current) => ({
                      ...current,
                      duration: findChoice(campaignReviewChoiceValues.duration, event.target.value),
                    }))}
                    className="rounded-lg border border-(--studio-border) bg-white px-3 py-2"
                  >
                    <option value="">Choisir une réponse</option>
                    {campaignReviewChoiceValues.duration.map((choice) => (
                      <option key={choice} value={choice}>{campaignReviewChoiceLabels.duration[choice]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
                  Les liens directs vers les pages à tester vous ont-ils aidé ?
                  <select
                    value={campaignReview.links}
                    onChange={(event) => setCampaignReview((current) => ({
                      ...current,
                      links: findChoice(campaignReviewChoiceValues.links, event.target.value),
                    }))}
                    className="rounded-lg border border-(--studio-border) bg-white px-3 py-2"
                  >
                    <option value="">Choisir une réponse</option>
                    {campaignReviewChoiceValues.links.map((choice) => (
                      <option key={choice} value={choice}>{campaignReviewChoiceLabels.links[choice]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
                  Comment évaluez-vous globalement ce test ?
                  <select
                    value={campaignReview.satisfaction}
                    onChange={(event) => setCampaignReview((current) => ({
                      ...current,
                      satisfaction: findChoice(campaignReviewChoiceValues.satisfaction, event.target.value),
                    }))}
                    className="rounded-lg border border-(--studio-border) bg-white px-3 py-2"
                  >
                    <option value="">Choisir une réponse</option>
                    {campaignReviewChoiceValues.satisfaction.map((choice) => (
                      <option key={choice} value={choice}>{campaignReviewChoiceLabels.satisfaction[choice]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-(--studio-text) md:col-span-2">
                  Votre commentaire ou une idée pour améliorer ce test
                  <textarea
                    maxLength={2000}
                    rows={4}
                    value={campaignReview.comment}
                    onChange={(event) => setCampaignReview((current) => ({ ...current, comment: event.target.value }))}
                    placeholder="Qu’est-ce qui vous a aidé, gêné ou manqué pendant ce test ?"
                    className="rounded-lg border border-(--studio-border) px-3 py-2 font-normal"
                  />
                </label>
              </div>
            </section>
          )}

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-(--studio-border) bg-white/95 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-(--studio-text)" aria-live="polite">
                {pendingResultCount === 0
                  ? 'Aucune réponse à envoyer'
                  : `${pendingResultCount} réponse${pendingResultCount === 1 ? '' : 's'} à envoyer`}
              </p>
              <p className="text-xs text-(--studio-muted)">
                Rien n’est envoyé avant votre clic. Vos réponses restent visibles ici après l’envoi.
              </p>
              <p className="mt-1 text-xs text-(--studio-muted)">Si quelque chose ne se passe pas comme prévu, dites-nous ce qui s’est passé.</p>
            </div>
            <button
              type="button"
              onClick={() => void submitFeedback()}
              disabled={saving || !profile || pendingResultCount === 0}
              className="rounded-xl bg-studio-text px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Envoi…' : 'Envoyer mes réponses'}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
