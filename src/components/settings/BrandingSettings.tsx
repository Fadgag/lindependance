'use client'

import Image from 'next/image'
import { useEffect, useState, type ChangeEvent } from 'react'
import PortalBrandIdentity from '@/components/customer-portal/PortalBrandIdentity'
import PortalLogoCropper from '@/components/settings/PortalLogoCropper'
import {
  DEFAULT_ORGANIZATION_BRANDING,
  getOrganizationLogoSizeForViewport,
  organizationBrandingUpdateSchema,
  organizationBrandingSchema,
  PORTAL_BRAND_COLORS,
  PORTAL_BRAND_FONTS,
  portalNameAlignmentSchema,
  portalNameColorSchema,
  portalNameFontSchema,
  portalNameWeightSchema,
  type LogoShape,
  type OrganizationBranding,
} from '@/domain/branding/logoSettings'

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
const LOGO_SHAPES: LogoShape[] = ['circle', 'square']

function responseErrorMessage(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error
  }
  return 'Une erreur est survenue.'
}

export default function BrandingSettings() {
  const [branding, setBranding] = useState<OrganizationBranding>(DEFAULT_ORGANIZATION_BRANDING)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [previewViewport, setPreviewViewport] = useState<'mobile' | 'desktop'>('desktop')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch('/api/organization/branding', { credentials: 'include' })
        const data: unknown = await response.json()
        if (!response.ok) throw new Error(responseErrorMessage(data))
        const parsed = organizationBrandingSchema.safeParse(data)
        if (!parsed.success) throw new Error('Réponse invalide du serveur.')
        if (active) setBranding(parsed.data)
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le logo.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    setError('')
    setMessage('')
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Choisissez une image PNG, JPEG ou WebP.')
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setError('Le fichier ne peut pas dépasser 10 Mo.')
      return
    }

    setPendingLogoFile(file)
    setProcessing(true)
  }

  function handleCropConfirm(logoDataUrl: string) {
    setBranding((current) => ({ ...current, logoDataUrl }))
    setPendingLogoFile(null)
    setProcessing(false)
    setMessage('')
  }

  function cancelCrop() {
    setPendingLogoFile(null)
    setProcessing(false)
  }

  function handleShapeChange(shape: LogoShape) {
    setBranding((current) => ({ ...current, logoShape: shape }))
    setMessage('')
  }

  function handleNameChange(organizationName: string) {
    setBranding((current) => ({ ...current, organizationName }))
    setMessage('')
  }

  function resetPortalAppearance() {
    setBranding((current) => ({
      ...current,
      logoShape: DEFAULT_ORGANIZATION_BRANDING.logoShape,
      portalNameFont: DEFAULT_ORGANIZATION_BRANDING.portalNameFont,
      portalNameSize: DEFAULT_ORGANIZATION_BRANDING.portalNameSize,
      portalNameColor: DEFAULT_ORGANIZATION_BRANDING.portalNameColor,
      portalNameWeight: DEFAULT_ORGANIZATION_BRANDING.portalNameWeight,
      portalNameAlignment: DEFAULT_ORGANIZATION_BRANDING.portalNameAlignment,
      portalLogoSize: DEFAULT_ORGANIZATION_BRANDING.portalLogoSize,
    }))
    setMessage('')
    setError('')
  }

  async function saveBranding() {
    const parsedUpdate = organizationBrandingUpdateSchema.safeParse(branding)
    if (!parsedUpdate.success) {
      setError(parsedUpdate.error.issues[0]?.message ?? 'Les réglages ne sont pas valides.')
      setMessage('')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/organization/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedUpdate.data),
      })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error(responseErrorMessage(data))
      const parsed = organizationBrandingSchema.safeParse(data)
      if (!parsed.success) throw new Error('Réponse invalide du serveur.')
      setBranding(parsed.data)
      window.dispatchEvent(new Event('organization:branding-updated'))
      setMessage('Personnalisation enregistrée.')
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer les réglages.')
    } finally {
      setSaving(false)
    }
  }

  const shapeClass = branding.logoShape === 'circle' ? 'rounded-full' : 'rounded-none'
  const previewSize = getOrganizationLogoSizeForViewport(branding.portalLogoSize, 'sidebar')

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Identité de l’organisation</h2>
      <p className="mt-1 text-sm text-gray-500">
        Modifiez le nom et le logo affichés dans l’application et personnalisez le portail client.
      </p>

      {loading ? (
        <p className="mt-5 text-sm text-gray-500">Chargement de l’identité…</p>
      ) : (
        <div className="mt-5 space-y-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50">
              {branding.logoDataUrl ? (
                <Image
                  src={branding.logoDataUrl}
                  alt="Aperçu du logo"
                  width={previewSize}
                  height={previewSize}
                  unoptimized
                  className={`object-cover ${shapeClass}`}
                />
              ) : (
                <span className="text-xs text-gray-400">Aucun logo</span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-5">
              <div>
                <label htmlFor="organization-name" className="block text-sm font-medium text-gray-700">
                  Nom de l’organisation
                </label>
                <input
                  id="organization-name"
                  type="text"
                  value={branding.organizationName}
                  onChange={(event) => handleNameChange(event.target.value)}
                  maxLength={100}
                  required
                  disabled={saving}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="organization-logo-file" className="block text-sm font-medium text-gray-700">
                  Importer ou recadrer une image
                </label>
                <input
                  id="organization-logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  disabled={processing || saving}
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-xs text-gray-500">PNG, JPEG ou WebP, jusqu’à 10 Mo.</p>
                {branding.logoDataUrl && (
                  <p className="mt-1 text-xs text-gray-500">
                    Pour modifier le cadrage, réimportez l’image source.
                  </p>
                )}
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  Forme du logo dans l’application et le portail
                </legend>
                <div className="mt-2 flex gap-4">
                  {LOGO_SHAPES.map((shape) => (
                    <label key={shape} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="organization-logo-shape"
                        value={shape}
                        checked={branding.logoShape === shape}
                        onChange={() => handleShapeChange(shape)}
                        disabled={saving}
                      />
                      {shape === 'circle' ? 'Rond' : 'Carré'}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm font-medium text-gray-700">
                Taille du logo dans l’application et le portail (px)
                <input
                  aria-label="Taille du logo dans l’application et le portail (px)"
                  type="range"
                  min="24"
                  max="160"
                  step="1"
                  value={branding.portalLogoSize}
                  onChange={(event) => setBranding((current) => ({
                    ...current,
                    portalLogoSize: Number(event.target.value),
                  }))}
                  disabled={saving}
                  className="mt-2 block w-full accent-indigo-600"
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  {branding.portalLogoSize} px
                </span>
                <span className="block text-xs font-normal text-gray-500">
                  Taille limitée à 64 px dans la barre latérale et 48 px sur mobile ;
                  jusqu’à 128 px sur mobile et 160 px sur grand écran dans le portail.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={branding.showNameWithLogo}
                  onChange={(event) => {
                    setBranding((current) => ({ ...current, showNameWithLogo: event.target.checked }))
                    setMessage('')
                  }}
                  disabled={saving}
                  className="mt-0.5 size-4 accent-indigo-600"
                />
                <span>
                  Afficher le nom avec le logo dans l’espace de gestion
                  <span className="block text-xs text-gray-500">
                    Le nom apparaît à droite s’il tient, sinon en dessous.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <section aria-labelledby="portal-appearance-title" className="border-t border-gray-100 pt-6">
            <h3 id="portal-appearance-title" className="text-base font-semibold text-gray-900">
              Apparence du portail client
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Ces réglages s’appliquent à la réservation et à la page « Mes rendez-vous ».
            </p>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-700">Aperçu du portail</p>
                <div role="group" aria-label="Format de l’aperçu" className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={previewViewport === 'mobile'}
                    onClick={() => setPreviewViewport('mobile')}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm aria-pressed:bg-indigo-100 aria-pressed:text-indigo-800"
                  >
                    Mobile
                  </button>
                  <button
                    type="button"
                    aria-pressed={previewViewport === 'desktop'}
                    onClick={() => setPreviewViewport('desktop')}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm aria-pressed:bg-indigo-100 aria-pressed:text-indigo-800"
                  >
                    Grand écran
                  </button>
                </div>
              </div>
              <div className="mt-4 min-h-24 rounded-lg bg-white p-4">
                <PortalBrandIdentity
                  organizationName={branding.organizationName}
                  branding={branding}
                  viewport={previewViewport}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Police du nom du salon
                <select
                  aria-label="Police du nom du salon"
                  value={branding.portalNameFont}
                  onChange={(event) => {
                    const parsed = portalNameFontSchema.safeParse(event.target.value)
                    if (parsed.success) setBranding((current) => ({ ...current, portalNameFont: parsed.data }))
                    setMessage('')
                  }}
                  disabled={saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  {PORTAL_BRAND_FONTS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Taille du nom du salon (px)
                <input
                  aria-label="Taille du nom du salon (px)"
                  type="range"
                  min="14"
                  max="24"
                  step="1"
                  value={branding.portalNameSize}
                  onChange={(event) => setBranding((current) => ({
                    ...current,
                    portalNameSize: Number(event.target.value),
                  }))}
                  disabled={saving}
                  className="mt-2 block w-full accent-indigo-600"
                />
                <span className="text-xs text-gray-500">{branding.portalNameSize} px</span>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Couleur du nom du salon
                <select
                  aria-label="Couleur du nom du salon"
                  value={branding.portalNameColor}
                  onChange={(event) => {
                    const parsed = portalNameColorSchema.safeParse(event.target.value)
                    if (parsed.success) setBranding((current) => ({ ...current, portalNameColor: parsed.data }))
                    setMessage('')
                  }}
                  disabled={saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  {Object.entries(PORTAL_BRAND_COLORS).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Graisse du nom du salon
                <select
                  aria-label="Graisse du nom du salon"
                  value={branding.portalNameWeight}
                  onChange={(event) => {
                    const parsed = portalNameWeightSchema.safeParse(event.target.value)
                    if (parsed.success) setBranding((current) => ({ ...current, portalNameWeight: parsed.data }))
                    setMessage('')
                  }}
                  disabled={saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="normal">Normale</option>
                  <option value="semibold">Semi-grasse</option>
                  <option value="bold">Grasse</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Alignement du nom du salon
                <select
                  aria-label="Alignement du nom du salon"
                  value={branding.portalNameAlignment}
                  onChange={(event) => {
                    const parsed = portalNameAlignmentSchema.safeParse(event.target.value)
                    if (parsed.success) setBranding((current) => ({ ...current, portalNameAlignment: parsed.data }))
                    setMessage('')
                  }}
                  disabled={saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  <option value="left">Gauche</option>
                  <option value="center">Centré</option>
                  <option value="right">Droite</option>
                </select>
              </label>

            </div>

            <button
              type="button"
              onClick={resetPortalAppearance}
              disabled={saving || processing}
              className="mt-5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Rétablir les valeurs par défaut
            </button>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => { void saveBranding() }}
              disabled={loading || processing || saving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
            {branding.logoDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setBranding((current) => ({ ...current, logoDataUrl: null }))
                  setMessage('')
                }}
                disabled={processing || saving}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Supprimer le logo
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
      {pendingLogoFile && (
        <PortalLogoCropper
          file={pendingLogoFile}
          onConfirm={handleCropConfirm}
          onCancel={cancelCrop}
        />
      )}
    </section>
  )
}
