"use client"

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import MobileSheet from './MobileSheet'

export default function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <header className="flex md:hidden items-center justify-between px-4 h-16 fixed top-0 left-0 right-0 bg-white border-b border-[var(--studio-border)] z-50">
                <div className="flex items-center gap-3">
                    <button
                        data-testid="mobile-burger-button"
                        aria-label="Ouvrir le menu principal"
                        aria-expanded={isOpen}
                        onClick={() => setIsOpen((v) => !v)}
                        className="p-2"
                    >
                        {isOpen ? <X /> : <Menu />}
                    </button>
                    <div className="font-serif text-lg">Atelier<span className="text-[var(--studio-primary)]">.</span></div>
                </div>
            </header>
            <MobileSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}



