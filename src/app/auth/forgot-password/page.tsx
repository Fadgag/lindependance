"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)
    if (!email) return setError('Veuillez saisir votre adresse email')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || 'Une erreur est survenue')
      } else {
        setOk(true)
        // optional: redirect to signin after a short delay
        setTimeout(() => router.push('/auth/signin'), 3500)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-studio-bg p-6">
      <form onSubmit={onSubmit} className="max-w-md w-full p-8 rounded-2xl shadow-md bg-white">
        <h2 className="text-2xl font-bold mb-4 text-studio-primary">Mot de passe oublié</h2>
        <p className="text-sm text-studio-muted mb-4">Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {ok && <div className="text-green-600 mb-2">Si l&apos;adresse existe, un email a été envoyé. Vous allez être redirigé(e).</div>}

        <label className="block mb-2">Email</label>
        <input className="w-full p-2 mb-4 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

        <button disabled={loading || ok} className="w-full py-2 rounded bg-studio-primary text-white font-bold">{loading ? 'Envoi...' : 'Envoyer le lien'}</button>

        <button type="button" onClick={() => router.push('/auth/signin')} className="w-full mt-3 py-2 rounded border border-gray-200 text-sm">Retour à la connexion</button>
      </form>
    </div>
  )
}


