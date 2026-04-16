"use client"

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import React from 'react'

export default function DetailsFilterBar({ currentFilter }: { currentFilter: 'all' | 'services' | 'products' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = (f: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('filter', f)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 mb-4">
      <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${currentFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Tous</button>
      <button onClick={() => setFilter('services')} className={`px-3 py-1 rounded ${currentFilter === 'services' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Prestations uniquement</button>
      <button onClick={() => setFilter('products')} className={`px-3 py-1 rounded ${currentFilter === 'products' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Ventes uniquement</button>
    </div>
  )
}

