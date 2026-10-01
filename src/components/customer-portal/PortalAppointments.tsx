"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import {
  CustomerPortalAppointmentsSchema,
  CustomerPortalAppointmentSummarySchema,
} from '@/schemas/customerPortal'

type PortalAppointment = z.infer<typeof CustomerPortalAppointmentSummarySchema>

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return fallback
}

export default function PortalAppointments({
  organizationSlug,
  organizationTimezone,
}: {
  organizationSlug: string
  organizationTimezone: string
}) {
  const [appointments, setAppointments] = useState<PortalAppointment[]>([])
  const [timezone, setTimezone] = useState(organizationTimezone)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/portail/rdv', { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setAuthenticated(false)
          return
        }
        if (!response.ok) {
          throw new Error(await readError(response, 'Impossible de charger vos rendez-vous.'))
        }
        const body: unknown = await response.json()
        const parsed = CustomerPortalAppointmentsSchema.safeParse(body)
        if (!parsed.success) throw new Error('La liste des rendez-vous reçue est invalide.')
        setTimezone(parsed.data.timezone)
        setAppointments(parsed.data.appointments)
        setAuthenticated(true)
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Impossible de charger vos rendez-vous.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  async function cancelAppointment(appointmentId: string) {
    setCancellingId(appointmentId)
    setError('')
    try {
      const response = await fetch(`/api/portail/rdv/${encodeURIComponent(appointmentId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(await readError(
          response,
          'Impossible d’annuler ce rendez-vous. Contactez votre établissement.',
        ))
      }
      setAppointments((current) => current.filter((appointment) => appointment.id !== appointmentId))
    } catch (cancelError: unknown) {
      setError(cancelError instanceof Error
        ? cancelError.message
        : 'Impossible d’annuler ce rendez-vous. Contactez votre établissement.')
    } finally {
      setCancellingId(null)
    }
  }

  const formatDateTime = (instant: string) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(instant))

  const formatEndTime = (instant: string) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant))

  const statusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmé'
      case 'PAID': return 'Payé'
      default: return status
    }
  }

  const reservationUrl = `/portail/${encodeURIComponent(organizationSlug)}/reserver`

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Portail client</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Mes rendez-vous</h1>
        <Link href={reservationUrl} className="mt-2 inline-block text-sm text-indigo-700 underline">
          Réserver une prestation
        </Link>
      </header>

      {loading && <p className="text-gray-500">Chargement de vos rendez-vous…</p>}
      {!loading && authenticated === false && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <p>Identifiez-vous pour consulter vos rendez-vous.</p>
          <Link href={reservationUrl} className="mt-3 inline-block text-indigo-700 underline">
            Vérifier mon email
          </Link>
        </section>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && authenticated && appointments.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          Vous n’avez pas de rendez-vous à venir.
        </p>
      )}
      <section aria-live="polite" className="space-y-3">
        {appointments.map((appointment) => (
          <article
            key={appointment.id}
            data-testid="portal-appointment"
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {appointment.customer.firstName} {appointment.customer.lastName}
                </h2>
                <p className="mt-1 text-sm text-gray-700">{appointment.service.name}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {statusLabel(appointment.status)}
              </span>
            </div>
            <p className="text-sm text-gray-700">
              {formatDateTime(appointment.startTime)} – {formatEndTime(appointment.endTime)}
            </p>
            <p className="text-sm text-gray-600">
              Praticien : {appointment.staff
                ? `${appointment.staff.firstName} ${appointment.staff.lastName}`
                : 'Non renseigné'}
            </p>
            {appointment.canCancel ? (
              <button
                type="button"
                data-testid="cancel-appointment"
                disabled={cancellingId === appointment.id}
                onClick={() => void cancelAppointment(appointment.id)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                {cancellingId === appointment.id ? 'Annulation…' : 'Annuler'}
              </button>
            ) : (
              <p className="text-sm text-amber-800">
                Contactez votre établissement pour modifier ou annuler ce rendez-vous.
              </p>
            )}
          </article>
        ))}
      </section>
    </main>
  )
}
