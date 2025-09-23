/**
 * Service Worker for MiniGamesHub
 * Provides caching, offline support, and performance optimization
 */

const CACHE_NAME = 'minigameshub-v202509231504';
const GAME_CACHE_NAME = 'minigameshub-games-v202509231504';
const API_CACHE_NAME = 'minigameshub-api-v202509231504';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/css/main.css',
    '/assets/js/gameData.js',
    '/assets/js/gameManager.js',
    '/assets/js/main.js',
    '/data/gameData.json',
    '/assets/images/favicon.ico',
    '/assets/images/apple-touch-icon.png',
    '/assets/images/favicon-32x32.png',
    '/assets/images/favicon-16x16.png',
    '/manifest.json',
    '/offline.html'
];

// Game files patterns
const GAME_PATTERNS = [
    /\/games\/.+\.html$/,
    /\/categories\/.+\.html$/,
    /img\.gamemonetize\.com/,
    /html5\.gamemonetize\.com/
];

// API patterns
const API_PATTERNS = [
    /\/api\/games/,
    /\/api\/categories/,
    /\/data\/.+\.json$/
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                // Force activate immediately
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Error caching static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== GAME_CACHE_NAME && 
                            cacheName !== API_CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                // Take control immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticAsset(request.url)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isGameRequest(request.url)) {
        event.respondWith(handleGameRequest(request));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(handleAPIRequest(request));
    } else {
        event.respondWith(handleOtherRequest(request));
    }
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.includes(asset)) ||
           url.includes('.css') ||
           url.includes('.js') ||
           url.includes('.json') ||
           url.includes('.png') ||
           url.includes('.jpg') ||
           url.includes('.svg') ||
           url.includes('.ico');
}

/**
 * Check if request is for game content
 */
function isGameRequest(url) {
    return GAME_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if request is for API
 */
function isAPIRequest(url) {
    return API_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Handle static asset requests - Cache First strategy
 */
async function handleStaticAsset(request) {
    const url = request.url;
    const isJS = url.endsWith('.js') || url.includes('.js?');
    const isCSS = url.endsWith('.css') || url.includes('.css?');

    // For critical assets (JS/CSS), prefer fresh network with cache fallback
    if (isJS || isCSS) {
        try {
            const networkResponse = await fetch(new Request(request, { cache: 'no-cache' }));
            if (networkResponse && networkResponse.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
                return networkResponse;
            }
        } catch (e) {
            // Ignore and try cache below
        }
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        return fetch(request);
    }

    // For other assets, use cache-first with background revalidation
    try {
        const cachedResponse = await caches.match(request);
        // Fire-and-forget background update
        fetch(new Request(request, { cache: 'no-cache' }))
            .then(networkResponse => {
                if (networkResponse && networkResponse.ok) {
                    caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
                }
            })
            .catch(() => {});

        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;

    } catch (error) {
        console.error('[SW] Error handling static asset:', error);
        if (request.url.includes('.html')) {
            return caches.match('/offline.html');
        }
        return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * Handle game requests - Network First with fallback
 */
async function handleGameRequest(request) {
    try {
        // Try network first for fresh content
        const networkResponse = await fetch(request);
        const isOpaqueResponse = networkResponse.type === 'opaque';

        if (networkResponse.ok || isOpaqueResponse) {
            // Cache successful responses (opaque caching best-effort)
            try {
                const cache = await caches.open(GAME_CACHE_NAME);
                await cache.put(request, networkResponse.clone());
            } catch (cacheError) {
                console.warn('[SW] Failed to cache game response:', cacheError);
            }

            return networkResponse;
        }

        throw new Error(`Network response not ok (status: ${networkResponse.status})`);

    } catch (error) {
        console.log('[SW] Network failed, trying cache for:', request.url, error);

        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return graceful error response to iframe requests
        return new Response('Game temporarily unavailable. Please try again later.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Handle API requests - Network First with cache fallback
 */
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request, {
            timeout: 3000 // 3 second timeout for API
        });
        
        if (networkResponse.ok) {
            // Cache API responses for 5 minutes
            const cache = await caches.open(API_CACHE_NAME);
            const cachedResponse = networkResponse.clone();
            
            // Add timestamp header for cache expiration
            const headers = new Headers(cachedResponse.headers);
            headers.set('sw-cache-timestamp', Date.now().toString());
            
            const modifiedResponse = new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers: headers
            });
            
            cache.put(request, modifiedResponse.clone());
            return networkResponse;
        }
        
        throw new Error('API response not ok');
        
    } catch (error) {
        console.log('[SW] API request failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Check if cache is still fresh (5 minutes)
            const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
            if (cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                const maxAge = 5 * 60 * 1000; // 5 minutes
                
                if (age < maxAge) {
                    return cachedResponse;
                }
            } else {
                // Return cached response if no timestamp (better than nothing)
                return cachedResponse;
            }
        }
        
        // Return error response
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handle other requests - Network only
 */
async function handleOtherRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        return new Response('Network error', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Background sync for analytics and user actions
self.addEventListener('sync', event => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'game-play-sync') {
        event.waitUntil(syncGamePlays());
    } else if (event.tag === 'favorites-sync') {
        event.waitUntil(syncFavorites());
    }
});

/**
 * Sync game plays when back online
 */
async function syncGamePlays() {
    try {
        // Get pending game plays from IndexedDB or localStorage
        const pendingPlays = JSON.parse(localStorage.getItem('pendingGamePlays') || '[]');
        
        for (const play of pendingPlays) {
            try {
                await fetch('/api/games/play', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(play)
                });
            } catch (error) {
                console.error('[SW] Failed to sync game play:', error);
            }
        }
        
        // Clear synced plays
        localStorage.removeItem('pendingGamePlays');
        console.log('[SW] Game plays synced successfully');
        
    } catch (error) {
        console.error('[SW] Error syncing game plays:', error);
    }
}

/**
 * Sync favorites when back online
 */
async function syncFavorites() {
    try {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        
        for (const favorite of pendingFavorites) {
            try {
                await fetch('/api/favorites', {
                    method: favorite.action === 'add' ? 'POST' : 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameId: favorite.gameId })
                });
            } catch (error) {
                console.error('[SW] Failed to sync favorite:', error);
            }
        }
        
        localStorage.removeItem('pendingFavorites');
        console.log('[SW] Favorites synced successfully');
        
    } catch (error) {
        console.error('[SW] Error syncing favorites:', error);
    }
}

// Handle push notifications (if implemented later)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/assets/images/icon-192.png',
            badge: '/assets/images/badge-72.png',
            image: data.image,
            vibrate: [200, 100, 200],
            data: data.data,
            actions: data.actions || []
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const data = event.notification.data;
    if (data && data.url) {
        event.waitUntil(
            clients.openWindow(data.url)
        );
    }
});

// Performance monitoring
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service worker loaded');
