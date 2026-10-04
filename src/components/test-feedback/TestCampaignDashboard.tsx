'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import {
  TestCampaignCreationResponseSchema,
  TestCampaignListResponseSchema,
  TestCampaignRecipientListResponseSchema,
} from '@/schemas/testFeedbackResponses'
import {
  CreateTestCampaignSchema,
  DEFAULT_TEST_CAMPAIGN_EMAIL_MESSAGE,
  DEFAULT_TEST_CAMPAIGN_EMAIL_SUBJECT,
} from '@/schemas/testFeedback'
import {
  testScenarioGroups as scenarioGroupCatalog,
  type TestScenarioGroupId,
} from '@/domain/test-feedback/scenarioGroups'

type CampaignDashboard = z.infer<typeof TestCampaignListResponseSchema>
type CampaignDraft = z.infer<typeof CreateTestCampaignSchema>
type CampaignRecipient = z.infer<typeof TestCampaignRecipientListResponseSchema>[number]
type CampaignRecipientRef = CampaignDraft['recipientIds'][number]
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

function recipientKey(recipient: Pick<CampaignRecipient, 'id' | 'source'>): string {
  return `${recipient.source}:${recipient.id}`
}

function recipientSourceLabel(recipient: CampaignRecipient): string {
  return recipient.source === 'CUSTOMER' ? 'Client' : profileLabel(recipient.role)
}

function scenarioGroupLabel(id: TestScenarioGroupId): string {
  return scenarioGroupCatalog.find((group) => group.id === id)?.label ?? id
}

export default function TestCampaignDashboard() {
  const [data, setData] = useState<CampaignDashboard | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [emailSubject, setEmailSubject] = useState(DEFAULT_TEST_CAMPAIGN_EMAIL_SUBJECT)
  const [emailMessage, setEmailMessage] = useState(DEFAULT_TEST_CAMPAIGN_EMAIL_MESSAGE)
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [recipientsError, setRecipientsError] = useState('')
  const [profiles, setProfiles] = useState<Array<'ADMIN' | 'USER'>>(['ADMIN', 'USER'])
  const [selectedScenarioGroups, setSelectedScenarioGroups] = useState<TestScenarioGroupId[]>(
    scenarioGroupCatalog.map(({ id }) => id),
  )
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

  useEffect(() => {
    let active = true
    setRecipients([])
    setSelectedRecipientIds([])
    setRecipientsError('')
    if (!organizationId) {
      setLoadingRecipients(false)
      return () => {
        active = false
      }
    }

    setLoadingRecipients(true)
    void (async () => {
      try {
        const response = await fetch(
          `/api/test-campaigns/recipients?organizationId=${encodeURIComponent(organizationId)}`,
          { cache: 'no-store' },
        )
        if (!response.ok) throw new Error(await responseError(response))
        const payload: unknown = await response.json()
        const parsed = TestCampaignRecipientListResponseSchema.safeParse(payload)
        if (!parsed.success) throw new Error('Réponse invalide pour les comptes de l’organisation')
        if (active) setRecipients(parsed.data)
      } catch (cause: unknown) {
        if (active) setRecipientsError(
          cause instanceof Error ? cause.message : 'Impossible de charger les comptes de l’organisation',
        )
      } finally {
        if (active) setLoadingRecipients(false)
      }
    })()

    return () => {
      active = false
    }
  }, [organizationId])

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const draft: CampaignDraft = {
      name: campaignName,
      organizationId,
      profiles,
      scenarioGroups: selectedScenarioGroups,
      recipientIds: recipients
        .filter((recipient) => selectedRecipientIds.includes(recipientKey(recipient)))
        .map(({ id, source }): CampaignRecipientRef => ({ id, source })),
      emailSubject,
      emailMessage,
    }
    const validDraft = CreateTestCampaignSchema.safeParse(draft)
    if (!validDraft.success) {
      setError('Vérifiez le nom, l’organisation, les profils, les parcours, l’objet de l’e-mail et la limite de 50 destinataires.')
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
      const payload: unknown = await response.json()
      const parsedResponse = TestCampaignCreationResponseSchema.safeParse(payload)
      if (!parsedResponse.success) throw new Error('Réponse invalide à la création de la campagne')
      const { sent, failedRecipients, deliveryError } = parsedResponse.data.invitations
      setCampaignName('')
      setSelectedRecipientIds([])
      setEmailSubject(DEFAULT_TEST_CAMPAIGN_EMAIL_SUBJECT)
      setEmailMessage(DEFAULT_TEST_CAMPAIGN_EMAIL_MESSAGE)
      await loadCampaigns()
      if (selectedRecipientIds.length === 0) {
        setNotice('La campagne a été créée.')
      } else {
        const invitationSummary = `${sent} invitation${sent === 1 ? '' : 's'} envoyée${sent === 1 ? '' : 's'} sur ${selectedRecipientIds.length}.`
        setNotice(`La campagne a été créée. ${invitationSummary}`)
        if (deliveryError) {
          setError(`Échec global de l’envoi : ${deliveryError}. Vous pouvez copier le lien testeur depuis le suivi.`)
        } else if (failedRecipients.length > 0) {
          setError(`Échec d’envoi pour : ${failedRecipients.join(', ')}. Vous pouvez copier le lien testeur depuis le suivi.`)
        }
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer la campagne')
    } finally {
      setSaving(false)
    }
  }

  function updateProfile(profile: 'ADMIN' | 'USER', checked: boolean) {
    const profileGroupIds = scenarioGroupCatalog
      .filter((group) => group.profile === profile)
      .map(({ id }) => id)
    setProfiles((current) => {
      if (!checked) return current.filter((currentProfile) => currentProfile !== profile)
      return current.includes(profile) ? current : [...current, profile]
    })
    setSelectedScenarioGroups((current) => checked
      ? [...new Set([...current, ...profileGroupIds])]
      : current.filter((groupId) => !profileGroupIds.includes(groupId)))
  }

  function updateScenarioGroup(groupId: TestScenarioGroupId, checked: boolean) {
    const group = scenarioGroupCatalog.find((candidate) => candidate.id === groupId)
    if (!group) return

    const nextGroups = checked
      ? selectedScenarioGroups.includes(groupId)
        ? selectedScenarioGroups
        : [...selectedScenarioGroups, groupId]
      : selectedScenarioGroups.filter((currentGroup) => currentGroup !== groupId)
    setSelectedScenarioGroups(nextGroups)
    setProfiles((current) => {
      const groupStillSelectedForProfile = nextGroups.some((selectedGroupId) => (
        scenarioGroupCatalog.find((candidate) => candidate.id === selectedGroupId)?.profile === group.profile
      ))
      if (checked) return current.includes(group.profile) ? current : [...current, group.profile]
      return groupStillSelectedForProfile
        ? current
        : current.filter((profile) => profile !== group.profile)
    })
  }

  function updateRecipient(recipient: CampaignRecipient, checked: boolean) {
    const key = recipientKey(recipient)
    setSelectedRecipientIds((current) => checked
      ? current.includes(key) ? current : [...current, key]
      : current.filter((currentKey) => currentKey !== key))
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
                      {campaign.organizationName} · {formatDate(campaign.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-(--studio-muted)">
                      Profils : {campaign.profiles.map(profileLabel).join(' et ')}
                    </p>
                    <p className="mt-1 text-xs text-(--studio-muted)">
                      Parcours : {campaign.scenarioGroups.map(scenarioGroupLabel).join(' · ')}
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
        <form
          onSubmit={(event) => void createCampaign(event)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter'
              && event.target instanceof HTMLInputElement
              && event.target.type !== 'checkbox'
            ) event.preventDefault()
          }}
          className="mt-5 grid gap-4 pb-24 md:grid-cols-2 md:pb-0"
        >
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
          <fieldset className="grid gap-2 md:col-span-2">
            <legend className="text-sm font-medium text-(--studio-text)">Envoyer le lien à des comptes ou clients existants (facultatif)</legend>
            <p className="text-xs text-(--studio-muted)">
              Sélectionnez jusqu’à 50 adresses e-mail de comptes staff/admin ou de fiches client. Une seule invitation est envoyée par adresse ; les retours restent anonymes.
            </p>
            {loadingRecipients && <p role="status" className="text-xs text-(--studio-muted)">Chargement des comptes…</p>}
            {recipientsError && <p role="alert" className="text-xs text-red-700">{recipientsError}</p>}
            {!loadingRecipients && !recipientsError && recipients.length === 0 && (
              <p className="text-xs text-(--studio-muted)">Aucun compte ou client avec une adresse e-mail valide pour cette organisation.</p>
            )}
            {recipients.map((recipient) => (
              <label key={recipientKey(recipient)} className="flex items-center gap-2 text-sm text-(--studio-muted)">
                <input
                  type="checkbox"
                  checked={selectedRecipientIds.includes(recipientKey(recipient))}
                  onChange={(event) => updateRecipient(recipient, event.target.checked)}
                  disabled={saving || (
                    !selectedRecipientIds.includes(recipientKey(recipient)) && selectedRecipientIds.length >= 50
                  )}
                />
                {recipient.name ? `${recipient.name} (${recipient.email})` : recipient.email} · {recipientSourceLabel(recipient)}
              </label>
            ))}
          </fieldset>
          {selectedRecipientIds.length > 0 && (
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-(--studio-text)">
                Objet de l’e-mail
                <input
                  required
                  maxLength={120}
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  className="rounded-lg border border-(--studio-border) px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-(--studio-text) md:col-span-2">
                Message personnalisé
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={emailMessage}
                  onChange={(event) => setEmailMessage(event.target.value)}
                  className="rounded-lg border border-(--studio-border) px-3 py-2"
                />
                <span className="text-xs font-normal text-(--studio-muted)">
                  Le prénom, les informations de la campagne et le lien testeur sont ajoutés automatiquement. Texte simple uniquement.
                </span>
              </label>
            </div>
          )}
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-(--studio-text)">Profils de test</legend>
            {testProfiles.map((profile) => (
              <label key={profile} className="flex items-center gap-2 text-sm text-(--studio-muted)">
                <input
                  type="checkbox"
                  checked={profiles.includes(profile)}
                  onChange={(event) => updateProfile(profile, event.target.checked)}
                />
                {profileLabel(profile)}
              </label>
            ))}
          </fieldset>
          <div className="grid content-start gap-4">
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-(--studio-text)">Parcours à tester</legend>
              <p className="text-xs text-(--studio-muted)">
                Tous les parcours sont sélectionnés par défaut. Décochez ceux à exclure ; les profils suivent les parcours retenus.
              </p>
              {scenarioGroupCatalog.map((group) => (
                <label key={group.id} className="flex items-start gap-2 text-sm text-(--studio-muted)">
                  <input
                    type="checkbox"
                    checked={selectedScenarioGroups.includes(group.id)}
                    onChange={(event) => updateScenarioGroup(group.id, event.target.checked)}
                  />
                  <span>{group.label} ({group.range})</span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="hidden justify-end pt-2 md:col-span-2 md:flex">
            <button
              type="submit"
              disabled={saving || loadingRecipients || !data?.organizations.length}
              className="rounded-xl bg-studio-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-studio-primary/20 disabled:opacity-50"
            >
              {saving ? 'Création…' : 'Créer la campagne'}
            </button>
          </div>
          <button
            type="submit"
            disabled={saving || loadingRecipients || !data?.organizations.length}
            className="fixed bottom-4 left-4 right-24 z-50 rounded-xl bg-studio-primary px-4 py-4 text-sm font-semibold text-white shadow-xl shadow-studio-primary/20 disabled:opacity-50 md:hidden"
          >
            {saving ? 'Création…' : 'Créer la campagne'}
          </button>
        </form>
      </section>
    </section>
  )
}
