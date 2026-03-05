import { SystemHealthMetrics } from '../types/analytics';

interface HealthCheck {
  endpoint: string;
  responseTime: number;
  status: 'success' | 'error';
  timestamp: number;
  error?: string;
}

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: number;
}

class SystemHealthService {
  private healthChecks: HealthCheck[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private errorCounts: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: number | null = null;

  // Start health monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Initial health check
    this.performHealthChecks();
    this.collectPerformanceMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = window.setInterval(() => {
      this.performHealthChecks();
      this.collectPerformanceMetrics();
    }, intervalMs);

    // Monitor API calls
    this.interceptAPICalls();
  }

  // Stop health monitoring
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Perform health checks on critical endpoints
  private async performHealthChecks(): Promise<void> {
    const endpoints = [
      '/api/health',
      '/api/metadata/objects',
      '/api/auth/status',
      '/api/statistics/summary'
    ];

    const promises = endpoints.map(endpoint => this.checkEndpoint(endpoint));
    
    try {
      const results = await Promise.allSettled(promises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.healthChecks.push(result.value);
        } else {
          this.healthChecks.push({
            endpoint: endpoints[index],
            responseTime: 0,
            status: 'error',
            timestamp: Date.now(),
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Keep only last 1000 health checks
      if (this.healthChecks.length > 1000) {
        this.healthChecks = this.healthChecks.slice(-1000);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  // Check individual endpoint
  private async checkEndpoint(endpoint: string): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          endpoint,
          responseTime,
          status: 'success',
          timestamp: startTime
        };
      } else {
        // Track error
        this.trackError(endpoint, response.status);
        
        return {
          endpoint,
          responseTime,
          status: 'error',
          timestamp: startTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      // Track error
      this.trackError(endpoint, 0);
      
      return {
        endpoint,
        responseTime: Date.now() - startTime,
        status: 'error',
        timestamp: startTime,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Collect performance metrics
  private collectPerformanceMetrics(): void {
    // In a real implementation, this would collect actual system metrics
    // For now, we'll simulate some metrics
    
    const metrics: PerformanceMetrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
      timestamp: Date.now()
    };

    this.performanceMetrics.push(metrics);

    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  // Track errors
  private trackError(endpoint: string, statusCode: number): void {
    const key = `${endpoint}:${statusCode}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  // Intercept API calls to monitor response times
  private interceptAPICalls(): void {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0] instanceof Request ? args[0].url : args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        const responseTime = Date.now() - startTime;

        // Log the health check
        this.healthChecks.push({
          endpoint: url,
          responseTime,
          status: response.ok ? 'success' : 'error',
          timestamp: startTime,
          error: response.ok ? undefined : `HTTP ${response.status}`
        });

        if (!response.ok) {
          this.trackError(url, response.status);
        }

        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Log the failed health check
        this.healthChecks.push({
          endpoint: url,
          responseTime,
          status: 'error',
          timestamp: startTime,
          error: error instanceof Error ? error.message : 'Network error'
        });

        this.trackError(url, 0);
        throw error;
      }
    };
  }

  // Get system health metrics
  getSystemHealthMetrics(): SystemHealthMetrics {
    const recentChecks = this.healthChecks.filter(
      check => Date.now() - check.timestamp < 300000 // Last 5 minutes
    );

    const recentMetrics = this.performanceMetrics.filter(
      metric => Date.now() - metric.timestamp < 300000 // Last 5 minutes
    );

    // Calculate API response time statistics
    const responseTimes = recentChecks
      .filter(check => check.status === 'success')
      .map(check => check.responseTime)
      .sort((a, b) => a - b);

    const apiResponseTime = {
      avg: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      p50: this.getPercentile(responseTimes, 50),
      p95: this.getPercentile(responseTimes, 95),
      p99: this.getPercentile(responseTimes, 99)
    };

    // Calculate error rates
    const totalChecks = recentChecks.length;
    const errorChecks = recentChecks.filter(check => check.status === 'error').length;
    
    const errorsByEndpoint: Record<string, number> = {};
    recentChecks.forEach(check => {
      if (check.status === 'error') {
        errorsByEndpoint[check.endpoint] = (errorsByEndpoint[check.endpoint] || 0) + 1;
      }
    });

    // Calculate uptime (simplified)
    const uptimePercentage = totalChecks > 0 ? ((totalChecks - errorChecks) / totalChecks) * 100 : 100;

    // Get latest performance metrics
    const latestMetrics = recentMetrics[recentMetrics.length - 1] || {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0
    };

    return {
      apiResponseTime,
      errorRates: {
        total: errorChecks,
        critical: recentChecks.filter(check => 
          check.status === 'error' && check.error?.includes('5')
        ).length,
        warning: recentChecks.filter(check => 
          check.status === 'error' && check.error?.includes('4')
        ).length,
        byEndpoint: errorsByEndpoint
      },
      uptime: {
        percentage: uptimePercentage,
        lastDowntime: this.getLastDowntime(),
        downtimeDuration: this.calculateDowntimeDuration()
      },
      resourceUsage: {
        cpu: latestMetrics.cpu,
        memory: latestMetrics.memory,
        disk: latestMetrics.disk,
        network: latestMetrics.network
      },
      database: {
        connectionPool: Math.random() * 100,
        queryTime: Math.random() * 1000,
        slowQueries: Math.floor(Math.random() * 10)
      }
    };
  }

  // Get health status summary
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    score: number;
  } {
    const metrics = this.getSystemHealthMetrics();
    
    let score = 100;
    
    // Deduct points for high response times
    if (metrics.apiResponseTime.avg > 1000) score -= 20;
    else if (metrics.apiResponseTime.avg > 500) score -= 10;
    
    // Deduct points for error rates
    if (metrics.errorRates.total > 10) score -= 30;
    else if (metrics.errorRates.total > 5) score -= 15;
    
    // Deduct points for low uptime
    if (metrics.uptime.percentage < 95) score -= 25;
    else if (metrics.uptime.percentage < 99) score -= 10;
    
    // Deduct points for high resource usage
    if (metrics.resourceUsage.cpu > 80) score -= 15;
    if (metrics.resourceUsage.memory > 80) score -= 15;
    
    let status: 'healthy' | 'warning' | 'critical';
    let message: string;
    
    if (score >= 80) {
      status = 'healthy';
      message = 'All systems operating normally';
    } else if (score >= 60) {
      status = 'warning';
      message = 'Some systems require attention';
    } else {
      status = 'critical';
      message = 'Critical issues detected';
    }
    
    return { status, message, score };
  }

  // Helper methods
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private getLastDowntime(): Date | undefined {
    const lastError = this.healthChecks
      .filter(check => check.status === 'error')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return lastError ? new Date(lastError.timestamp) : undefined;
  }

  private calculateDowntimeDuration(): number {
    // Simplified calculation - in reality would track actual downtime periods
    const recentErrors = this.healthChecks.filter(
      check => check.status === 'error' && 
      Date.now() - check.timestamp < 300000
    );
    
    return recentErrors.length * 60000; // Assume 1 minute per error
  }

  // Get historical data for charts
  getHistoricalData(hours: number = 24): {
    responseTimes: Array<{ timestamp: number; value: number }>;
    errorRates: Array<{ timestamp: number; value: number }>;
    resourceUsage: Array<{ timestamp: number; cpu: number; memory: number; disk: number; network: number }>;
  } {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    const responseTimes = this.healthChecks
      .filter(check => check.timestamp > cutoffTime && check.status === 'success')
      .map(check => ({ timestamp: check.timestamp, value: check.responseTime }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const errorRates: Array<{ timestamp: number; value: number }> = [];
    const timeSlots = new Map<number, { total: number; errors: number }>();
    
    this.healthChecks
      .filter(check => check.timestamp > cutoffTime)
      .forEach(check => {
        const slot = Math.floor(check.timestamp / 300000) * 300000; // 5-minute slots
        
        if (!timeSlots.has(slot)) {
          timeSlots.set(slot, { total: 0, errors: 0 });
        }
        
        const slotData = timeSlots.get(slot)!;
        slotData.total++;
        if (check.status === 'error') {
          slotData.errors++;
        }
      });

    timeSlots.forEach((data, timestamp) => {
      errorRates.push({
        timestamp,
        value: data.total > 0 ? (data.errors / data.total) * 100 : 0
      });
    });

    const resourceUsage = this.performanceMetrics
      .filter(metric => metric.timestamp > cutoffTime)
      .map(metric => ({
        timestamp: metric.timestamp,
        cpu: metric.cpu,
        memory: metric.memory,
        disk: metric.disk,
        network: metric.network
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return { responseTimes, errorRates, resourceUsage };
  }
}

export const systemHealthService = new SystemHealthService();
export default SystemHealthService;
