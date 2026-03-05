import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import React, { useEffect } from 'react';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// React Query Provider wrapper
export const ReactQueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// Custom hooks for dashboard data
export const useDashboardData = (tenantId?: string) => {
  return useQuery({
    queryKey: ['dashboard', tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard${tenantId ? `?tenantId=${tenantId}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
    enabled: !!tenantId,
  });
};

export const useDashboardAnalytics = (params: {
  tenantId?: string;
  timeRange?: string;
  metrics?: string[];
}) => {
  const { tenantId, timeRange = '24h', metrics = ['views', 'updates'] } = params;
  
  return useQuery({
    queryKey: ['dashboard-analytics', tenantId, timeRange, metrics],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        timeRange,
        metrics: metrics.join(','),
        ...(tenantId && { tenantId }),
      });
      
      const response = await fetch(`/api/dashboard/analytics?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for analytics
    enabled: !!tenantId,
  });
};

export const usePerformanceMetrics = (params: {
  tenantId?: string;
  timeRange?: string;
}) => {
  const { tenantId, timeRange = '24h' } = params;
  
  return useQuery({
    queryKey: ['performance-metrics', tenantId, timeRange],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        timeRange,
        ...(tenantId && { tenantId }),
      });
      
      const response = await fetch(`/api/dashboard/performance?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute for performance metrics
    enabled: !!tenantId,
  });
};

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/health');
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds for health data
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

// Mutations for dashboard operations
export const useUpdateDashboard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/dashboard', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update dashboard');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Invalidate analytics as they might be affected
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
      
      // Show success notification
      if (variables.onSuccess) {
        variables.onSuccess(data);
      }
    },
    onError: (error, variables) => {
      // Show error notification
      if (variables.onError) {
        variables.onError(error);
      }
    },
  });
};

export const useSubscribeToDashboard = () => {
  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const response = await fetch(`/api/dashboard/${dashboardId}/subscribe`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to subscribe to dashboard');
      }
      
      return response.json();
    },
    onSuccess: (data, dashboardId) => {
      console.log('Subscribed to dashboard:', dashboardId);
    },
    onError: (error) => {
      console.error('Failed to subscribe to dashboard:', error);
    },
  });
};

// Advanced caching hooks
export const useCachedData = <T>(
  key: string[],
  fetcher: () => Promise<T>,
  options?: {
    staleTime?: number;
    cacheTime?: number;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    staleTime: options?.staleTime || 5 * 60 * 1000,
    gcTime: options?.cacheTime || 10 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
};

// Prefetching utility
export const usePrefetchOnHover = <T>(
  key: string[],
  fetcher: () => Promise<T>,
  options?: {
    staleTime?: number;
  }
) => {
  const queryClient = useQueryClient();
  
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: fetcher,
      staleTime: options?.staleTime || 5 * 60 * 1000,
    });
  };
  
  return { prefetch };
};

// Infinite scroll hook
export const useInfiniteData = <T>(
  key: string[],
  fetcher: (pageParam: number) => Promise<{ data: T[]; nextPage?: number }>,
  options?: {
    staleTime?: number;
    enabled?: boolean;
  }
) => {
  return useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => fetcher(pageParam as number),
    staleTime: options?.staleTime || 5 * 60 * 1000,
    enabled: options?.enabled !== false,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

// Background refetch hook
export const useBackgroundRefetch = (
  key: string[],
  interval: number = 60000 // 1 minute default
) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: key });
    }, interval);
    
    return () => clearInterval(intervalId);
  }, [key, interval, queryClient]);
};

// Optimistic updates hook
export const useOptimisticUpdate = <T>(
  key: string[],
  updateFn: (oldData: T | undefined, newData: T) => T
) => {
  const queryClient = useQueryClient();
  
  const mutate = (newData: T) => {
    queryClient.setQueryData(key, (oldData: T | undefined) => 
      updateFn(oldData, newData)
    );
  };
  
  return { mutate };
};

// Cache utilities
export const cacheUtils = {
  // Clear all cache
  clearAll: () => queryClient.clear(),
  
  // Invalidate specific queries
  invalidate: (key: string[]) => 
    queryClient.invalidateQueries({ queryKey: key }),
  
  // Remove specific queries from cache
  remove: (key: string[]) => 
    queryClient.removeQueries({ queryKey: key }),
  
  // Prefetch data
  prefetch: async <T>(key: string[], fetcher: () => Promise<T>) => {
    await queryClient.prefetchQuery({
      queryKey: key,
      queryFn: fetcher,
    });
  },
  
  // Get cached data
  getCachedData: <T>(key: string[]) => 
    queryClient.getQueryData<T>(key),
  
  // Set cached data
  setCachedData: <T>(key: string[], data: T) => 
    queryClient.setQueryData(key, data),
};

export default ReactQueryProvider;
