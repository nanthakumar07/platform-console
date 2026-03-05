import { Logger } from '../utils/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface RequestMetrics {
  requestId: string;
  type: string;
  userId?: string;
  tenantId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: any;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    activeConnections: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  components: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    websocket: 'healthy' | 'degraded' | 'unhealthy';
    cache: 'healthy' | 'degraded' | 'unhealthy';
    externalApis: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  };
}

export class PerformanceService {
  private logger: Logger;
  private metrics: PerformanceMetric[] = [];
  private requests: Map<string, RequestMetrics> = new Map();
  private systemMetrics: SystemHealth['metrics'] = {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    activeConnections: 0,
    requestsPerSecond: 0,
    averageResponseTime: 0,
    errorRate: 0
  };
  private metricsRetention = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.logger = new Logger('PerformanceService');
    
    // Start periodic cleanup
    setInterval(() => {
      this.cleanupOldMetrics();
    }, this.cleanupInterval);

    // Start system monitoring
    this.startSystemMonitoring();
  }

  /**
   * Start tracking a request
   */
  startRequest(type: string, userId?: string, tenantId?: string): string {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const requestMetrics: RequestMetrics = {
      requestId,
      type,
      userId,
      tenantId,
      startTime
    };

    this.requests.set(requestId, requestMetrics);

    return requestId;
  }

  /**
   * End tracking a request
   */
  endRequest(requestId: string, startTime: number): void {
    const request = this.requests.get(requestId);
    if (request) {
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.success = true;

      // Record response time metric
      this.recordMetric('response_time', request.duration, {
        userId: request.userId,
        tenantId: request.tenantId,
        component: request.type
      });

      // Update system metrics
      this.updateSystemMetrics(request);

      this.requests.delete(requestId);
    }
  }

  /**
   * Record an error for a request
   */
  recordError(requestType: string, error: any, userId?: string, tenantId?: string): void {
    // Find the most recent request of this type for this user
    const recentRequest = Array.from(this.requests.values())
      .filter(req => req.type === requestType && req.userId === userId)
      .sort((a, b) => b.startTime - a.startTime)[0];

    if (recentRequest) {
      recentRequest.success = false;
      recentRequest.error = error;
      recentRequest.endTime = Date.now();
      recentRequest.duration = recentRequest.endTime - recentRequest.startTime;
    }

    // Record error metric
    this.recordMetric('error', 1, {
      userId,
      tenantId,
      component: requestType,
      metadata: { error: error.message || error }
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, options?: {
    userId?: string;
    tenantId?: string;
    component?: string;
    metadata?: Record<string, any>;
  }): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      userId: options?.userId,
      tenantId: options?.tenantId,
      component: options?.component,
      metadata: options?.metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    const cutoffTime = Date.now() - this.metricsRetention;
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get metrics for analysis
   */
  getMetrics(filters?: {
    tenantId?: string;
    userId?: string;
    component?: string;
    timeRange?: string;
    metricNames?: string[];
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics];

    if (filters) {
      if (filters.tenantId) {
        filteredMetrics = filteredMetrics.filter(m => m.tenantId === filters.tenantId);
      }

      if (filters.userId) {
        filteredMetrics = filteredMetrics.filter(m => m.userId === filters.userId);
      }

      if (filters.component) {
        filteredMetrics = filteredMetrics.filter(m => m.component === filters.component);
      }

      if (filters.metricNames) {
        filteredMetrics = filteredMetrics.filter(m => filters.metricNames!.includes(m.name));
      }

      if (filters.timeRange) {
        const cutoffTime = this.getDateFilter(filters.timeRange);
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= cutoffTime);
      }
    }

    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(filters?: {
    tenantId?: string;
    component?: string;
    timeRange?: string;
  }): Record<string, any> {
    const metrics = this.getMetrics(filters);
    const aggregated: Record<string, any> = {};

    // Group by metric name
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics for each metric
    for (const [name, values] of Object.entries(grouped)) {
      const sorted = values.sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);

      aggregated[name] = {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }

    return aggregated;
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      status: 'healthy',
      timestamp: new Date(),
      metrics: this.systemMetrics,
      components: {
        database: await this.checkDatabaseHealth(),
        websocket: await this.checkWebSocketHealth(),
        cache: await this.checkCacheHealth(),
        externalApis: await this.checkExternalApiHealth()
      }
    };

    // Determine overall health status
    const componentStatuses = Object.values(health.components);
    const unhealthyCount = componentStatuses.filter(status => status === 'unhealthy').length;
    const degradedCount = componentStatuses.filter(status => status === 'degraded').length;

    if (unhealthyCount > 0) {
      health.status = 'unhealthy';
    } else if (degradedCount > 0 || this.systemMetrics.errorRate > 5) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeRange?: string): any {
    const metrics = this.getMetrics({ timeRange });
    const requests = Array.from(this.requests.values());

    return {
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success !== false).length,
      failedRequests: requests.filter(r => r.success === false).length,
      averageResponseTime: this.calculateAverageResponseTime(metrics),
      requestsPerSecond: this.calculateRequestsPerSecond(metrics),
      errorRate: this.calculateErrorRate(requests),
      topEndpoints: this.getTopEndpoints(metrics),
      systemMetrics: this.systemMetrics
    };
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(request: RequestMetrics): void {
    if (request.duration) {
      // Update average response time
      const responseTimes = this.metrics
        .filter(m => m.name === 'response_time')
        .slice(-100) // Last 100 requests
        .map(m => m.value);

      this.systemMetrics.averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
    }

    // Update requests per second
    const recentRequests = Array.from(this.requests.values())
      .filter(r => r.startTime > Date.now() - 60000); // Last minute

    this.systemMetrics.requestsPerSecond = recentRequests.length / 60;

    // Update error rate
    const totalRecentRequests = Array.from(this.requests.values())
      .filter(r => r.startTime > Date.now() - 300000); // Last 5 minutes

    const errorCount = totalRecentRequests.filter(r => r.success === false).length;
    this.systemMetrics.errorRate = totalRecentRequests.length > 0
      ? (errorCount / totalRecentRequests.length) * 100
      : 0;
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // In a real implementation, these would use system monitoring libraries
      // For now, we'll use mock data
      this.systemMetrics.cpu = Math.random() * 100;
      this.systemMetrics.memory = Math.random() * 100;
      this.systemMetrics.disk = Math.random() * 100;
      this.systemMetrics.network = Math.random() * 100;
      this.systemMetrics.activeConnections = Math.floor(Math.random() * 1000);

      // Record system metrics
      this.recordMetric('cpu_usage', this.systemMetrics.cpu, { component: 'system' });
      this.recordMetric('memory_usage', this.systemMetrics.memory, { component: 'system' });
      this.recordMetric('disk_usage', this.systemMetrics.disk, { component: 'system' });
      this.recordMetric('network_usage', this.systemMetrics.network, { component: 'system' });
    } catch (error) {
      this.logger.error('Failed to collect system metrics', { error });
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // In a real implementation, this would check database connectivity
      // For now, we'll return healthy
      return 'healthy';
    } catch (error) {
      this.logger.error('Database health check failed', { error });
      return 'unhealthy';
    }
  }

  /**
   * Check WebSocket health
   */
  private async checkWebSocketHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // In a real implementation, this would check WebSocket server status
      return 'healthy';
    } catch (error) {
      this.logger.error('WebSocket health check failed', { error });
      return 'unhealthy';
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // In a real implementation, this would check cache connectivity
      return 'healthy';
    } catch (error) {
      this.logger.error('Cache health check failed', { error });
      return 'unhealthy';
    }
  }

  /**
   * Check external API health
   */
  private async checkExternalApiHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'unhealthy'>> {
    const apis = ['auth-service', 'analytics-service', 'collaboration-service'];
    const health: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};

    for (const api of apis) {
      try {
        // In a real implementation, this would ping each API
        health[api] = 'healthy';
      } catch (error) {
        this.logger.error(`API health check failed for ${api}`, { error });
        health[api] = 'unhealthy';
      }
    }

    return health;
  }

  /**
   * Cleanup old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.metricsRetention;
    const initialCount = this.metrics.length;

    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);

    const cleanedCount = initialCount - this.metrics.length;
    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old metrics`);
    }
  }

  /**
   * Helper methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDateFilter(timeRange?: string): Date {
    const now = new Date();
    
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateAverageResponseTime(metrics: PerformanceMetric[]): number {
    const responseTimes = metrics
      .filter(m => m.name === 'response_time')
      .map(m => m.value);

    return responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  }

  private calculateRequestsPerSecond(metrics: PerformanceMetric[]): number {
    const recentMetrics = metrics.filter(m => 
      m.name === 'response_time' && 
      m.timestamp.getTime() > Date.now() - 60000
    );

    return recentMetrics.length / 60;
  }

  private calculateErrorRate(requests: RequestMetrics[]): number {
    if (requests.length === 0) return 0;
    
    const errorCount = requests.filter(r => r.success === false).length;
    return (errorCount / requests.length) * 100;
  }

  private getTopEndpoints(metrics: PerformanceMetric[]): Array<{ endpoint: string; count: number; avgResponseTime: number }> {
    const endpointStats = metrics
      .filter(m => m.name === 'response_time' && m.component)
      .reduce((acc, metric) => {
        const endpoint = metric.component!;
        if (!acc[endpoint]) {
          acc[endpoint] = { count: 0, totalResponseTime: 0 };
        }
        acc[endpoint].count++;
        acc[endpoint].totalResponseTime += metric.value;
        return acc;
      }, {} as Record<string, { count: number; totalResponseTime: number }>);

    return Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgResponseTime: stats.totalResponseTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
