"use client"

import React from 'react'
import { Package, Scissors } from 'lucide-react'
import type { CatalogItem } from '../../types/catalog'

export default function CatalogList({ items }: { items: CatalogItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((it) => (
        <div key={it.type + it.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              {it.type === 'PRODUCT' ? <Package size={16} /> : <Scissors size={16} />}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-800">{it.name}</div>
              <div className="text-xs text-slate-400">{it.type === 'PRODUCT' ? `${it.priceTTC?.toFixed?.(2) ?? '0.00'} €` : `${it.price?.toFixed?.(2) ?? '0.00'} €`}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


