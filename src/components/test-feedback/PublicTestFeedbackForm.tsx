'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { PublicTestCampaignResponseSchema } from '@/schemas/testFeedbackResponses'
import type { FeedbackStatus, TestProfile, TestScenario } from '@/domain/test-feedback/scenarios'

type PublicCampaign = z.infer<typeof PublicTestCampaignResponseSchema>
type ScenarioEntry = { status: FeedbackStatus; comment: string }

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
  const [environment, setEnvironment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
    setSelected({})
    setScenarios([])
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/test-feedback/${campaignToken}?profile=${value}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseError(response))
      const payload: unknown = await response.json()
      const parsed = PublicTestCampaignResponseSchema.safeParse(payload)
      if (!parsed.success) throw new Error('Liste des scénarios invalide')
      setScenarios(parsed.data.scenarios)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les scénarios')
    }
  }

  function updateScenario(id: string, update: Partial<ScenarioEntry>) {
    setSelected((current) => ({
      ...current,
      [id]: { status: current[id]?.status ?? 'PASS', comment: current[id]?.comment ?? '', ...update },
    }))
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const results = Object.entries(selected).map(([scenarioId, value]) => ({
      scenarioId,
      status: value.status,
      ...(value.comment.trim() ? { comment: value.comment.trim() } : {}),
    }))
    if (results.length === 0) {
      setError('Cochez au moins un scénario effectué avant l’envoi.')
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

    setSaving(true)
    try {
      const response = await fetch(`/api/test-feedback/${campaignToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, environment, results }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setNotice(`${results.length} résultat${results.length > 1 ? 's' : ''} enregistré${results.length > 1 ? 's' : ''}. Merci pour votre retour.`)
      setSelected({})
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--studio-primary)">Retour de test</p>
        <h1 className="mt-2 font-serif text-3xl text-(--studio-text)">{campaign.name}</h1>
        <p className="mt-2 text-sm text-(--studio-muted)">{campaign.organizationName} · Build {campaign.build}</p>
        <p className="mt-4 text-sm text-(--studio-muted)">Aucun compte ni nom n’est demandé. Le profil est déclaratif et sert uniquement à classer les retours de cette campagne.</p>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

      {campaign.status !== 'ACTIVE' ? (
        <p className="rounded-2xl border border-(--studio-border) bg-white p-6 text-sm text-(--studio-muted)">
          Cette campagne est clôturée. Les nouveaux résultats ne sont plus acceptés.
        </p>
      ) : (
        <form onSubmit={(event) => void submitFeedback(event)} className="space-y-6">
          <fieldset className="rounded-2xl border border-(--studio-border) bg-white p-6">
            <legend className="px-2 text-base font-semibold text-(--studio-text)">Votre profil de test *</legend>
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
                      {availableProfile === 'ADMIN' ? 'Administration' : 'Utilisateur'}
                    </span>
                    <span className="mt-1 block text-xs text-(--studio-muted)">
                      {availableProfile === 'ADMIN' ? 'Je teste l’espace équipe.' : 'Je teste le parcours de réservation.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-2 rounded-2xl border border-(--studio-border) bg-white p-6 text-sm font-medium text-(--studio-text)">
            Navigateur / appareil (facultatif)
            <input maxLength={120} value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="Ex. Safari sur iPhone" className="rounded-lg border border-(--studio-border) px-3 py-2 font-normal" />
          </label>

          {!profile && <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Choisissez un profil pour afficher les scénarios correspondants.</p>}
          {profile && (
            <section aria-labelledby="scenario-checklist-title" className="space-y-3">
              <h2 id="scenario-checklist-title" className="font-serif text-2xl text-(--studio-text)">Scénarios à vérifier</h2>
              {scenarios.map((scenario) => {
                const entry = selected[scenario.id]
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
                      }} />
                      <span>
                        <span className="block font-semibold text-(--studio-text)">{scenario.id} — {scenario.title}</span>
                        <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-(--studio-muted)">{scenario.priority}</span>
                      </span>
                    </label>
                    <div className="mt-4 space-y-2 border-l-2 border-(--studio-border) pl-4 text-sm">
                      <p><strong>Étapes :</strong> {scenario.steps}</p>
                      <p><strong>Résultat attendu :</strong> {scenario.expected}</p>
                    </div>
                    {entry && (
                      <div className="mt-4 grid gap-3 border-t border-(--studio-border) pt-4 md:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium text-(--studio-text)">
                          Résultat
                          <select value={entry.status} onChange={(event) => {
                            const value = event.target.value
                            if (value === 'PASS' || value === 'FAIL' || value === 'BLOCKED') {
                              updateScenario(scenario.id, { status: value })
                            }
                          }} className="rounded-lg border border-(--studio-border) bg-white px-3 py-2">
                            <option value="PASS">Réussi</option>
                            <option value="FAIL">Échec</option>
                            <option value="BLOCKED">Bloqué</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-(--studio-text) md:col-span-2">
                          Commentaire ou preuve expurgée {entry.status !== 'PASS' && '*'}
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
              {scenarios.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-(--studio-muted)">Aucun scénario disponible pour ce profil.</p>}
            </section>
          )}

          <p className="text-sm text-(--studio-muted)">Un commentaire est obligatoire pour les scénarios en échec ou bloqués.</p>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !profile || scenarios.length === 0} className="rounded-xl bg-(--studio-text) px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Envoi…' : 'Envoyer les scénarios cochés'}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
