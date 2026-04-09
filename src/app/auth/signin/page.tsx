"use client"

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Remove legacy/old cookies (clear all cookies) to avoid v4/v5 cookie conflicts
    // This is a best-effort client-side cleanup performed just before signIn.
    try {
      document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"))
    } catch (e) {
      // ignore if running in constrained environments where document isn't available
    }

    // force redirect:false to handle redirect manually and avoid multiple automatic redirects
    const res = await signIn('credentials', { redirect: false, email, password })
    if (res?.error) setError(res.error)
    else if (res?.ok) {
      // If a callbackUrl is present in the query, ensure it's normalized to root
      try {
        const params = new URLSearchParams(window.location.search)
        const cb = params.get('callbackUrl')
        const target = cb ? new URL(cb, window.location.origin).pathname : '/'
        // avoid redirecting to another auth path
        if (target.startsWith('/auth')) {
          window.location.href = '/'
        } else {
          window.location.href = target
        }
      } catch {
        window.location.href = '/'
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-studio-bg">
      <form onSubmit={onSubmit} className="max-w-md w-full p-8 rounded-2xl shadow-md bg-white">
        <h2 className="text-2xl font-bold mb-4 text-studio-primary">Connexion</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="block mb-2">Email</label>
        <input className="w-full p-2 mb-4 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block mb-2">Mot de passe</label>
        <div className="relative mb-2">
          <input type={showPassword ? 'text' : 'password'} className="w-full p-2 border rounded pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-studio-muted">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="mb-4 text-right">
          <Link href="/auth/forgot-password" className="text-sm text-studio-primary hover:underline">Mot de passe oublié ?</Link>
        </div>
        <button className="w-full py-2 rounded bg-studio-primary text-white font-bold">Se connecter</button>
      </form>
    </div>
  )
}


