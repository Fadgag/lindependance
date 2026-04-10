"use client"

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import MobileNav from './MobileNav'
import { usePathname } from 'next/navigation'

export default function MobileSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    const pathname = usePathname()
    // close sheet when navigation changes
    // RAISON: onClose est un callback client-to-client utilisé uniquement pour fermer
    // le tiroir localement ; il n'est pas exposé au serveur. Nous fermons le tiroir
    // dès que le pathname change afin d'éviter d'avoir le drawer ouvert après
    // une navigation. Cette dépendance intentionally omits `onClose` (stable setter
    // from parent) — c'est acceptable côté client.
    useEffect(() => {
        if (isOpen) onClose()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname])

    return (
        <>
            {/* Backdrop */}
            <div
                data-testid="mobile-sheet-backdrop"
                onClick={onClose}
                className={`fixed inset-0 bg-black/40 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} z-40`}
            />

            <div
                data-testid="mobile-sheet"
                role="dialog"
                aria-modal="true"
                className={`fixed inset-y-0 left-0 z-50 w-80 max-w-full transform transition-transform duration-300 border-r border-[var(--studio-border)] shadow-lg ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{ backgroundColor: 'var(--studio-bg, #ffffff)' }}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--studio-border)]">
                    <div className="font-bold">Menu</div>
                    <button aria-label="Fermer le menu" onClick={onClose} className="p-2">
                        <X />
                    </button>
                </div>
                <div className="overflow-y-auto h-full">
                    <MobileNav />
                </div>
            </div>
        </>
    )
}



