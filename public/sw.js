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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k) })))
  )
})

