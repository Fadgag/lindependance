"use client"

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await signIn('credentials', { redirect: false, email, password })
    if (res?.error) setError(res.error)
    else if (res?.ok) {
      // redirect to home
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <form onSubmit={onSubmit} className="max-w-md w-full p-8 rounded-2xl shadow-md bg-white">
        <h2 className="text-2xl font-bold mb-4 text-[#D4A3A1]">Connexion</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="block mb-2">Email</label>
        <input className="w-full p-2 mb-4 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block mb-2">Mot de passe</label>
        <input type="password" className="w-full p-2 mb-4 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full py-2 rounded bg-[#D4A3A1] text-white font-bold">Se connecter</button>
      </form>
    </div>
  )
}

