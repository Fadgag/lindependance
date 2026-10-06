"use client"

import { useEffect, useState, type FormEvent } from 'react'
import {
  CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS,
  isCustomerPortalEmailTemplateValid,
} from '@/domain/customer-portal/emailTemplates'

type PortalSettings = {
  slug: string | null
  portalEnabled: boolean
  timezone: string
  portalContactPhone: string | null
  portalContactEmail: string | null
  portalOtpEmailTemplate: string | null
  portalConfirmationEmailTemplate: string | null
  activePractitionerCount: number
}

function isPortalSettings(value: unknown): value is PortalSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  return (typeof settings.slug === 'string' || settings.slug === null)
    && typeof settings.portalEnabled === 'boolean'
    && typeof settings.timezone === 'string'
    && (typeof settings.portalContactPhone === 'string' || settings.portalContactPhone === null)
    && (typeof settings.portalContactEmail === 'string' || settings.portalContactEmail === null)
    && (typeof settings.portalOtpEmailTemplate === 'string' || settings.portalOtpEmailTemplate === null)
    && (typeof settings.portalConfirmationEmailTemplate === 'string' || settings.portalConfirmationEmailTemplate === null)
    && typeof settings.activePractitionerCount === 'number'
}

export default function CustomerPortalSettingsPage() {
  const [settings, setSettings] = useState<PortalSettings>({
    slug: null,
    portalEnabled: false,
    timezone: 'Europe/Paris',
    portalContactPhone: null,
    portalContactEmail: null,
    portalOtpEmailTemplate: null,
    portalConfirmationEmailTemplate: null,
    activePractitionerCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void fetch('/api/organization/portal')
      .then(async (response) => {
        const data: unknown = await response.json()
        if (!response.ok) throw new Error('Impossible de charger les réglages du portail.')
        if (!isPortalSettings(data)) throw new Error('Réponse invalide du serveur.')
        if (active) setSettings(data)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Une erreur est survenue.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !isCustomerPortalEmailTemplateValid(settings.portalOtpEmailTemplate, 'otp')
      || !isCustomerPortalEmailTemplateValid(settings.portalConfirmationEmailTemplate, 'appointmentConfirmation')
    ) {
      setMessage('')
      setError('Vérifiez les variables obligatoires et les variables disponibles dans les e-mails.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/organization/portal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalEnabled: settings.portalEnabled,
          timezone: settings.timezone,
          slug: settings.slug?.trim().toLowerCase() || null,
          portalContactPhone: settings.portalContactPhone?.trim() || null,
          portalContactEmail: settings.portalContactEmail?.trim() || null,
          portalOtpEmailTemplate: settings.portalOtpEmailTemplate,
          portalConfirmationEmailTemplate: settings.portalConfirmationEmailTemplate,
        }),
      })
      const data: unknown = await response.json()
      if (!response.ok) {
        const apiError = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Impossible d’enregistrer les réglages.'
        throw new Error(apiError)
      }
      if (!isPortalSettings(data)) throw new Error('Réponse invalide du serveur.')
      setSettings(data)
      setMessage('Réglages enregistrés.')
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Chargement des réglages…</p>

  return (
    <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Portail de réservation client</h2>
      <p className="mt-2 text-sm text-gray-600">
        Permettez à vos clients de réserver une prestation en ligne. Ils doivent déjà avoir une fiche client avec cette adresse email.
      </p>

      <form onSubmit={saveSettings} className="mt-6 space-y-5">
        <div>
          <label htmlFor="portal-slug" className="mb-1 block text-sm font-medium text-gray-700">Adresse du portail</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/portail/</span>
            <input
              id="portal-slug"
              value={settings.slug ?? ''}
              onChange={(event) => setSettings({ ...settings, slug: event.target.value })}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              minLength={3}
              maxLength={63}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2"
              placeholder="mon-salon"
              required={settings.portalEnabled}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Minuscules, chiffres et tirets ; cette adresse doit être unique.</p>
        </div>

        <div>
          <label htmlFor="portal-timezone" className="mb-1 block text-sm font-medium text-gray-700">Fuseau horaire IANA</label>
          <input
            id="portal-timezone"
            value={settings.timezone}
            onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Europe/Paris"
            required
          />
          <p className="mt-1 text-xs text-gray-500">Utilisé pour afficher les créneaux et les emails de confirmation (ex. Europe/Paris).</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Coordonnées publiques du salon</legend>
          <label htmlFor="portal-contact-phone" className="block text-sm text-gray-600">
            Téléphone
            <input
              id="portal-contact-phone"
              type="tel"
              autoComplete="tel"
              value={settings.portalContactPhone ?? ''}
              onChange={(event) => setSettings({ ...settings, portalContactPhone: event.target.value || null })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label htmlFor="portal-contact-email" className="block text-sm text-gray-600">
            E-mail
            <input
              id="portal-contact-email"
              type="email"
              autoComplete="email"
              value={settings.portalContactEmail ?? ''}
              onChange={(event) => setSettings({ ...settings, portalContactEmail: event.target.value || null })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <p className="text-xs text-gray-500">
            Ces coordonnées sont visibles par les clients sur le portail. Au moins un moyen de contact est requis pour activer les réservations.
          </p>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-700">Messages envoyés par e-mail</legend>
          <div>
            <label htmlFor="portal-otp-email-template" className="mb-1 block text-sm text-gray-600">
              Code de connexion
            </label>
            <textarea
              id="portal-otp-email-template"
              value={settings.portalOtpEmailTemplate ?? CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS.otp}
              onChange={(event) => setSettings({ ...settings, portalOtpEmailTemplate: event.target.value })}
              aria-describedby="portal-otp-template-help"
              maxLength={5000}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p id="portal-otp-template-help" className="mt-1 text-xs text-gray-500">
              Variables disponibles : {'{{organizationName}}'}, {'{{code}}'} (code obligatoire). Texte brut uniquement.
            </p>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, portalOtpEmailTemplate: null })}
              className="mt-1 text-sm text-indigo-700 underline"
            >
              Rétablir le message de code par défaut
            </button>
          </div>
          <div>
            <label htmlFor="portal-confirmation-email-template" className="mb-1 block text-sm text-gray-600">
              Confirmation de rendez-vous
            </label>
            <textarea
              id="portal-confirmation-email-template"
              value={settings.portalConfirmationEmailTemplate ?? CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS.appointmentConfirmation}
              onChange={(event) => setSettings({ ...settings, portalConfirmationEmailTemplate: event.target.value })}
              aria-describedby="portal-confirmation-template-help"
              maxLength={5000}
              rows={7}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p id="portal-confirmation-template-help" className="mt-1 text-xs text-gray-500">
              Variables : {'{{organizationName}}'}, {'{{serviceName}}'}, {'{{date}}'}, {'{{startTime}}'}, {'{{endTime}}'}, {'{{timezone}}'}, {'{{portalUrl}}'}. Prestation, date et horaires obligatoires. Texte brut uniquement.
            </p>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, portalConfirmationEmailTemplate: null })}
              className="mt-1 text-sm text-indigo-700 underline"
            >
              Rétablir la confirmation par défaut
            </button>
          </div>
        </fieldset>

        <label className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
          <input
            type="checkbox"
            checked={settings.portalEnabled}
            onChange={(event) => setSettings({ ...settings, portalEnabled: event.target.checked })}
            disabled={saving || (!settings.portalEnabled && settings.activePractitionerCount === 0)}
            className="size-4 accent-indigo-600"
          />
          <span>
            <span className="block font-medium text-gray-900">Activer les réservations en ligne</span>
            <span className="mt-1 block text-sm text-gray-500">Le portail reste inaccessible tant que cette option est désactivée.</span>
            {settings.activePractitionerCount === 0 && (
              <span className="mt-1 block text-sm text-amber-700">
                Ajoutez au moins une personne dans l’équipe pour activer les réservations en ligne.
              </span>
            )}
          </span>
        </label>

        {settings.portalEnabled && settings.slug && (
          <div className="space-y-1 text-sm text-indigo-700">
            <p>
              Lien public : <a className="underline" href={`/portail/${settings.slug}/reserver`}>{`/portail/${settings.slug}/reserver`}</a>
            </p>
            <p className="text-xs text-gray-500">
              La page d’accueil ouvre directement cette réservation si c’est le seul portail activé.
            </p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
      </form>
    </div>
  )
}
