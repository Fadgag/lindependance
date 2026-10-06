'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, Banknote, Landmark, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CheckoutAppointment } from '@/types/models'
import { getUserFacingMutationError, getUserFacingNetworkError } from '@/lib/userFacingMutationError'

const PAYMENT_METHODS = [
  { id: 'CB',    label: 'Carte',    icon: CreditCard },
  { id: 'CASH',  label: 'Espèces',  icon: Banknote   },
  { id: 'CHECK', label: 'Chèque',   icon: Landmark   },
] as const

interface EditPaymentModalProps {
  appointment: CheckoutAppointment
  onClose: () => void
  onSuccess: () => void
}

export default function EditPaymentModal({ appointment, onClose, onSuccess }: EditPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>(
    appointment.paymentMethod ?? 'CB'
  )
  const [note, setNote] = useState<string>(
    appointment.note ?? appointment.Note ?? ''
  )
  const [saving, setSaving] = useState(false)

  // Réinitialise si l'appointment change
  useEffect(() => {
    setPaymentMethod(appointment.paymentMethod ?? 'CB')
    setNote(appointment.note ?? appointment.Note ?? '')
  }, [appointment])

  const displayAmount = appointment.finalPrice ?? appointment.service?.price ?? 0

  const handleSave = async () => {
    setSaving(true)
    try {
      let res: Response
      try {
        res = await fetch(`/api/appointments/${appointment.id}/checkout`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ paymentMethod, note }),
        })
      } catch {
        toast.error(getUserFacingNetworkError('payment-update'))
        return
      }

      if (!res.ok) {
        toast.error(getUserFacingMutationError('payment-update', res.status))
        return
      }
      toast.success('Règlement mis à jour ✓')
      onSuccess()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b bg-green-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={22} />
            <div>
              <h2 className="font-bold text-gray-900 text-base">Modifier le règlement</h2>
              <p className="text-xs text-gray-500">
                {appointment.customer?.name} — {appointment.service?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Montant — lecture seule */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Montant encaissé</span>
            <span className="text-2xl font-black text-gray-700">{displayAmount} €</span>
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
              Mode de règlement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-sm font-bold ${
                    paymentMethod === id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-black uppercase">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
              Note de séance
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none italic"
              placeholder="Observations, commentaires..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Enregistrement...' : <><Save size={16} /> Enregistrer les modifications</>}
          </button>
        </div>
      </div>
    </div>
  )
}
