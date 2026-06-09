const CACHE_NAME = 'grafi-v1'
const STATIC_ASSETS = [
  '/dashboard',
  '/forum',
  '/chat',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only handle GET requests to same origin
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  // Skip Supabase API calls
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  )
})
