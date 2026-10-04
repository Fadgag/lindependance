'use client'

import Image from 'next/image'
import { useEffect, useState, type ChangeEvent } from 'react'
import {
  MAX_LOGO_DATA_URL_LENGTH,
  organizationBrandingUpdateSchema,
  organizationBrandingSchema,
  type LogoShape,
  type OrganizationBranding,
} from '@/domain/branding/logoSettings'

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
const LOGO_SHAPES: LogoShape[] = ['circle', 'square']

async function prepareLogo(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Choisissez une image PNG, JPEG ou WebP.')
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('Le fichier ne peut pas dépasser 10 Mo.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    for (const maxDimension of [512, 384, 256]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Impossible de préparer cette image.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/webp', 0.82)
      if (dataUrl.length <= MAX_LOGO_DATA_URL_LENGTH) return dataUrl
    }
  } finally {
    bitmap.close()
  }

  throw new Error('Cette image reste trop volumineuse après optimisation.')
}

function responseErrorMessage(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error
  }
  return 'Une erreur est survenue.'
}

export default function BrandingSettings() {
  const [branding, setBranding] = useState<OrganizationBranding>({
    logoDataUrl: null,
    logoShape: 'circle',
    organizationName: 'Atelier Studio Coiffure',
    showNameWithLogo: false,
  })
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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setError('')
    setMessage('')
    setProcessing(true)
    try {
      const logoDataUrl = await prepareLogo(file)
      setBranding((current) => ({ ...current, logoDataUrl }))
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : 'Impossible de préparer cette image.')
    } finally {
      input.value = ''
      setProcessing(false)
    }
  }

  function handleShapeChange(shape: LogoShape) {
    setBranding((current) => ({ ...current, logoShape: shape }))
    setMessage('')
  }

  function handleNameChange(organizationName: string) {
    setBranding((current) => ({ ...current, organizationName }))
    setMessage('')
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
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer le logo.')
    } finally {
      setSaving(false)
    }
  }

  const shapeClass = branding.logoShape === 'circle' ? 'rounded-full' : 'rounded-none'

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Identité de l’organisation</h2>
      <p className="mt-1 text-sm text-gray-500">
        Modifiez le nom affiché dans l’application et personnalisez l’apparence de votre logo.
      </p>

      {loading ? (
        <p className="mt-5 text-sm text-gray-500">Chargement du logo…</p>
      ) : (
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50">
            {branding.logoDataUrl ? (
              <Image
                src={branding.logoDataUrl}
                alt="Aperçu du logo"
                width={96}
                height={96}
                unoptimized
                className={`size-24 object-cover ${shapeClass}`}
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
                Importer une image
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
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">Forme du logo</legend>
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
              <span>Afficher le nom à côté du logo</span>
            </label>

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
        </div>
      )}

      {processing && <p className="mt-4 text-sm text-gray-500">Optimisation de l’image…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
    </section>
  )
}
