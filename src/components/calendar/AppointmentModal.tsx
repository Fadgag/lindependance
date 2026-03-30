"use client"

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, User, Scissors, X } from 'lucide-react'

type Service = { id: string; name: string; price: number; durationMinutes: number }
type Staff = { id: string; firstName: string; lastName: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  start: Date
  end: Date
  organizationId: string
}

export default function AppointmentModal({ isOpen, onClose, start, end, organizationId }: Props) {
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [serviceId, setServiceId] = useState<string>('')
  const [staffId, setStaffId] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // load services & staff
    void (async () => {
      try {
        const [sRes, stRes] = await Promise.all([fetch('/api/services'), fetch('/api/staff')])
        if (!sRes.ok || !stRes.ok) throw new Error('Erreur lors du chargement')
        const sJson = await sRes.json()
        const stJson = await stRes.json()
        setServices(sJson)
        setStaff(stJson)
        if (sJson.length) setServiceId(sJson[0].id)
        if (stJson.length) setStaffId(stJson[0].id)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        startTime: start.toISOString(),
        serviceId,
        customerId: 'anonymous', // TODO: wire real customer selection
        staffId,
        organizationId,
        title,
      }

      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Erreur serveur')
      } else {
        onClose()
      }
    } catch (err) {
      console.error(err)
      setError('Impossible de créer le rendez-vous')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg">Nouveau rendez-vous</h3>
              <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 block">Titre</label>
                <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border-b border-slate-200 focus:outline-none py-2" placeholder="Ex: Coupe rapide" />
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Clock size={16} />
                <div>{format(start, "eeee d MMMM yyyy 'à' HH:mm", { locale: fr })} — {format(end, 'HH:mm', { locale: fr })}</div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block">Service</label>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1">
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.price}€</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-600 block">Personnel</label>
                <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1">
                  {staff.map((st) => (
                    <option key={st.id} value={st.id}>{st.firstName} {st.lastName}</option>
                  ))}
                </select>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-3 py-1 rounded border">Annuler</button>
                <button type="submit" disabled={loading} className={`px-4 py-1 rounded text-white ${loading ? 'opacity-60' : 'bg-atelier-primary'}`}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

