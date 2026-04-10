"use client"

import { useEffect } from 'react'
import { clientError } from '@/lib/clientLogger'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function RegisterServiceWorker() {
  useEffect(() => {
    try {
      if (!('serviceWorker' in navigator)) return

      // Allow registration on secure contexts or localhost (dev)
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      if (!(window.isSecureContext || isLocalhost)) return

      navigator.serviceWorker.register('/sw.js')
        .then(() => {
          // dev-only diagnostic — no toast shown to end user
          if (process.env.NODE_ENV === 'development') console.info('[SW] Service worker registered for offline support')
        })
        .catch((_err) => {
          clientError('Service worker registration failed', _err)
        })

      // Capture install prompt for later UI (if desired by app)
      const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
        try {
          e.preventDefault()
          // store the event for UI to trigger install prompt later
          ;(window as unknown as { __deferredInstallPrompt?: BeforeInstallPromptEvent }).__deferredInstallPrompt = e
          // dev-only diagnostic — no toast shown to end user
          if (process.env.NODE_ENV === 'development') console.info('[SW] App can be installed via browser UI')
        } catch {
          // noop
        }
      }

      window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener)

      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener)
      }
    } catch {
      // avoid leaking errors in production
    }
  }, [])

  return null
}

