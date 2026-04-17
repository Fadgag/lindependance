"use client"

import { useEffect } from 'react'
import { clientError } from '@/lib/clientLogger'
import { toast } from 'sonner'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function RegisterServiceWorker() {
  useEffect(() => {
    try {
      if (!('serviceWorker' in navigator)) return
      // Only register the service worker in production builds. In development
      // a previously installed SW can cause chunk load errors (stale cached
      // assets). If we're running in development, attempt to unregister any
      // existing service workers to avoid serving stale JS chunks.
      const isProd = process.env.NODE_ENV === 'production'
      if (!isProd) {
        // unregister existing service workers in dev to avoid cached chunks
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister().catch(() => { /* ignore */ }))
          if (process.env.NODE_ENV === 'development') console.info('[SW] Unregistered existing service workers (dev)')
        }).catch(() => { /* ignore */ })
      } else {
        // Allow registration on secure contexts or localhost (prod-preview)
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        if (!(window.isSecureContext || isLocalhost)) return

        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            if (process.env.NODE_ENV === 'production') console.info('[SW] Service worker registered for offline support')

            // If there's a waiting worker, prompt the user to refresh
            const notifyUpdate = (waitingWorker: ServiceWorker | null) => {
              if (!waitingWorker) return
              // Simple UX: use a confirm dialog to prompt user to apply update.
              // Using native confirm avoids dependency on toast API signatures here.
              try {
                const ok = window.confirm('Nouvelle version disponible — recharger pour appliquer les mises à jour ?')
                if (ok) {
                  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
                  // When the new SW takes control, reload to get fresh assets
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload()
                  })
                }
              } catch (e) {
                // Fallback: ensure page reload if anything goes wrong
                window.location.reload()
              }
            }

            if (registration.waiting) {
              notifyUpdate(registration.waiting)
            }

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (!newWorker) return
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available
                  notifyUpdate(registration.waiting)
                }
              })
            })
          })
          .catch((err) => {
            clientError('Service worker registration failed', err)
          })
      }

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

