// ============================================================
// POP-AVTO-MAKON — SERVICE WORKER
// ============================================================

const CACHE_VERSION = 'pam-v5';
const CACHE_NAME = 'pop-avto-makon-' + CACHE_VERSION;

const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// INSTALL
self.addEventListener('install', function(event) {
    console.log('[SW] O\'rnatilmoqda...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache).catch(function(err) {
                console.warn('[SW] Kesh xato:', err);
            });
        }).then(function() {
            console.log('[SW] O\'rnatildi');
            return self.skipWaiting();
        })
    );
});

// ACTIVATE
self.addEventListener('activate', function(event) {
    console.log('[SW] Faollashmoqda...');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName.indexOf('pop-avto-makon-') === 0 && cacheName !== CACHE_NAME) {
                        console.log('[SW] Eski kesh o\'chirildi:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            console.log('[SW] Faollashdi');
            return self.clients.claim();
        })
    );
});

// FETCH
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    var url = new URL(event.request.url);

    // Tashqi API'lar
    if (url.hostname.indexOf('supabase') !== -1 ||
        url.hostname.indexOf('cdn.jsdelivr') !== -1 ||
        url.hostname.indexOf('unsplash') !== -1 ||
        url.hostname.indexOf('pngimg') !== -1) {
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request);
            })
        );
        return;
    }

    // HTML — NETWORK FIRST
    if (event.request.mode === 'navigate' ||
        event.request.destination === 'document' ||
        url.pathname.indexOf('.html') !== -1 ||
        url.pathname === '/') {
        event.respondWith(
            fetch(event.request).then(function(response) {
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    return cached || caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Boshqa fayllar — CACHE FIRST
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request).then(function(response) {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
                return response;
            });
        })
    );
});

// MESSAGE
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});