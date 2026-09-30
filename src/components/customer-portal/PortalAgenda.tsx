"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

type AgendaEvent = { start: string; end: string; status: 'RESERVED' | 'UNAVAILABLE' }

function localDateToday(timezone: string): string {
  const parts = new Map(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]))
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`
}

export default function PortalAgenda({
  organizationSlug,
  organizationTimezone,
}: {
  organizationSlug: string
  organizationTimezone: string
}) {
  const [date, setDate] = useState(() => localDateToday(organizationTimezone))
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetch(`/api/portail/${encodeURIComponent(organizationSlug)}/agenda?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('Impossible de charger l’agenda.')
      const data: AgendaEvent[] = await response.json()
      setEvents(data)
      setTimezone(response.headers.get('X-Portal-Timezone') ?? 'Europe/Paris')
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) {
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger l’agenda.')
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [date, organizationSlug])

  const formatTime = (instant: string) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant))

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Portail client</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Agenda public</h1>
        <Link href={`/portail/${encodeURIComponent(organizationSlug)}/reserver`} className="mt-2 inline-block text-sm text-indigo-700 underline">
          Réserver une prestation
        </Link>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="block text-sm font-medium">
          Date
          <input
            type="date"
            min={localDateToday(organizationTimezone)}
            value={date}
            onChange={(event) => {
              setLoading(true)
              setError('')
              setDate(event.target.value)
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 p-3"
          />
        </label>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section aria-live="polite" className="space-y-3">
        {loading ? <p className="text-gray-500">Chargement…</p> : events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">Aucune réservation publique pour cette date.</p>
        ) : events.map((event) => (
          <article key={`${event.start}-${event.end}-${event.status}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
            <span className="font-semibold text-gray-800">
              {formatTime(event.start)} – {formatTime(event.end)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {event.status === 'RESERVED' ? 'Réservé' : 'Indisponible'}
            </span>
          </article>
        ))}
      </section>
    </main>
  )
}
