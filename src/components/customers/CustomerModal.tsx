"use client"

import React, { useState } from 'react'
import BaseModal from '@/components/ui/BaseModal'
import { showToast } from '@/lib/toast'

type Props = {
  isOpen: boolean
  onCloseAction: () => void
  onCreatedAction: () => void
}
export default function CustomerModal({ isOpen, onCloseAction, onCreatedAction }: Props) {
  const [firstName, setFirstName] = useState('')
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
    if (!phone.trim()) return setError('Le numéro de téléphone est requis')
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName, lastName, phone: phone || null, email: email || null, notes: notes || null })
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || 'Une erreur est survenue')
      } else {
        // success
        showToast(`La fiche de ${j.firstName} ${j.lastName} a été ajoutée.`)
        reset()
        onCreatedAction()
        onCloseAction()
      }
    } catch (err: unknown) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onCloseAction} title="Nouveau client" maxWidth="36rem">
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
          <label className="block text-sm mb-1">Téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded" />
        </div>

        <div>
          <label className="block text-sm mb-1">Adresse e-mail (facultative)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded" />
        </div>

        <div>
          <label className="block text-sm mb-1">Notes utiles</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 border rounded h-28" />
        </div>

        <div className="flex flex-col">
          <button disabled={loading} className="w-full py-2 rounded bg-studio-primary text-white font-bold mb-2">
            {loading ? 'Enregistrement…' : 'Créer le client'}
          </button>
          <button type="button" onClick={() => { reset(); onCloseAction() }} className="w-full py-2 rounded border border-gray-200 text-sm">
            Annuler
          </button>
        </div>
      </form>
    </BaseModal>
  )
}
