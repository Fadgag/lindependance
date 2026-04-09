"use client"

import React, { useState } from 'react'

export default function PasswordInput({ value, onChangeAction, placeholder }: { value: string; onChangeAction: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative mb-4">
      <input type={visible ? 'text' : 'password'} className="w-full p-2 border rounded pr-10" value={value} onChange={onChangeAction} placeholder={placeholder} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-studio-muted">
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}



