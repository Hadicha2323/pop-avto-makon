/* ============ SERVICE WORKER — AVTOMATIK YANGILANISH ============ */

// Har yangilanishda bu raqamni oshiring
const CACHE_VERSION = 'pam-v3';
const CACHE_NAME = `pop-avto-makon-${CACHE_VERSION}`;

const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// INSTALL
self.addEventListener('install', event => {
    console.log('📦 Service Worker: O\'rnatilmoqda...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache).catch(err => console.warn('Kesh xato:', err)))
            .then(() => {
                console.log('✅ Service Worker o\'rnatildi');
                return self.skipWaiting();
            })
    );
});

// ACTIVATE
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Faollashmoqda...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName.startsWith('pop-avto-makon-') && cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eski kesh o\'chirildi:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker faollashdi');
            return self.clients.claim();
        })
    );
});

// FETCH — NETWORK FIRST (yangi versiya ustuvor)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Tashqi API'lar — tarmoqdan
    if (url.hostname.includes('supabase') || 
        url.hostname.includes('cdn.jsdelivr') ||
        url.hostname.includes('unsplash') ||
        url.hostname.includes('pngimg')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }

    // HTML — NETWORK FIRST (har doim yangi)
    if (event.request.mode === 'navigate' || 
        event.request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(cached => {
                        return cached || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Boshqa fayllar — CACHE FIRST
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                return response;
            });
        })
    );
});

// MESSAGE
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});