"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordInput from '@/components/PasswordInput'

export default function NewPasswordClient({ token }: { token?: string }) {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) return setError('Token manquant')
    if (password.length < 8) return setError('Mot de passe trop court (8 caractères min)')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas')

    const res = await fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }), headers: { 'Content-Type': 'application/json' } })
    const j = await res.json()
    if (!res.ok) return setError(j.error || 'Erreur')
    setOk(true)
    setTimeout(() => router.push('/auth/signin'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-studio-bg p-6">
      <form onSubmit={onSubmit} className="max-w-md w-full p-8 rounded-2xl shadow-md bg-white">
        <h2 className="text-2xl font-bold mb-4 text-studio-primary">Nouveau mot de passe</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {ok && <div className="text-green-600 mb-2">Mot de passe réinitialisé — redirection...</div>}
        <label className="block mb-2">Nouveau mot de passe</label>
        <PasswordInput value={password} onChangeAction={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" />
        <label className="block mb-2">Confirmer le mot de passe</label>
        <PasswordInput value={confirm} onChangeAction={(e) => setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" />
        <button className="w-full py-2 rounded bg-studio-primary text-white font-bold">Réinitialiser</button>
      </form>
    </div>
  )
}

