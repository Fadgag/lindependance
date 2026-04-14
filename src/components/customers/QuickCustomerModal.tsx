"use client"

import React, { useState } from 'react'
import BaseModal from '@/components/ui/BaseModal'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'

type Props = {
  isOpen: boolean
  onCloseAction: () => void
  // notify parent with the created customer object so parent can select it immediately
  onCreatedAction?: (customer: { id: string; firstName: string; lastName: string; phone?: string | null }) => void
  initialName?: string
}

export default function QuickCustomerModal({ isOpen, onCloseAction, onCreatedAction, initialName = '' }: Props) {
  const router = useRouter()
  // no debug logs in production — keep effect minimal for potential analytics
  React.useEffect(() => {
    // placeholder: modal opened
  }, [isOpen, initialName])
  const [firstName, setFirstName] = useState(initialName)
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!firstName.trim() || !lastName.trim()) return setError('Prénom et nom sont obligatoires')
    setLoading(true)
    try {
      // submit (no console logs)
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName, lastName, phone, email: email || null, notes: notes || null })
      })
      const j = await res.json()
      if (!res.ok) {
        const errMsg = j?.error || j?.message || 'Une erreur est survenue'
        setError(errMsg)
        try { showToast(`Erreur: ${errMsg}`) } catch { /* ignore */ }
        } else {
        showToast(`Cliente ${j.firstName} ${j.lastName} ajoutée`)
        // return the created object to the parent so it can select without needing to refetch list
        onCreatedAction?.(j)
        reset()
        onCloseAction()
        try { router.refresh() } catch { /* ignore */ }
      }
    } catch (err) {
      const s = String(err)
      setError(s)
      try { showToast(`Erreur: ${s}`) } catch { /* ignore */ }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onCloseAction} title="Créer un client rapide" maxWidth="28rem">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}

        <div>
          <label className="block text-sm mb-1">Prénom</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-3 border rounded" />
        </div>

        <div>
          <label className="block text-sm mb-1">Nom</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-3 border rounded" />
        </div>

        <div>
          <label className="block text-sm mb-1">Téléphone (optionnel)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded" />
        </div>

        <div className="flex flex-col">
          <button disabled={loading} className="w-full py-2 rounded bg-studio-primary text-white font-bold mb-2">
            {loading ? 'Enregistrement...' : 'Créer'}
          </button>
          <button type="button" onClick={() => { reset(); onCloseAction() }} className="w-full py-2 rounded border border-gray-200 text-sm">
            Annuler
          </button>
        </div>
      </form>
    </BaseModal>
  )
}


