"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { format, isValid } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale'
import { Trash2, BanIcon } from 'lucide-react'
import BaseModal from '@/components/ui/BaseModal'

interface UnavailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Pré-rempli si l'utilisateur a cliqué sur un créneau dans le calendrier */
  initialStart?: Date | null
  initialEnd?: Date | null
  /** Si fourni, on est en mode édition/suppression */
  editingId?: string | null
  editingTitle?: string | null
}

export default function UnavailabilityModal({
  isOpen,
  onClose,
  onSuccess,
  initialStart,
  initialEnd,
  editingId,
  editingTitle,
}: UnavailabilityModalProps) {
  const [title, setTitle] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setTitle(editingTitle ?? '')
    const from = initialStart ?? new Date()
    const to = initialEnd ?? new Date(from.getTime() + 60 * 60 * 1000)
    setDateFrom(format(from, 'yyyy-MM-dd'))
    setTimeFrom(format(from, 'HH:mm'))
    setDateTo(format(to, 'yyyy-MM-dd'))
    setTimeTo(format(to, 'HH:mm'))
    setAllDay(false)
  }, [isOpen, initialStart, initialEnd, editingTitle])

  const humanDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (!isValid(d)) return ''
      const h = format(d, 'EEEE d MMMM yyyy', { locale: frLocale })
      return h.charAt(0).toUpperCase() + h.slice(1)
    } catch { return '' }
  }

  const buildISO = (date: string, time: string) => {
    if (!date) return null
    const iso = allDay ? `${date}T00:00:00.000Z` : `${date}T${time || '00:00'}:00.000Z`
    const d = new Date(iso)
    return isValid(d) ? d.toISOString() : null
  }

  const isFormInvalid = !title.trim() || !dateFrom || !dateTo

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isFormInvalid) return
    const start = buildISO(dateFrom, timeFrom)
    const end = buildISO(dateTo, timeTo)
    if (!start || !end) { toast.error('Dates invalides'); return }
    if (new Date(start) >= new Date(end)) { toast.error('La fin doit être après le début'); return }

    setIsSaving(true)
    try {
      const res = await fetch('/api/unavailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), start, end, allDay }),
      })
      if (res.ok) {
        toast.success('Indisponibilité enregistrée')
        onClose()
        onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId || !confirm('Supprimer cette indisponibilité ?')) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/unavailability?id=${editingId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('Indisponibilité supprimée')
        onClose()
        onSuccess()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={editingId ? 'Modifier l\'indisponibilité' : 'Bloquer un créneau'}>
      <form onSubmit={handleSave} className="flex flex-col gap-5">

        {/* Motif */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Motif</label>
          <input
            type="text"
            placeholder="Ex: Rendez-vous Docteur, Congé, Formation..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 ring-slate-200"
            autoFocus
          />
        </div>

        {/* Journée entière */}
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4" />
          Journée entière
        </label>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Du</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border-none bg-transparent text-base font-bold outline-none text-slate-800 mt-1" />
            {dateFrom && <div className="text-[11px] text-slate-500 mt-0.5">{humanDate(dateFrom)}</div>}
            {!allDay && (
              <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)}
                className="w-full border-none bg-transparent text-sm font-semibold outline-none text-slate-600 mt-1" />
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Au</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border-none bg-transparent text-base font-bold outline-none text-slate-800 mt-1" />
            {dateTo && <div className="text-[11px] text-slate-500 mt-0.5">{humanDate(dateTo)}</div>}
            {!allDay && (
              <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)}
                className="w-full border-none bg-transparent text-sm font-semibold outline-none text-slate-600 mt-1" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-1">
          {editingId && (
            <button type="button" onClick={handleDelete} disabled={isSaving}
              className="text-red-500 text-[11px] font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Trash2 size={13} /> SUPPRIMER
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-400 font-bold text-sm">ANNULER</button>
            <button type="submit" disabled={isFormInvalid || isSaving}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow disabled:opacity-50 disabled:cursor-not-allowed">
              <BanIcon size={14} /> {isSaving ? '...' : 'BLOQUER'}
            </button>
          </div>
        </div>
      </form>
    </BaseModal>
  )
}

