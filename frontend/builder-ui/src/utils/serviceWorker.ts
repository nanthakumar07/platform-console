import React from 'react';

// Service Worker registration utility
export class ServiceWorkerManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;

  constructor() {
    if (this.isSupported) {
      this.register();
    }
  }

  async register(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Service Worker is not supported');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('Service Worker registered with scope:', this.swRegistration.scope);

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration!.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  private notifyUpdateAvailable(): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <span>New version available! Click to refresh.</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;

    // Add click handler to refresh
    notification.addEventListener('click', () => {
      if (this.swRegistration && this.swRegistration.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  async updateCache(url: string): Promise<void> {
    if (this.swRegistration && this.swRegistration.active) {
      this.swRegistration.active.postMessage({
        type: 'CACHE_UPDATE',
        url
      });
    }
  }

  async cleanupCache(): Promise<void> {
    if (this.swRegistration && this.swRegistration.active) {
      this.swRegistration.active.postMessage({
        type: 'CLEANUP_CACHE'
      });
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  getConnectionStatus(): {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  } {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt
    };
  }
}

// React Hook for Service Worker
export const useServiceWorker = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [swManager] = React.useState(() => new ServiceWorkerManager());
  const [connectionStatus, setConnectionStatus] = React.useState(swManager.getConnectionStatus());

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus(swManager.getConnectionStatus());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus(swManager.getConnectionStatus());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [swManager]);

  return {
    isOnline,
    connectionStatus,
    updateCache: swManager.updateCache.bind(swManager),
    cleanupCache: swManager.cleanupCache.bind(swManager),
  };
};

// Offline detection utility
export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [offlineSince, setOfflineSince] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineSince(null);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setOfflineSince(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOffline,
    offlineSince,
    isOnline: !isOffline
  };
};

// Background sync utility
export const useBackgroundSync = () => {
  const [syncQueue, setSyncQueue] = React.useState<any[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const addToSyncQueue = React.useCallback(async (request: Request) => {
    try {
      // This would interact with the service worker's sync queue
      // For now, we'll just store in local state
      const syncItem = {
        url: request.url,
        method: request.method,
        timestamp: new Date(),
        retryCount: 0
      };

      setSyncQueue(prev => [...prev, syncItem]);
      
      // Trigger background sync if supported
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const syncManager = (registration as any).sync;
        if (syncManager?.register) {
          await syncManager.register('sync-queue');
        }
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }, []);

  const clearSyncQueue = React.useCallback(() => {
    setSyncQueue([]);
  }, []);

  return {
    syncQueue,
    isSyncing,
    addToSyncQueue,
    clearSyncQueue,
    queueLength: syncQueue.length
  };
};

// Cache management utility
export const useCacheManagement = () => {
  const [cacheSize, setCacheSize] = React.useState(0);
  const [cacheEntries, setCacheEntries] = React.useState<string[]>([]);

  const getCacheInfo = React.useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        const entries: string[] = [];

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          
          entries.push(...keys.map(request => request.url));
          
          // Estimate cache size (this is approximate)
          for (const key of keys) {
            const response = await cache.match(key);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }

        setCacheSize(totalSize);
        setCacheEntries(entries);
      } catch (error) {
        console.error('Failed to get cache info:', error);
      }
    }
  }, []);

  const clearCache = React.useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        
        setCacheSize(0);
        setCacheEntries([]);
        
        console.log('All caches cleared');
      } catch (error) {
        console.error('Failed to clear caches:', error);
      }
    }
  }, []);

  React.useEffect(() => {
    getCacheInfo();
  }, [getCacheInfo]);

  return {
    cacheSize,
    cacheEntries,
    clearCache,
    refreshCacheInfo: getCacheInfo,
    formattedSize: formatBytes(cacheSize)
  };
};

// Format bytes utility
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default ServiceWorkerManager;
