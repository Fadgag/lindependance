// Cache version — bump only when changing the caching strategy itself.
// No need to change on every deployment because Next.js hashes JS/CSS filenames,
// and HTML pages are fetched network-first (always fresh).
const CACHE_NAME = 'app-cache-v3'

// ─── INSTALL ───────────────────────────────────────────────────────────────
// Pre-cache nothing on install. Assets are cached on first access (lazy fill).
self.addEventListener('install', (event) => {
  // Skip waiting immediately so the new SW activates without needing all tabs to close.
  self.skipWaiting()
})

// ─── MESSAGE ───────────────────────────────────────────────────────────────
// Allow the page to trigger activation immediately (toast "Actualiser" button).
self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // SECURITY: never intercept authenticated API calls
  if (url.pathname.startsWith('/api/')) return

  // /_next/static/ assets are content-hashed → cache-first (safe indefinitely)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }).catch(() => caches.match(request))
    )
    return
  }

  // All other GET requests (HTML pages, public assets) → network-first.
  // This ensures users always receive the latest HTML referencing current chunk hashes.
  // Falls back to cache only if the network is unavailable (offline support).
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful, non-opaque responses
        if (response.ok && response.type !== 'opaque') {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
// Purge stale caches AND claim clients atomically.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k) }))
      ),
      self.clients.claim()
    ])
  )
})
