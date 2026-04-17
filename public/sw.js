// SECURITY: cache version bump forces purge of any previously cached /api/ responses
const CACHE_NAME = 'appointments-cache-v2'
// Only cache the app shell — NEVER cache authenticated API endpoints
// (caching /api/* would cause IDOR: User A's data could be served to User B on a shared device)
const urlsToCache = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

// Allow the page to tell the SW to skipWaiting and activate immediately.
// Called by RegisterServiceWorker.tsx when the user clicks "Actualiser" in the toast.
self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // SECURITY: never intercept authenticated API calls — always go to the network
  if (request.url.includes('/api/')) return

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response
      return fetch(request)
        .catch(() => caches.match('/'))
    })
  )
})

// Single activate handler: purge stale caches AND claim clients atomically.
// Using Promise.all avoids a race condition between cache deletion and clients.claim().
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k) }))),
      self.clients.claim()
    ])
  )
})
