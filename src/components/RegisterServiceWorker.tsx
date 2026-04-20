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
      const isProd = process.env.NODE_ENV === 'production'
      if (!isProd) {
        // En dev : désinscrire les SW existants pour éviter de servir des chunks obsolètes
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister().catch(() => { /* ignore */ }))
        }).catch(() => { /* ignore */ })
      } else {
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        if (!(window.isSecureContext || isLocalhost)) return

        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            // Le SW appelle skipWaiting() dans install → activation automatique sans fermer les onglets.
            // On écoute controllerchange : déclenché quand le nouveau SW prend le contrôle.
            // C'est le bon signal pour notifier l'utilisateur que les nouveaux assets sont disponibles.
            let refreshing = false
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              if (refreshing) return
              refreshing = true
              // Toast non-bloquant (iOS-safe) — window.confirm est ignoré sur les PWA iOS
              toast('Nouvelle version disponible.', {
                duration: Infinity,
                action: {
                  label: 'Actualiser',
                  onClick: () => window.location.reload()
                }
              })
            })

            // Cas rare : un SW waiting existait déjà (ex: onglet ouvert très longtemps).
            // On lui envoie SKIP_WAITING pour qu'il s'active maintenant.
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }

            // Surveiller les mises à jour futures (polling navigateur toutes les 24h ou à chaque navigation)
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (!newWorker) return
              // Le nouveau SW passera par install (skipWaiting) → activate → controllerchange
              // qui déclenchera le toast automatiquement. Rien à faire ici.
            })
          })
          .catch((err) => {
            clientError('Service worker registration failed', err)
          })
      }

      // Capture install prompt pour future UI "Ajouter à l'écran d'accueil"
      const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
        try {
          e.preventDefault()
          ;(window as unknown as { __deferredInstallPrompt?: BeforeInstallPromptEvent }).__deferredInstallPrompt = e
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