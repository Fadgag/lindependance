"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Note: name the prop ending with "Action" to signal server-action compatibility
export default function FloatingActionButton({ onClickAction, ariaLabel = 'Nouveau' }: { onClickAction?: () => void; ariaLabel?: string }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        // create (or reuse) a portal root attached to document.body so the FAB is not affected
        // by transformed/overflowed ancestors.
        let root = document.getElementById('fab-portal') as HTMLElement | null
        if (!root) {
          root = document.createElement('div')
          root.id = 'fab-portal'
          // pointer-events:none on the wrapper so it never accidentally captures events
          // outside the button itself (the button re-enables pointer-events:auto)
          root.style.pointerEvents = 'none'
          document.body.appendChild(root)
        }
        setPortalRoot(root)
      }
    } catch (e) {
      // ignore in SSR or env where document is not available
    }
    return () => {
      // keep portal root to avoid removing DOM nodes that other logic might rely on
    }
  }, [])

  if (!portalRoot) return null

  const button = (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid="floating-quick-rdv"
      onClick={onClickAction}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-atelier-primary text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      // inline styles to ensure visibility above any stacking context and enable pointer events
      style={{
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        zIndex: 2147483647,
        transform: 'none',
        pointerEvents: 'auto',
        // Fallback explicite : garantit la couleur même si bg-atelier-primary
        // n'est pas générée par Tailwind v4 (variable CSS absente du @theme)
        backgroundColor: 'var(--color-atelier-primary, #C5908E)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )

  return createPortal(button, portalRoot)
}


