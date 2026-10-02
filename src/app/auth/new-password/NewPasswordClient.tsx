"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import PasswordInput from '@/components/PasswordInput'

const ResetPasswordResponseSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
})

export default function NewPasswordClient({ token }: { token?: string }) {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(
    token ? null : 'Lien de réinitialisation invalide ou incomplet. Demandez un nouveau lien.',
  )
  const [ok, setOk] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting || ok) return
    setError(null)
    if (!token) return setError('Token manquant')
    if (password.length < 8) return setError('Mot de passe trop court (8 caractères min)')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas')

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        headers: { 'Content-Type': 'application/json' },
      })
      let body: unknown
      try {
        body = await res.json()
      } catch {
        setError('Réponse invalide du serveur. Réessayez.')
        return
      }
      const parsedBody = ResetPasswordResponseSchema.safeParse(body)
      if (!parsedBody.success) {
        setError('Réponse invalide du serveur. Réessayez.')
        return
      }
      if (!res.ok) {
        setError(parsedBody.data.error ?? 'Impossible de réinitialiser le mot de passe.')
        return
      }
      if (parsedBody.data.ok !== true) {
        setError('La réinitialisation du mot de passe n’a pas été confirmée.')
        return
      }

      setOk(true)
      window.setTimeout(() => router.push('/auth/signin'), 1500)
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-studio-bg p-6">
      <form onSubmit={onSubmit} className="max-w-md w-full p-8 rounded-2xl shadow-md bg-white">
        <h2 className="text-2xl font-bold mb-4 text-studio-primary">Nouveau mot de passe</h2>
        {error && <p role="alert" className="text-red-600 mb-2">{error}</p>}
        {ok && <p role="status" className="text-green-600 mb-2">Mot de passe réinitialisé. Redirection vers la connexion…</p>}
        <label className="block mb-2">Nouveau mot de passe</label>
        <PasswordInput value={password} onChangeAction={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" />
        <label className="block mb-2">Confirmer le mot de passe</label>
        <PasswordInput value={confirm} onChangeAction={(e) => setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" />
        <button
          disabled={!token || isSubmitting || ok}
          className="w-full py-2 rounded bg-studio-primary text-white font-bold disabled:opacity-50"
        >
          {isSubmitting ? 'Réinitialisation…' : 'Réinitialiser'}
        </button>
      </form>
    </div>
  )
}
