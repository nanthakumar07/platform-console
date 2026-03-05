// Service Worker for offline support
const CACHE_NAME = 'dashboard-app-v1';
const STATIC_CACHE_NAME = 'static-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets as needed
];

// API endpoints to cache
const CACHEABLE_PATTERNS = [
  /^\/api\/dashboard/,
  /^\/api\/analytics/,
  /^\/api\/performance/,
];

// Network timeout for API requests
const NETWORK_TIMEOUT = 10000; // 10 seconds

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Old caches cleaned up');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('Failed to clean up caches:', error);
      })
  );
});

// Fetch event - handle requests with offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static file requests
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle other requests (POST, PUT, DELETE, etc.)
  event.respondWith(handleOtherRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this is a cacheable API request
  const isCacheable = CACHEABLE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (!isCacheable) {
    // Non-cacheable API requests - try network only
    try {
      const response = await fetchWithTimeout(request);
      return response;
    } catch (error) {
      console.error('Network request failed:', error);
      return new Response(
        JSON.stringify({ error: 'Network request failed', offline: true }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    // Try network first
    const networkResponse = await fetchWithTimeout(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response if no cache available
    return new Response(
      JSON.stringify({ 
        error: 'Offline - No cached data available', 
        offline: true,
        timestamp: new Date().toISOString()
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle static file requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Static request failed:', error);
    
    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html') || new Response('Offline', { status: 503 });
    }
    
    // Return error for other requests
    return new Response('Offline', { status: 503 });
  }
}

// Handle other requests (POST, PUT, DELETE, etc.)
async function handleOtherRequest(request) {
  try {
    // Try network
    const response = await fetchWithTimeout(request);
    return response;
  } catch (error) {
    console.log('Request failed, queuing for sync:', error);
    
    // Queue request for background sync
    await queueRequestForSync(request);
    
    return new Response(
      JSON.stringify({ 
        error: 'Request queued for sync when online', 
        offline: true,
        timestamp: new Date().toISOString()
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Fetch with timeout
function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, NETWORK_TIMEOUT);

    fetch(request)
      .then((response) => {
        clearTimeout(timeout);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

// Queue request for background sync
async function queueRequestForSync(request) {
  try {
    const db = await openDB();
    const tx = db.transaction(['sync-queue'], 'readwrite');
    const store = tx.objectStore('sync-queue');
    
    await store.add({
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await request.text()
      },
      timestamp: Date.now(),
      retryCount: 0
    });
    
    console.log('Request queued for sync:', request.url);
  } catch (error) {
    console.error('Failed to queue request for sync:', error);
  }
}

// Open IndexedDB for sync queue
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dashboard-sync-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('retryCount', 'retryCount');
      }
    };
  });
}

// Background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});

// Process sync queue
async function processSyncQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(['sync-queue'], 'readwrite');
    const store = tx.objectStore('sync-queue');
    
    const requests = await store.getAll();
    
    for (const queuedRequest of requests) {
      try {
        // Recreate the request
        const request = new Request(queuedRequest.request.url, {
          method: queuedRequest.request.method,
          headers: queuedRequest.request.headers,
          body: queuedRequest.request.body
        });
        
        // Try to send the request
        const response = await fetch(request);
        
        if (response.ok) {
          // Remove from queue on success
          await store.delete(queuedRequest.id);
          console.log('Synced request:', queuedRequest.request.url);
        } else {
          // Increment retry count
          queuedRequest.retryCount++;
          await store.put(queuedRequest);
          
          // Remove if max retries exceeded
          if (queuedRequest.retryCount >= 3) {
            await store.delete(queuedRequest.id);
            console.log('Max retries exceeded for:', queuedRequest.request.url);
          }
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
        
        // Increment retry count
        queuedRequest.retryCount++;
        await store.put(queuedRequest);
        
        // Remove if max retries exceeded
        if (queuedRequest.retryCount >= 3) {
          await store.delete(queuedRequest.id);
        }
      }
    }
    
    console.log('Sync queue processed');
  } catch (error) {
    console.error('Failed to process sync queue:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Dashboard Notification', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Message from main thread:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Update specific cache
    updateCache(event.data.url);
  }
});

// Update specific cache
async function updateCache(url) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = await fetch(url);
    
    if (response.ok) {
      await cache.put(url, response);
      console.log('Cache updated for:', url);
    }
  } catch (error) {
    console.error('Failed to update cache:', error);
  }
}

// Cleanup old cache entries
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    cleanupCache();
  }
});

async function cleanupCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();
    
    // Remove entries older than 24 hours
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response?.headers.get('date');
      
      if (dateHeader) {
        const responseTime = new Date(dateHeader).getTime();
        
        if (responseTime < cutoffTime) {
          await cache.delete(request);
          console.log('Removed old cache entry:', request.url);
        }
      }
    }
    
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  }
}

console.log('Service Worker loaded successfully');
