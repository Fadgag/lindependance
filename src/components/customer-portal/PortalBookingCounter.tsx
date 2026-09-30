"use client"

import { useEffect, useState } from 'react'

export default function PortalBookingCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    const loadCount = async () => {
      try {
        const response = await fetch('/api/appointments/portal-count', { credentials: 'include' })
        if (!response.ok) throw new Error('Unable to load portal booking count')
        const result: unknown = await response.json()
        if (!result || typeof result !== 'object' || !('count' in result) || typeof result.count !== 'number') {
          throw new Error('Invalid portal booking count response')
        }
        if (active) {
          setCount(result.count)
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
  if (count === null) return <p className="text-xs text-gray-500">Chargement des réservations portail…</p>
  return <p role="status" className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800">
    {count} nouvelle{count === 1 ? '' : 's'} réservation{count === 1 ? '' : 's'} en ligne aujourd’hui
  </p>
}
