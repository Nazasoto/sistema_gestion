// Service Worker para cachear recursos y mejorar performance en recargas
const CACHE_NAME = 'sistema-tickets-v1';
const STATIC_CACHE = 'static-v1';

// Recursos críticos que siempre deben estar cacheados
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Recursos estáticos que se cachean por mucho tiempo
const STATIC_RESOURCES = [
  // Se llenarán automáticamente durante el build
];

// Install event - cachear recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(CRITICAL_RESOURCES)),
      caches.open(STATIC_CACHE)
    ]).then(() => {
      console.log('Service Worker instalado y recursos críticos cacheados');
      self.skipWaiting();
    })
  );
});

// Activate event - limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activado');
      return self.clients.claim();
    })
  );
});

// Fetch event - estrategia de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar requests del mismo origen
  if (url.origin !== location.origin) {
    return;
  }

  // Estrategia para diferentes tipos de recursos
  if (request.destination === 'document') {
    // HTML: Network first, fallback to cache
    event.respondWith(networkFirstStrategy(request));
  } else if (request.url.includes('/assets/') || request.url.includes('/js/') || request.url.includes('/css/')) {
    // Assets estáticos: Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.url.includes('/api/')) {
    // API calls: Network only (no cachear)
    return;
  } else {
    // Otros recursos: Stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Estrategia Network First (para HTML)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Estrategia Cache First (para assets estáticos)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch resource:', request.url);
    return new Response('Resource not available', { status: 404 });
  }
}

// Estrategia Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(async networkResponse => {
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      // Clone the response before using it
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}
