"use client"

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

type Service = { id: string; name: string; durationMinutes: number; price: number }
type Practitioner = { id: string; firstName: string; lastName: string }
type Customer = { id: string; firstName: string; lastName: string }
type Slot = { start: string; end: string }

function localDateToday(timezone: string): string {
  const parts = new Map(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]))
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : fallback
}

export default function PortalBooking({
  organizationSlug,
  organizationTimezone,
}: {
  organizationSlug: string
  organizationTimezone: string
}) {
  const [services, setServices] = useState<Service[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(() => localDateToday(organizationTimezone))
  const [slots, setSlots] = useState<Slot[]>([])
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeRequested, setCodeRequested] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const basePath = useMemo(
    () => `/api/portail/${encodeURIComponent(organizationSlug)}`,
    [organizationSlug],
  )

  const loadCustomers = useCallback(async () => {
    const response = await fetch(`${basePath}/customers`, { credentials: 'include' })
    if (response.status === 401) return false
    if (!response.ok) throw new Error(await readError(response, 'Impossible de vérifier votre session client.'))
    const result: Customer[] = await response.json()
    setCustomers(result)
    setCustomerId(result.length === 1 ? result[0].id : '')
    setAuthenticated(result.length > 0)
    return result.length > 0
  }, [basePath])

  useEffect(() => {
    let active = true
    void Promise.all([
      fetch(`${basePath}/services`).then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Impossible de charger les prestations.'))
        return response.json() as Promise<Service[]>
      }),
      fetch(`${basePath}/praticiens`).then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Impossible de charger les praticiens.'))
        return response.json() as Promise<Practitioner[]>
      }),
    ]).then(([loadedServices, loadedPractitioners]) => {
      if (!active) return
      setServices(loadedServices)
      setPractitioners(loadedPractitioners)
      setServiceId(loadedServices[0]?.id ?? '')
      setStaffId(loadedPractitioners.length === 1 ? loadedPractitioners[0].id : '')
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le portail.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [basePath])

  useEffect(() => {
    let active = true
    void loadCustomers().catch((sessionError: unknown) => {
      if (active) {
        setAuthenticated(false)
        setError(sessionError instanceof Error ? sessionError.message : 'Impossible de vérifier la session client.')
      }
    })
    return () => { active = false }
  }, [loadCustomers])

  useEffect(() => {
    if (!serviceId || practitioners.length === 0 || (practitioners.length > 1 && !staffId)) {
      setSlots([])
      setSelectedSlot('')
      return
    }
    const controller = new AbortController()
    const query = new URLSearchParams({ serviceId, date })
    if (staffId) query.set('staffId', staffId)
    setLoadingSlots(true)
    setError('')
    void fetch(`${basePath}/creneaux?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Impossible de charger les créneaux.'))
        return response.json() as Promise<{ timezone: string; slots: Slot[] }>
      })
      .then((result) => {
        setSlots(result.slots)
        setTimezone(result.timezone)
        setSelectedSlot('')
      })
      .catch((slotError: unknown) => {
        if (!controller.signal.aborted) {
          setSlots([])
          setError(slotError instanceof Error ? slotError.message : 'Impossible de charger les créneaux.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false)
      })
    return () => controller.abort()
  }, [basePath, date, practitioners.length, serviceId, staffId])

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch('/api/portail/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationSlug, email }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Impossible de demander un code.'))
      setCodeRequested(true)
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de demander un code.')
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch('/api/portail/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationSlug, email, code }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Code invalide ou expiré.'))
      const hasCustomers = await loadCustomers()
      if (!hasCustomers) {
        setAuthenticated(false)
        setError('Aucune fiche client ne correspond à cet email. Contactez votre établissement.')
      }
    } catch (verificationError: unknown) {
      setError(verificationError instanceof Error ? verificationError.message : 'Impossible de vérifier le code.')
    }
  }

  async function bookAppointment() {
    if (!customerId || !serviceId || !selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/portail/rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          serviceId,
          ...(staffId ? { staffId } : {}),
          start: selectedSlot,
        }),
      })
      if (!response.ok) throw new Error(await readError(response, 'La réservation n’a pas pu être effectuée.'))
      const result: { emailSent: boolean } = await response.json()
      setEmailSent(result.emailSent)
    } catch (bookingError: unknown) {
      setError(bookingError instanceof Error ? bookingError.message : 'La réservation n’a pas pu être effectuée.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl p-6 text-gray-500">Chargement du portail…</main>

  const service = services.find((item) => item.id === serviceId)
  const formatTime = (instant: string) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant))

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Portail client</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Réserver une prestation</h1>
        <Link href={`/portail/${encodeURIComponent(organizationSlug)}/agenda`} className="mt-2 inline-block text-sm text-indigo-700 underline">
          Voir l’agenda public
        </Link>
      </header>

      {emailSent !== null ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-6" role="status">
          <h2 className="text-xl font-semibold text-green-900">Votre rendez-vous est confirmé.</h2>
          <p className="mt-2 text-green-800">
            {emailSent
              ? 'Un email de confirmation avec votre invitation calendrier vous a été envoyé.'
              : 'La réservation est confirmée, mais l’email n’a pas pu être envoyé. Contactez votre établissement si nécessaire.'}
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">1. Choisissez votre prestation</h2>
            <label className="block text-sm font-medium">
              Prestation
              <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3">
                {services.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} — {item.durationMinutes} min — {item.price} €</option>
                ))}
              </select>
            </label>
            {practitioners.length > 1 && (
              <label className="block text-sm font-medium">
                Praticien
                <select value={staffId} onChange={(event) => setStaffId(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3">
                  <option value="">Choisir un praticien</option>
                  {practitioners.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium">
              Date
              <input type="date" min={localDateToday(organizationTimezone)} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3" />
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">2. Identifiez-vous par email</h2>
            {authenticated ? (
              <>
                <p className="text-sm text-green-700">Adresse email vérifiée</p>
                {customers.length > 1 && (
                  <label className="block text-sm font-medium">
                    Pour qui est le rendez-vous ?
                    <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3">
                      <option value="">Choisir une fiche client</option>
                      {customers.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <form onSubmit={codeRequested ? verifyCode : requestCode} className="space-y-3">
                {!codeRequested && (
                  <label className="block text-sm font-medium">
                    Email enregistré sur votre fiche client
                    <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3" />
                  </label>
                )}
                {codeRequested && (
                  <>
                    <p className="text-sm text-gray-600">Si cet email correspond à une fiche client, un code à 6 chiffres lui a été envoyé.</p>
                    <label className="block text-sm font-medium">
                      Code de vérification
                      <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-3" />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeRequested(false)
                        setCode('')
                        setError('')
                      }}
                      className="text-sm text-indigo-700 underline"
                    >
                      Modifier l’email ou demander un nouveau code
                    </button>
                  </>
                )}
                <button className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">
                  {codeRequested ? 'Vérifier le code' : 'Recevoir un code'}
                </button>
              </form>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">3. Choisissez un créneau</h2>
            {loadingSlots ? <p className="text-sm text-gray-500">Recherche des disponibilités…</p> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    aria-pressed={selectedSlot === slot.start}
                    onClick={() => setSelectedSlot(slot.start)}
                    className={`rounded-lg border p-3 text-sm ${selectedSlot === slot.start ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700' : 'border-gray-200 hover:border-indigo-400'}`}
                  >
                    {formatTime(slot.start)}
                  </button>
                ))}
                {slots.length === 0 && <p className="col-span-full text-sm text-gray-500">Aucun créneau disponible pour cette date.</p>}
              </div>
            )}
          </section>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={bookAppointment}
            disabled={!authenticated || !customerId || !service || !selectedSlot || submitting}
            className="w-full rounded-xl bg-gray-900 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Réservation en cours…' : 'Confirmer le rendez-vous'}
          </button>
        </>
      )}
    </main>
  )
}
