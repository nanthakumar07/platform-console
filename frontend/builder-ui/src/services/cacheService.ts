interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items in cache
  keyPrefix: string;
}

class CacheService {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheItem<any>>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      keyPrefix: 'app_cache_',
      ...config
    };
    this.memoryCache = new Map();
    this.cleanupExpired();
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.timestamp + item.expiry;
  }

  private cleanupExpired(): void {
    // Clean up memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean up localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed: CacheItem<any> = JSON.parse(item);
            if (this.isExpired(parsed)) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup localStorage cache:', error);
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const cacheKey = this.getKey(key);
    const expiry = ttl || this.config.defaultTTL;
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, cacheItem);

    // Manage memory cache size
    if (this.memoryCache.size > this.config.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    // Store in localStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to store data in localStorage:', error);
      // If localStorage is full, try to make space
      this.makeSpaceInLocalStorage();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      } catch (retryError) {
        console.error('Failed to store data even after cleanup:', retryError);
      }
    }
  }

  get<T>(key: string): T | null {
    const cacheKey = this.getKey(key);

    // Try memory cache first
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.data as T;
    } else if (memoryItem && this.isExpired(memoryItem)) {
      this.memoryCache.delete(cacheKey);
    }

    // Try localStorage
    try {
      const item = localStorage.getItem(cacheKey);
      if (item) {
        const parsed: CacheItem<T> = JSON.parse(item);
        if (!this.isExpired(parsed)) {
          // Restore to memory cache
          this.memoryCache.set(cacheKey, parsed);
          return parsed.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve data from localStorage:', error);
    }

    return null;
  }

  remove(key: string): void {
    const cacheKey = this.getKey(key);
    this.memoryCache.delete(cacheKey);
    
    try {
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to remove data from localStorage:', error);
    }
  }

  clear(): void {
    this.memoryCache.clear();
    
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  private makeSpaceInLocalStorage(): void {
    try {
      const items: Array<{ key: string; item: CacheItem<any> }> = [];
      
      // Collect all cache items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            items.push({
              key,
              item: JSON.parse(item)
            });
          }
        }
      }

      // Sort by timestamp (oldest first) and remove oldest 25%
      items.sort((a, b) => a.item.timestamp - b.item.timestamp);
      const toRemove = Math.ceil(items.length * 0.25);
      
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(items[i].key);
      }
    } catch (error) {
      console.warn('Failed to make space in localStorage:', error);
    }
  }

  getStats(): {
    memorySize: number;
    localStorageSize: number;
    maxSize: number;
  } {
    let localStorageSize = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.keyPrefix)) {
          localStorageSize++;
        }
      }
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error);
    }

    return {
      memorySize: this.memoryCache.size,
      localStorageSize,
      maxSize: this.config.maxSize
    };
  }
}

// Create singleton instances for different types of data
export const dashboardCache = new CacheService({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for dashboard data
  keyPrefix: 'dashboard_cache_',
  maxSize: 50
});

export const statisticsCache = new CacheService({
  defaultTTL: 15 * 60 * 1000, // 15 minutes for statistics
  keyPrefix: 'statistics_cache_',
  maxSize: 30
});

export const activityCache = new CacheService({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for activity feed
  keyPrefix: 'activity_cache_',
  maxSize: 100
});

export const userPreferencesCache = new CacheService({
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for user preferences
  keyPrefix: 'user_prefs_cache_',
  maxSize: 20
});

export default CacheService;
