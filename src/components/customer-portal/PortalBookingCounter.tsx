"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function PortalBookingCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [pendingChangeRequests, setPendingChangeRequests] = useState<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    const loadCount = async () => {
      try {
        const response = await fetch('/api/appointments/portal-count', { credentials: 'include' })
        if (!response.ok) throw new Error('Unable to load portal booking count')
        const result: unknown = await response.json()
        if (
          !result
          || typeof result !== 'object'
          || !('count' in result)
          || typeof result.count !== 'number'
          || !('pendingChangeRequests' in result)
          || typeof result.pendingChangeRequests !== 'number'
        ) {
          throw new Error('Invalid portal booking count response')
        }
        if (active) {
          setCount(result.count)
          setPendingChangeRequests(result.pendingChangeRequests)
          setUnavailable(false)
        }
      } catch {
        if (active) setUnavailable(true)
      }
    }

    void loadCount()
    const interval = window.setInterval(() => { void loadCount() }, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  if (unavailable) {
    return <p role="status" className="text-xs text-gray-500">Réservations portail : indisponible</p>
  }
  if (count === null || pendingChangeRequests === null) {
    return <p className="text-xs text-gray-500">Chargement des informations portail…</p>
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p role="status" className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800">
        {count} nouvelle{count === 1 ? '' : 's'} réservation{count === 1 ? '' : 's'} en ligne aujourd’hui
      </p>
      <Link
        href="/change-requests"
        className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
      >
        {pendingChangeRequests} demande{pendingChangeRequests === 1 ? '' : 's'} en attente
      </Link>
    </div>
  )
}
