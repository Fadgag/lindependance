"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Users, Clock } from 'lucide-react'
import { startOfWeek, endOfWeek, differenceInCalendarDays } from 'date-fns'

export default function AnalysePage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const start = startOfWeek(now, { weekStartsOn: 1 })
        const end = endOfWeek(now, { weekStartsOn: 1 })
        const qs = `?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
        const res = await fetch('/api/appointments' + qs, { signal: controller.signal })
        if (res.ok) setAppointments(await res.json())
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
        console.error('Erreur chargement analyse:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const metrics = useMemo(() => {
    const totalCA = appointments.reduce((s, a) => s + (Number(a.servicePrice || 0)), 0)
    const totalMinutes = appointments.reduce((s, a) => s + (Number(a.extendedProps?.duration || a.duration || 0)), 0)
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })
    const days = differenceInCalendarDays(end, start) + 1
    const totalOpenMinutes = days * 12 * 60
    const occupancy = totalOpenMinutes > 0 ? (totalMinutes / totalOpenMinutes) * 100 : 0

    const counts: Record<string, number> = {}
    for (const a of appointments) {
      const name = a.serviceName || (a.extendedProps && a.extendedProps.serviceId) || 'Unknown'
      counts[name] = (counts[name] || 0) + 1
    }
    const topServices = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count)
    const uniqueCustomers = new Set(appointments.map(a => a.extendedProps?.customerId || a.customerId)).size

    return { totalCA, occupancy, topServices, uniqueCustomers }
  }, [appointments])

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto" style={{ backgroundColor: '#FAF9F6' }}>
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-studio-text">Analyse</h1>
          <p className="text-studio-muted italic">Indicateurs de la semaine en cours</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="studio-card p-6 bg-white rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-bold text-studio-muted uppercase tracking-widest mb-1">CA cette semaine</p>
          <p className="text-2xl font-serif font-bold text-studio-text">{metrics.totalCA.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="studio-card p-6 bg-white rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-bold text-studio-muted uppercase tracking-widest mb-2">Taux d'occupation</p>
          <div className="w-full bg-[#F2F2F2] rounded-full h-3 overflow-hidden mb-2"><div style={{ width: `${Math.min(100, Math.round(metrics.occupancy))}%` }} className="h-3 bg-[#D4A3A1]" /></div>
          <p className="text-sm text-studio-muted">{metrics.occupancy.toFixed(1)}%</p>
        </div>
        <div className="studio-card p-6 bg-white rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-bold text-studio-muted uppercase tracking-widest mb-1">Clients uniques</p>
          <p className="text-2xl font-serif font-bold text-studio-text">{metrics.uniqueCustomers}</p>
        </div>
      </div>

      <div className="studio-card p-6 bg-white rounded-[2rem] shadow-sm">
        <h2 className="font-serif text-lg mb-4">Performance des services</h2>
        {loading ? (
          <p className="text-studio-muted animate-pulse">Chargement...</p>
        ) : metrics.topServices.length > 0 ? (
          metrics.topServices.map((s) => (
            <div key={s.name} className="flex items-center gap-4 mb-3">
              <div className="w-1/3 text-sm text-studio-text">{s.name}</div>
              <div className="flex-1 bg-[#F2F2F2] rounded-full h-4 overflow-hidden">
                <div style={{ width: `${Math.round((s.count / metrics.topServices[0].count) * 100)}%` }} className="h-4 bg-[#D4A3A1]" />
              </div>
              <div className="w-12 text-right text-sm">{s.count}</div>
            </div>
          ))
        ) : (
          <div className="text-studio-muted">Aucune donnée cette semaine.</div>
        )}
      </div>
    </div>
  )
}

