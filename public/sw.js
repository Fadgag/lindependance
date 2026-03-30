const CACHE_NAME = 'appointments-cache-v1'
const urlsToCache = ['/', '/api/appointments', '/api/staff', '/styles/globals.css']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response
      return fetch(request)
        .then((networkResponse) => {
          // Cache API responses for future offline use
          if (request.url.includes('/api/')) {
            const copy = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return networkResponse
        })
        .catch(() => caches.match('/'))
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k) })))
  )
})

