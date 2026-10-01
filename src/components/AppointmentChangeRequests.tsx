"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { StaffAppointmentChangeRequestsSchema } from '@/schemas/customerPortal'

type ChangeRequest = z.infer<typeof StaffAppointmentChangeRequestsSchema>['requests'][number]

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : 'Impossible de traiter la demande.'
}

export default function AppointmentChangeRequests() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/appointments/change-requests', {
      credentials: 'include',
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await readError(response))
      const body: unknown = await response.json()
      const parsed = StaffAppointmentChangeRequestsSchema.safeParse(body)
      if (!parsed.success) throw new Error('La liste des demandes reçue est invalide.')
      setTimezone(parsed.data.timezone)
      setRequests(parsed.data.requests)
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les demandes.')
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [])

  async function reviewRequest(request: ChangeRequest, action: 'approve' | 'reject') {
    setPendingId(request.id)
    setError('')
    try {
      const response = await fetch(
        `/api/appointments/change-requests/${encodeURIComponent(request.id)}/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          ...(action === 'reject'
            ? { body: JSON.stringify({ reviewReason: reviewReasons[request.id] ?? '' }) }
            : {}),
        },
      )
      if (!response.ok) throw new Error(await readError(response))
      setRequests((current) => current.filter((item) => item.id !== request.id))
    } catch (reviewError: unknown) {
      setError(reviewError instanceof Error ? reviewError.message : 'Impossible de traiter la demande.')
    } finally {
      setPendingId(null)
    }
  }

  const formatDateTime = (instant: string) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(instant))

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Portail client</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Demandes de changement</h1>
        <Link href="/agenda" className="mt-2 inline-block text-sm text-indigo-700 underline">
          Retour à l’agenda
        </Link>
      </header>

      {loading && <p className="text-gray-500">Chargement des demandes…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && requests.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          Aucune demande de changement en attente.
        </p>
      )}
      <section aria-live="polite" className="space-y-3">
        {requests.map((request) => (
          <article
            key={request.id}
            data-testid="pending-change-request"
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {request.appointment.customer.firstName} {request.appointment.customer.lastName}
                </h2>
                <p className="mt-1 text-sm text-gray-700">{request.appointment.service.name}</p>
                <p className="text-sm text-gray-600">
                  Praticien : {request.appointment.staff
                    ? `${request.appointment.staff.firstName} ${request.appointment.staff.lastName}`
                    : 'Non renseigné'}
                </p>
              </div>
              <div className="text-sm text-gray-700">
                <p>Actuellement : {formatDateTime(request.appointment.startTime)}</p>
                <p>Demandé : {formatDateTime(request.requestedStart)}</p>
              </div>
            </div>
            {request.reason && <p className="text-sm text-gray-600">Motif client : {request.reason}</p>}
            <label className="block text-sm font-medium text-gray-800">
              Motif du refus (facultatif)
              <textarea
                data-testid="change-request-review-reason"
                value={reviewReasons[request.id] ?? ''}
                maxLength={500}
                onChange={(event) => setReviewReasons((current) => ({
                  ...current,
                  [request.id]: event.target.value,
                }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 p-3"
                rows={2}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="approve-change-request"
                disabled={pendingId === request.id}
                onClick={() => void reviewRequest(request, 'approve')}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pendingId === request.id ? 'Traitement…' : 'Approuver'}
              </button>
              <button
                type="button"
                data-testid="reject-change-request"
                disabled={pendingId === request.id}
                onClick={() => void reviewRequest(request, 'reject')}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
