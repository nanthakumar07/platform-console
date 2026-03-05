import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './auth';

export interface GrowthTrend {
  date: string;
  objects: number;
  fields: number;
  relations: number;
}

export interface UsageAnalytics {
  mostPopularObjects: Array<{
    objectId: string;
    objectName: string;
    fieldCount: number;
    relationCount: number;
    usageScore: number;
  }>;
  fieldTypesDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  relationTypesDistribution: Array<{
    type: 'LOOKUP' | 'MASTER_DETAIL' | 'M2M';
    count: number;
    percentage: number;
  }>;
}

export interface StorageMetrics {
  totalObjects: number;
  totalFields: number;
  totalRelations: number;
  estimatedStorageUsage: {
    objects: number; // in KB
    fields: number; // in KB
    relations: number; // in KB
    total: number; // in KB
  };
  averageFieldsPerObject: number;
  averageRelationsPerObject: number;
}

export interface PerformanceIndicators {
  apiResponseTimes: Array<{
    endpoint: string;
    avgResponseTime: number; // in ms
    requestCount: number;
    errorRate: number; // percentage
  }>;
  systemHealth: {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    metadata: 'excellent' | 'good' | 'fair' | 'poor';
    database: 'excellent' | 'good' | 'fair' | 'poor';
    api: 'excellent' | 'good' | 'fair' | 'poor';
  };
  recentPerformance: Array<{
    timestamp: string;
    responseTime: number;
    requestCount: number;
  }>;
}

export interface EnhancedStatistics {
  growthTrends: GrowthTrend[];
  usageAnalytics: UsageAnalytics;
  storageMetrics: StorageMetrics;
  performanceIndicators: PerformanceIndicators;
  summary: {
    totalObjects: number;
    totalFields: number;
    totalRelations: number;
    growthRate: {
      objects: number; // percentage
      fields: number; // percentage
      relations: number; // percentage
    };
  };
}

class StatisticsService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Setup response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshResponse = await authService.refreshTokens();
            if (refreshResponse.success && refreshResponse.token) {
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            await authService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async getEnhancedStatistics(tenantId: string): Promise<EnhancedStatistics> {
    try {
      const url = `/api/v1/statistics/${tenantId}/enhanced`;
      const response: AxiosResponse<{success: boolean; data: EnhancedStatistics}> = await this.api.get(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch enhanced statistics:', error);
      // Return mock data if API fails
      return this.getMockStatistics();
    }
  }

  async getGrowthTrends(tenantId?: string, days: number = 30): Promise<GrowthTrend[]> {
    try {
      const url = tenantId 
        ? `/api/v1/statistics/growth-trends?tenantId=${tenantId}&days=${days}` 
        : `/api/v1/statistics/growth-trends?days=${days}`;
      const response: AxiosResponse<GrowthTrend[]> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch growth trends:', error);
      return this.getMockGrowthTrends(days);
    }
  }

  async getUsageAnalytics(tenantId?: string): Promise<UsageAnalytics> {
    try {
      const url = tenantId 
        ? `/api/v1/statistics/usage-analytics?tenantId=${tenantId}` 
        : '/api/v1/statistics/usage-analytics';
      const response: AxiosResponse<UsageAnalytics> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch usage analytics:', error);
      return this.getMockUsageAnalytics();
    }
  }

  async getStorageMetrics(tenantId?: string): Promise<StorageMetrics> {
    try {
      const url = tenantId 
        ? `/api/v1/statistics/storage-metrics?tenantId=${tenantId}` 
        : '/api/v1/statistics/storage-metrics';
      const response: AxiosResponse<StorageMetrics> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch storage metrics:', error);
      return this.getMockStorageMetrics();
    }
  }

  async getPerformanceIndicators(tenantId?: string): Promise<PerformanceIndicators> {
    try {
      const url = tenantId 
        ? `/api/v1/statistics/performance?tenantId=${tenantId}` 
        : '/api/v1/statistics/performance';
      const response: AxiosResponse<PerformanceIndicators> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch performance indicators:', error);
      return this.getMockPerformanceIndicators();
    }
  }

  // Mock data generators for development/fallback
  private getMockStatistics(): EnhancedStatistics {
    return {
      growthTrends: this.getMockGrowthTrends(30),
      usageAnalytics: this.getMockUsageAnalytics(),
      storageMetrics: this.getMockStorageMetrics(),
      performanceIndicators: this.getMockPerformanceIndicators(),
      summary: {
        totalObjects: 12,
        totalFields: 45,
        totalRelations: 8,
        growthRate: {
          objects: 15.5,
          fields: 22.3,
          relations: 8.7
        }
      }
    };
  }

  private getMockGrowthTrends(days: number): GrowthTrend[] {
    const trends: GrowthTrend[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        objects: Math.max(1, Math.floor(12 - i * 0.2 + Math.random() * 2)),
        fields: Math.max(5, Math.floor(45 - i * 0.8 + Math.random() * 5)),
        relations: Math.max(1, Math.floor(8 - i * 0.1 + Math.random() * 2))
      });
    }
    
    return trends;
  }

  private getMockUsageAnalytics(): UsageAnalytics {
    return {
      mostPopularObjects: [
        { objectId: '1', objectName: 'Customer', fieldCount: 12, relationCount: 3, usageScore: 95 },
        { objectId: '2', objectName: 'Order', fieldCount: 8, relationCount: 2, usageScore: 87 },
        { objectId: '3', objectName: 'Product', fieldCount: 6, relationCount: 1, usageScore: 72 },
        { objectId: '4', objectName: 'Invoice', fieldCount: 10, relationCount: 2, usageScore: 68 }
      ],
      fieldTypesDistribution: [
        { type: 'TEXT', count: 18, percentage: 40.0 },
        { type: 'NUMBER', count: 8, percentage: 17.8 },
        { type: 'DATE', count: 6, percentage: 13.3 },
        { type: 'BOOLEAN', count: 5, percentage: 11.1 },
        { type: 'EMAIL', count: 4, percentage: 8.9 },
        { type: 'PICKLIST', count: 4, percentage: 8.9 }
      ],
      relationTypesDistribution: [
        { type: 'LOOKUP', count: 5, percentage: 62.5 },
        { type: 'MASTER_DETAIL', count: 2, percentage: 25.0 },
        { type: 'M2M', count: 1, percentage: 12.5 }
      ]
    };
  }

  private getMockStorageMetrics(): StorageMetrics {
    const totalObjects = 12;
    const totalFields = 45;
    const totalRelations = 8;
    
    return {
      totalObjects,
      totalFields,
      totalRelations,
      estimatedStorageUsage: {
        objects: totalObjects * 2.5, // ~2.5KB per object
        fields: totalFields * 0.8, // ~0.8KB per field
        relations: totalRelations * 1.2, // ~1.2KB per relation
        total: totalObjects * 2.5 + totalFields * 0.8 + totalRelations * 1.2
      },
      averageFieldsPerObject: Math.round(totalFields / totalObjects * 10) / 10,
      averageRelationsPerObject: Math.round(totalRelations / totalObjects * 10) / 10
    };
  }

  private getMockPerformanceIndicators(): PerformanceIndicators {
    return {
      apiResponseTimes: [
        { endpoint: 'GET /objects', avgResponseTime: 145, requestCount: 1250, errorRate: 0.8 },
        { endpoint: 'GET /fields', avgResponseTime: 89, requestCount: 890, errorRate: 0.4 },
        { endpoint: 'POST /objects', avgResponseTime: 234, requestCount: 156, errorRate: 2.1 },
        { endpoint: 'PUT /objects', avgResponseTime: 198, requestCount: 234, errorRate: 1.2 }
      ],
      systemHealth: {
        overall: 'good',
        metadata: 'excellent',
        database: 'good',
        api: 'good'
      },
      recentPerformance: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        responseTime: 120 + Math.random() * 80,
        requestCount: Math.floor(50 + Math.random() * 100)
      }))
    };
  }
}

// Create singleton instance
export const statisticsService = new StatisticsService();
