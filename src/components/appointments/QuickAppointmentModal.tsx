"use client"

import React, { useState } from 'react'
import useServices from '@/hooks/useServices'
import useCustomers from '@/hooks/useCustomers'
import BaseModal from '@/components/ui/BaseModal'
import FloatingActionButton from '@/components/ui/FloatingActionButton'
import { createQuickAppointment } from '@/app/actions/quickAppointmentAction'
import { CustomerPicker } from '@/components/calendar/CustomerPicker'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatForDateTimeLocal, getDefaultStart } from '@/lib/dateUtils'

export default function QuickAppointmentModal() {
  const [isOpen, setIsOpen] = useState(false)
  // centralised customers & services hooks
  const { customers } = useCustomers()
  const { services, isLoading: servicesLoading } = useServices()
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)

  const [start, setStart] = useState<string>(getDefaultStart())
  const [duration, setDuration] = useState<number>(30)
  const router = useRouter()
  // formRef removed: all fields are controlled

  // validation error messages per field
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState<string>('')

  function resetForm() {
    // reset controlled states
    setSelectedCustomer(null)
    setSelectedService(null)
    setStart(getDefaultStart())
    setDuration(30)
    setNote('')
    setErrors({})
  }

  // services & customers are loaded by their respective hooks

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    // client-side validation before sending
    const newErrors: Record<string, string> = {}
    if (!selectedCustomer) newErrors.customer = 'Veuillez sélectionner un client.'
    if (!selectedService) newErrors.service = 'Veuillez sélectionner une prestation.'
    if (!start) newErrors.start = 'Veuillez sélectionner une date et heure.'
    if (!duration || duration < 5) newErrors.duration = 'Veuillez saisir une durée valide (≥ 5 minutes).'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // focus the first invalid field if possible
      const first = Object.keys(newErrors)[0]
      const el = form.querySelector(`[name="${first === 'customer' ? 'customerId' : first === 'service' ? 'serviceId' : first}"]`) as HTMLElement | null
      if (el && typeof el.focus === 'function') el.focus()
      return
    }

    try {
      const res = await fetch('/api/appointments/quick', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsOpen(false)
        toast.success('RDV créé ✓')
        // notify other parts of the app (agenda, accueil) to refresh their data
        try {
          window.dispatchEvent(new CustomEvent('appointments:updated'))
        } catch (e) {
          // ignore in non-browser environments
        }
        // also refresh the current route
        router.refresh()
        // reset the form so fields are cleared when modal reopens
        resetForm()
      } else {
        // server-side validation messages may be in data.errors
        if (data?.errors && typeof data.errors === 'object') {
          setErrors((prev) => ({ ...prev, ...(data.errors || {}) }))
        }
        toast.error(data?.error || 'Erreur lors de la création')
      }
    } catch (err) {
      toast.error('Erreur réseau')
    }
  }

  return (
    <>
      <FloatingActionButton onClickAction={() => setIsOpen(true)} ariaLabel="Nouveau rendez-vous" />

      <BaseModal isOpen={isOpen} onClose={() => { setIsOpen(false); resetForm(); }} title={"Nouveau RDV"}>
        <form action={createQuickAppointment} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-600">Client</label>
            <CustomerPicker
              customers={customers}
              selectedId={selectedCustomer || undefined}
              onSelectAction={(id) => { setSelectedCustomer(id); setErrors((e) => ({ ...e, customer: '' })) }}
            />
            <input type="hidden" name="customerId" value={selectedCustomer || ''} aria-invalid={!!errors.customer} />
            {errors.customer && <p className="text-xs text-red-600 mt-1">{errors.customer}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-600">Prestation</label>
            <select
              name="serviceId"
              value={selectedService || ''}
              onChange={(e) => { setSelectedService(e.target.value); setErrors((er) => ({ ...er, service: '' })) }}
              className={`w-full p-3 border rounded-xl ${errors.service ? 'bg-red-50 border-red-300' : ''}`}
              aria-invalid={!!errors.service}
            >
              <option value="">{servicesLoading ? 'Chargement...' : 'Sélectionner une prestation'}</option>
              {Array.isArray(services) && services.length === 0 && !servicesLoading && (
                <option value="">Aucune prestation disponible</option>
              )}
              {Array.isArray(services) && services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.service && <p className="text-xs text-red-600 mt-1">{errors.service}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-600">Date & heure</label>
            <input
              name="start"
              value={start}
              onChange={(e) => { setStart(e.target.value); setErrors((er) => ({ ...er, start: '' })) }}
              type="datetime-local"
              className={`w-full p-3 border rounded-xl ${errors.start ? 'bg-red-50 border-red-300' : ''}`}
              aria-invalid={!!errors.start}
            />
            {errors.start && <p className="text-xs text-red-600 mt-1">{errors.start}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-600">Durée (minutes)</label>
            <input
              name="duration"
              value={duration}
              onChange={(e) => { setDuration(Number(e.target.value)); setErrors((er) => ({ ...er, duration: '' })) }}
              type="number"
              min={5}
              className={`w-full p-3 border rounded-xl ${errors.duration ? 'bg-red-50 border-red-300' : ''}`}
              aria-invalid={!!errors.duration}
            />
            {errors.duration && <p className="text-xs text-red-600 mt-1">{errors.duration}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-600">Note (optionnel)</label>
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 border rounded-xl"
            />
          </div>

          {/* end is computed server-side in the action so we don't include it here */}

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setIsOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl border">Annuler</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-atelier-primary text-white">Créer</button>
          </div>
        </form>
      </BaseModal>
    </>
  )
}




