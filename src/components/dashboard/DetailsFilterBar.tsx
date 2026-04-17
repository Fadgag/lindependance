"use client"

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React, { useState, useEffect, useCallback } from 'react'
import { computeDateRange } from '@/lib/computeDateRange'

export default function DetailsFilterBar({ currentFilter }: { currentFilter: 'all' | 'services' | 'products' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [period, setPeriod] = useState('30days')
  // Initialize date pickers from URL params if present
  const paramStart = searchParams.get('start') ?? searchParams.get('from') ?? ''
  const paramEnd = searchParams.get('end') ?? searchParams.get('to') ?? ''

  const formatIsoToLocalInput = (iso: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      // convert to local ISO without timezone designator for input[type=datetime-local]
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      return local.toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }

  const [startInput, setStartInput] = useState(() => formatIsoToLocalInput(paramStart))
  const [endInput, setEndInput] = useState(() => formatIsoToLocalInput(paramEnd))

  const setFilter = (f: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('filter', f)
    router.push(`${pathname}?${params.toString()}`)
  }

  const computeRange = useCallback((period: string) => computeDateRange(period), [])

  const setPeriodAndRange = (p: string) => {
    setPeriod(p)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    const range = computeRange(p)
    params.set('start', range.start)
    params.set('end', range.end)
    // update local inputs to match the selected period
    setStartInput(formatIsoToLocalInput(range.start))
    setEndInput(formatIsoToLocalInput(range.end))
    // keep existing filter/status if any
    router.push(`${pathname}?${params.toString()}`)
  }

  // convert local datetime-local input (YYYY-MM-DDTHH:mm) to full ISO UTC string
  const localInputToIso = (local: string) => {
    if (!local) return ''
    try {
      const d = new Date(local)
      return d.toISOString()
    } catch {
      return ''
    }
  }

  const applyInputsToUrl = (startLocal: string, endLocal: string) => {
    try {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (startLocal) params.set('start', localInputToIso(startLocal))
      else params.delete('start')
      if (endLocal) params.set('end', localInputToIso(endLocal))
      else params.delete('end')
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    } catch {
      // ignore invalid date
    }
  }

  // When period changes, update the start/end inputs to reflect the computed range
  useEffect(() => {
    const range = computeRange(period)
    setStartInput(formatIsoToLocalInput(range.start))
    setEndInput(formatIsoToLocalInput(range.end))
  }, [period, computeRange])

  return (
    // Use wrapping layout so controls don't overflow on small screens
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${currentFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Tous</button>
        <button onClick={() => setFilter('services')} className={`px-3 py-1 rounded ${currentFilter === 'services' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Prestations uniquement</button>
        <button onClick={() => setFilter('products')} className={`px-3 py-1 rounded ${currentFilter === 'products' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Ventes uniquement</button>
      </div>
      <div className="ml-4 flex flex-wrap items-center gap-2 text-sm">
        <label className="text-gray-500 mr-2">Période:</label>
        <select value={period} onChange={(e) => setPeriodAndRange(e.target.value)} className="px-3 py-1 rounded bg-white border">
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Mois en cours</option>
          <option value="30days">30 derniers jours</option>
        </select>
      </div>
      <div className="ml-4 flex flex-wrap items-center gap-2 text-sm">
        <label className="text-gray-500">Du</label>
        <input
          type="datetime-local"
          value={startInput}
          onChange={(e) => {
            const v = e.target.value
            setStartInput(v)
            applyInputsToUrl(v, endInput)
          }}
          className="px-2 py-1 rounded border bg-white w-50 max-w-full"
        />
        <label className="text-gray-500">Au</label>
        <input
          type="datetime-local"
          value={endInput}
          onChange={(e) => {
            const v = e.target.value
            setEndInput(v)
            applyInputsToUrl(startInput, v)
          }}
          className="px-2 py-1 rounded border bg-white w-50 max-w-full"
        />
        <button
          onClick={() => {
            if (!startInput || !endInput) return
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            try {
              const startIso = new Date(startInput).toISOString()
              const endIso = new Date(endInput).toISOString()
              params.set('start', startIso)
              params.set('end', endIso)
              router.push(`${pathname}?${params.toString()}`)
            } catch (e) {
              // ignore invalid date
            }
          }}
          aria-label="Appliquer la plage de dates"
          className="ml-2 px-3 py-1 rounded bg-indigo-600 text-white whitespace-nowrap"
        >Appliquer</button>
        <button
          onClick={() => {
            const params = new URLSearchParams(Array.from(searchParams.entries()))
            params.delete('start')
            params.delete('end')
            // If params become empty, push pathname alone to avoid trailing '?'
            const qs = params.toString()
            router.push(qs ? `${pathname}?${qs}` : pathname)
            setStartInput('')
            setEndInput('')
            setPeriod('30days')
          }}
          aria-label="Réinitialiser les filtres"
          className="ml-2 px-3 py-1 rounded bg-gray-100 text-gray-700 whitespace-nowrap"
        >Réinitialiser</button>
      </div>
    </div>
  )
}







