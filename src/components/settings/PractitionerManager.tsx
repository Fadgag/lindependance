"use client"

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { StaffListSchema, StaffSchema } from '@/schemas/staff'

type Practitioner = {
  id: string
  firstName: string
  lastName: string
  active: boolean
}

async function responseError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : fallback
}

function appointmentCountFromBody(body: unknown): number | null {
  if (
    !body
    || typeof body !== 'object'
    || !('appointmentCount' in body)
    || typeof body.appointmentCount !== 'number'
    || !Number.isSafeInteger(body.appointmentCount)
    || body.appointmentCount < 0
  ) {
    return null
  }
  return body.appointmentCount
}

function sortPractitioners(practitioners: Practitioner[]) {
  return [...practitioners].sort((left, right) => {
    const lastNameOrder = left.lastName.localeCompare(right.lastName, 'fr')
    return lastNameOrder || left.firstName.localeCompare(right.firstName, 'fr')
  })
}

export default function PractitionerManager() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Practitioner | null>(null)
  const [archiveAppointmentCount, setArchiveAppointmentCount] = useState<number | null>(null)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadPractitioners = useCallback(async () => {
    const response = await fetch('/api/staff', { credentials: 'include' })
    if (!response.ok) throw new Error(await responseError(response, 'Impossible de charger les praticiens.'))
    const body: unknown = await response.json()
    const parsed = StaffListSchema.safeParse(body)
    if (!parsed.success) throw new Error('La réponse des praticiens est invalide.')
    return parsed.data.map(({ id, firstName: personFirstName, lastName: personLastName, active }) => ({
      id,
      firstName: personFirstName,
      lastName: personLastName,
      active,
    }))
  }, [])

  useEffect(() => {
    let active = true
    void loadPractitioners()
      .then((data) => {
        if (active) setPractitioners(sortPractitioners(data))
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les praticiens.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [loadPractitioners])

  function resetForm() {
    setEditingId(null)
    setFirstName('')
    setLastName('')
  }

  function beginEdit(practitioner: Practitioner) {
    setEditingId(practitioner.id)
    setFirstName(practitioner.firstName)
    setLastName(practitioner.lastName)
    setError('')
    setMessage('')
  }

  async function savePractitioner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const currentEditingId = editingId
    try {
      const response = await fetch(
        currentEditingId ? `/api/staff?id=${encodeURIComponent(currentEditingId)}` : '/api/staff',
        {
          method: currentEditingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ firstName, lastName }),
        },
      )
      if (!response.ok) {
        throw new Error(await responseError(
          response,
          currentEditingId ? 'Impossible de modifier le praticien.' : 'Impossible de créer le praticien.',
        ))
      }

      if (currentEditingId) {
        setPractitioners((current) => sortPractitioners(current.map((practitioner) => (
          practitioner.id === currentEditingId
            ? { ...practitioner, firstName: firstName.trim(), lastName: lastName.trim() }
            : practitioner
        ))))
        setMessage('Les informations du praticien ont été mises à jour.')
      } else {
        const body: unknown = await response.json()
        const parsed = StaffSchema.safeParse(body)
        if (!parsed.success) throw new Error('La réponse du serveur est invalide.')
        const created = parsed.data
        setPractitioners((current) => sortPractitioners([...current, created]))
        setMessage(`${created.firstName} ${created.lastName} a été ajouté à votre équipe.`)
      }
      resetForm()
    } catch (saveError: unknown) {
      setError(saveError instanceof Error
        ? saveError.message
        : currentEditingId ? 'Impossible de modifier le praticien.' : 'Impossible de créer le praticien.')
    } finally {
      setSaving(false)
    }
  }

  async function requestArchive(practitioner: Practitioner, expectedAppointmentCount?: number) {
    if (statusChangeId === practitioner.id) return
    setStatusChangeId(practitioner.id)
    setError('')
    setMessage('')
    try {
      const query = new URLSearchParams({ id: practitioner.id })
      if (expectedAppointmentCount !== undefined) {
        query.set('expectedAppointmentCount', String(expectedAppointmentCount))
      }
      const response = await fetch(`/api/staff?${query.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.status === 409) {
        const body: unknown = await response.json().catch(() => null)
        const appointmentCount = appointmentCountFromBody(body)
        if (appointmentCount === null) {
          throw new Error('Impossible de vérifier les rendez-vous liés au praticien.')
        }
        setArchiveTarget(practitioner)
        setArchiveAppointmentCount(appointmentCount)
        return
      }
      if (!response.ok) throw new Error(await responseError(response, 'Impossible d’archiver le praticien.'))
      const body: unknown = await response.json()
      const portalDisabled = body && typeof body === 'object'
        && 'portalDisabled' in body
        && body.portalDisabled === true
      const notificationSent = body && typeof body === 'object'
        && 'notificationSent' in body
        && body.notificationSent === true
      setPractitioners((current) => current.map((entry) => (
        entry.id === practitioner.id ? { ...entry, active: false } : entry
      )))
      if (editingId === practitioner.id) resetForm()
      const archiveMessage = `${practitioner.firstName} ${practitioner.lastName} a été archivé. Ses rendez-vous sont conservés.`
      setMessage(portalDisabled
        ? `${archiveMessage} Le portail a été désactivé${notificationSent ? ' et les administrateurs ont été avertis par e-mail' : ' ; l’e-mail d’information n’a pas pu être envoyé'}.`
        : archiveMessage)
      setArchiveTarget(null)
      setArchiveAppointmentCount(null)
    } catch (archiveError: unknown) {
      setError(archiveError instanceof Error ? archiveError.message : 'Impossible d’archiver le praticien.')
    } finally {
      setStatusChangeId(null)
      setArchiveTarget(null)
    }
  }

  async function reactivatePractitioner(practitioner: Practitioner) {
    setStatusChangeId(practitioner.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/staff?id=${encodeURIComponent(practitioner.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: practitioner.firstName,
          lastName: practitioner.lastName,
          active: true,
        }),
      })
      if (!response.ok) throw new Error(await responseError(response, 'Impossible de réactiver le praticien.'))
      setPractitioners((current) => sortPractitioners(current.map((entry) => (
        entry.id === practitioner.id ? { ...entry, active: true } : entry
      ))))
      setMessage(`${practitioner.firstName} ${practitioner.lastName} a été réactivé.`)
    } catch (restoreError: unknown) {
      setError(restoreError instanceof Error ? restoreError.message : 'Impossible de réactiver le praticien.')
    } finally {
      setStatusChangeId(null)
    }
  }

  const activePractitioners = practitioners.filter((practitioner) => practitioner.active)
  const archivedPractitioners = practitioners.filter((practitioner) => !practitioner.active)

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">
            {editingId ? 'Modifier un praticien' : 'Ajouter un praticien'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Les praticiens actifs de votre équipe pourront être choisis pour les rendez-vous du portail client.
          </p>
          <form
            data-testid="practitioner-form"
            onSubmit={savePractitioner}
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <label className="text-sm font-medium text-slate-700">
              Prénom
              <input
                required
                maxLength={80}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3"
                autoComplete="given-name"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Nom
              <input
                required
                maxLength={80}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3"
                autoComplete="family-name"
              />
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter à l’équipe'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 disabled:opacity-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
          {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">Équipe active</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Chargement des praticiens…</p>
          ) : activePractitioners.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
              Aucun praticien actif. Ajoutez-en un pour proposer des créneaux de réservation.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {activePractitioners.map((practitioner) => (
                <li
                  key={practitioner.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 font-medium text-slate-800"
                  data-testid={`practitioner-${practitioner.id}`}
                >
                  <span>{practitioner.firstName} {practitioner.lastName}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      data-testid={`edit-practitioner-${practitioner.id}`}
                      onClick={() => beginEdit(practitioner)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      data-testid={`archive-practitioner-${practitioner.id}`}
                      onClick={() => {
                        setArchiveTarget(null)
                        setArchiveAppointmentCount(null)
                        void requestArchive(practitioner)
                      }}
                      disabled={statusChangeId === practitioner.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {statusChangeId === practitioner.id ? 'Vérification…' : 'Archiver'}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {archivedPractitioners.length > 0 && (
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">Praticiens archivés</h2>
            <p className="mt-2 text-sm text-slate-500">
              Ils ne sont plus proposés pour les nouveaux rendez-vous ; les rendez-vous existants sont conservés.
            </p>
            <ul className="mt-4 divide-y divide-slate-100">
              {archivedPractitioners.map((practitioner) => (
                <li
                  key={practitioner.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 font-medium text-slate-500"
                  data-testid={`archived-practitioner-${practitioner.id}`}
                >
                  <span>{practitioner.firstName} {practitioner.lastName}</span>
                  <button
                    type="button"
                    data-testid={`reactivate-practitioner-${practitioner.id}`}
                    onClick={() => void reactivatePractitioner(practitioner)}
                    disabled={statusChangeId === practitioner.id}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Réactiver
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <ConfirmDialog
        isOpen={archiveTarget !== null && archiveAppointmentCount !== null}
        title="Des rendez-vous sont liés à ce praticien"
        message={`${archiveAppointmentCount ?? 0} rendez-vous ${
          archiveAppointmentCount === 1 ? 'est lié' : 'sont liés'
        } à ${archiveTarget?.firstName ?? ''} ${archiveTarget?.lastName ?? ''}. Ils seront conservés après l’archivage. Voulez-vous continuer ?`}
        confirmLabel={statusChangeId === archiveTarget?.id ? 'Vérification…' : 'Archiver quand même'}
        onConfirm={() => {
          if (archiveTarget && archiveAppointmentCount !== null) {
            void requestArchive(archiveTarget, archiveAppointmentCount)
          }
        }}
        onCancel={() => {
          setArchiveTarget(null)
          setArchiveAppointmentCount(null)
        }}
      />
    </>
  )
}
