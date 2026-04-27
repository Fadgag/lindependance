"use client"
import React from 'react'
import type { CustomerPackageSummary } from '@/types/models'

interface PackageSelectorProps {
  packages: CustomerPackageSummary[]
  usePackage: boolean
  setUsePackage: (v: boolean) => void
  selectedPackageId: string | null
  setSelectedPackageId: (id: string | null) => void
}

/** Sélecteur de forfait client dans le formulaire de RDV */
export function PackageSelector({ packages, usePackage, setUsePackage, selectedPackageId, setSelectedPackageId }: PackageSelectorProps) {
  if (packages.length === 0) return null

  return (
    <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={usePackage} onChange={(e) => setUsePackage(e.target.checked)} />
        <span className="text-sm font-bold">Utiliser une session de forfait</span>
      </label>
      {usePackage && (
        <div className="mt-2">
          <select
            value={selectedPackageId || ''}
            onChange={(e) => setSelectedPackageId(e.target.value || null)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Choisir un forfait...</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.package?.name || '') + ' — Reste ' + p.sessionsRemaining + ' session(s)'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

