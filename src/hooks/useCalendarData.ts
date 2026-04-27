'use client'
import { useState, useCallback, useEffect } from 'react'
import { isAbortError } from '@/lib/utils'
import type { Customer, Service, Staff } from '@/types/models'

export interface CalEvent {
  id: string
  title?: string
  start?: string
  end?: string
  extendedProps?: Record<string, unknown>
  color?: string
  classNames?: string[]
  display?: string
  allDay?: boolean
}

export interface UseCalendarDataReturn {
  events: CalEvent[]
  unavailabilities: CalEvent[]
  customers: Customer[]
  services: Service[]
  staffs: Staff[]
  fetchAppointments: (start?: string, end?: string, signal?: AbortSignal) => Promise<void>
  fetchUnavailabilities: (start?: string, end?: string) => Promise<void>
  checkUnavailabilityConflict: (start: Date, end: Date) => CalEvent | null
}

/** Hook centralisé — chargement et synchronisation de toutes les données de l'agenda */
export function useCalendarData(): UseCalendarDataReturn {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [unavailabilities, setUnavailabilities] = useState<CalEvent[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffs, setStaffs] = useState<Staff[]>([])

  const fetchAppointments = useCallback(async (start?: string, end?: string, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const url = `/api/appointments${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url, { signal, credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (!signal || !signal.aborted) setEvents(data)
      }
    } catch (err) {
      if (isAbortError(err)) return
      import('@/lib/clientLogger').then(({ clientError }) => clientError('Erreur RDV', err))
    }
  }, [])

  const fetchUnavailabilities = useCallback(async (start?: string, end?: string) => {
    try {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const url = `/api/unavailability${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) setUnavailabilities(await res.json())
    } catch (err) {
      if (isAbortError(err)) return
      import('@/lib/clientLogger').then(({ clientError }) => clientError('fetchUnavailabilities error', err))
    }
  }, [])

  // Écoute les événements externes (checkout, création rapide)
  useEffect(() => {
    function onUpdated() {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
      fetchAppointments(start, end)
    }
    async function onCustomersUpdated() {
      try {
        const res = await fetch('/api/customers', { credentials: 'include' })
        if (res.ok) setCustomers(await res.json())
      } catch { /* ignore */ }
    }
    window.addEventListener('appointments:updated', onUpdated)
    window.addEventListener('customers:updated', onCustomersUpdated)
    return () => {
      window.removeEventListener('appointments:updated', onUpdated)
      window.removeEventListener('customers:updated', onCustomersUpdated)
    }
  }, [fetchAppointments])

  // Chargement initial (2 mois autour d'aujourd'hui)
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    const loadResources = async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
      await fetchAppointments(start, end, signal)
      await fetchUnavailabilities(start, end)
      try {
        const [resC, resS, resT] = await Promise.all([
          fetch('/api/customers', { signal, credentials: 'include' }),
          fetch('/api/services', { signal, credentials: 'include' }),
          fetch('/api/staff', { signal, credentials: 'include' }),
        ])
        if (!signal.aborted) {
          if (resC.ok) setCustomers(await resC.json())
          if (resS.ok) setServices(await resS.json())
          if (resT.ok) setStaffs(await resT.json())
        }
      } catch (err) {
        if (isAbortError(err)) return
        import('@/lib/clientLogger').then(({ clientError }) => clientError('Erreur ressources', err))
      }
    }
    loadResources()
    return () => controller.abort()
  }, [fetchAppointments, fetchUnavailabilities])

  const checkUnavailabilityConflict = useCallback((start: Date, end: Date): CalEvent | null => {
    return unavailabilities.find((u) => {
      const uStart = new Date(u.start!)
      const uEnd = new Date(u.end!)
      return start < uEnd && end > uStart
    }) ?? null
  }, [unavailabilities])

  return { events, unavailabilities, customers, services, staffs, fetchAppointments, fetchUnavailabilities, checkUnavailabilityConflict }
}

