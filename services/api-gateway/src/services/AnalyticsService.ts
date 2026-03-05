import { AppDataSource } from '../config/database';
import { Activity } from '../entities/Activity';

export interface AnalyticsMetric {
  userId?: string;
  tenantId: string;
  action: string;
  timestamp: Date;
  metadata: {
    responseTime?: number;
    dataPoints?: number;
    changeCount?: number;
    updateType?: string;
    [key: string]: any;
  };
}

export interface DashboardAnalytics {
  totalViews: number;
  totalUpdates: number;
  averageResponseTime: number;
  uniqueUsers: number;
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  userActivity: Array<{
    userId: string;
    userName: string;
    activityCount: number;
    lastActivity: Date;
  }>;
  timeSeriesData: Array<{
    timestamp: Date;
    views: number;
    updates: number;
    responseTime: number;
  }>;
}

export class AnalyticsService {
  private analyticsRepository = AppDataSource.getRepository(Activity);
  private metricsBuffer: AnalyticsMetric[] = [];
  private batchSize = 50;
  private flushInterval = 10000; // 10 seconds

  constructor() {
    // Start periodic flush of metrics buffer
    setInterval(() => {
      this.flushMetricsBuffer();
    }, this.flushInterval);
  }

  /**
   * Aggregate dashboard metrics
   */
  async aggregateDashboardMetrics(metric: AnalyticsMetric): Promise<void> {
    // Add to buffer for batch processing
    this.metricsBuffer.push(metric);

    // Flush immediately if buffer is full
    if (this.metricsBuffer.length >= this.batchSize) {
      await this.flushMetricsBuffer();
    }
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(params: {
    tenantId: string;
    timeRange?: string;
    metrics?: string[];
    userId?: string;
  }): Promise<DashboardAnalytics> {
    const dateFilter = this.getDateFilter(params.timeRange);
    const whereClause: any = {
      tenantId: params.tenantId,
      createdAt: { $gte: dateFilter }
    };

    if (params.userId) {
      whereClause.userId = params.userId;
    }

    try {
      // Get total views and updates
      const [totalViews, totalUpdates] = await Promise.all([
        this.analyticsRepository.count({
          where: { ...whereClause, action: 'dashboard_view' }
        }),
        this.analyticsRepository.count({
          where: { ...whereClause, action: 'dashboard_update' }
        })
      ]);

      // Get average response time
      const responseTimeResult = await this.analyticsRepository
        .createQueryBuilder('activity')
        .select('AVG(CAST(activity.metadata->>\'responseTime\' as INTEGER))', 'avgResponseTime')
        .where('activity.tenantId = :tenantId', { tenantId: params.tenantId })
        .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
        .andWhere("activity.metadata->>'responseTime' IS NOT NULL")
        .getRawOne();

      const averageResponseTime = responseTimeResult?.avgResponseTime || 0;

      // Get unique users count
      const uniqueUsers = await this.analyticsRepository
        .createQueryBuilder('activity')
        .select('COUNT(DISTINCT activity.userId)', 'count')
        .where('activity.tenantId = :tenantId', { tenantId: params.tenantId })
        .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
        .getRawOne();

      // Get top actions
      const topActions = await this.analyticsRepository
        .createQueryBuilder('activity')
        .select(['activity.action', 'COUNT(*) as count'])
        .where('activity.tenantId = :tenantId', { tenantId: params.tenantId })
        .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
        .groupBy('activity.action')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      const totalActions = topActions.reduce((sum, action) => sum + parseInt(action.count), 0);
      const topActionsWithPercentage = topActions.map(action => ({
        action: action.action,
        count: parseInt(action.count),
        percentage: totalActions > 0 ? (parseInt(action.count) / totalActions) * 100 : 0
      }));

      // Get user activity
      const userActivity = await this.analyticsRepository
        .createQueryBuilder('activity')
        .select([
          'activity.userId',
          'MAX(activity.createdAt) as lastActivity',
          'COUNT(*) as activityCount'
        ])
        .leftJoin('User', 'user', 'user.id = activity.userId')
        .addSelect('CONCAT(user.firstName, \' \', user.lastName)', 'userName')
        .where('activity.tenantId = :tenantId', { tenantId: params.tenantId })
        .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
        .groupBy('activity.userId, user.firstName, user.lastName')
        .orderBy('activityCount', 'DESC')
        .limit(20)
        .getRawMany();

      // Get time series data
      const timeSeriesData = await this.getTimeSeriesData(params.tenantId, dateFilter);

      return {
        totalViews,
        totalUpdates,
        averageResponseTime: Math.round(averageResponseTime),
        uniqueUsers: parseInt(uniqueUsers?.count || '0'),
        topActions: topActionsWithPercentage,
        userActivity: userActivity.map(user => ({
          userId: user.userId,
          userName: user.userName || 'Unknown User',
          activityCount: parseInt(user.activityCount),
          lastActivity: user.lastActivity
        })),
        timeSeriesData
      };

    } catch (error) {
      console.error('Failed to get dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics data
   */
  async getRealTimeAnalytics(tenantId: string): Promise<any> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      const [currentViews, currentUpdates, activeUsers] = await Promise.all([
        this.analyticsRepository.count({
          where: {
            tenantId,
            action: 'dashboard_view',
            createdAt: { $gte: fiveMinutesAgo }
          }
        }),
        this.analyticsRepository.count({
          where: {
            tenantId,
            action: 'dashboard_update',
            createdAt: { $gte: fiveMinutesAgo }
          }
        }),
        this.analyticsRepository
          .createQueryBuilder('activity')
          .select('COUNT(DISTINCT activity.userId)', 'count')
          .where('activity.tenantId = :tenantId', { tenantId })
          .andWhere('activity.createdAt >= :dateFrom', { dateFrom: fiveMinutesAgo })
          .getRawOne()
      ]);

      return {
        currentViews,
        currentUpdates,
        activeUsers: parseInt(activeUsers?.count || '0'),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Failed to get real-time analytics:', error);
      throw error;
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(tenantId: string, timeRange?: string): Promise<any> {
    const dateFilter = this.getDateFilter(timeRange);

    try {
      const performanceData = await this.analyticsRepository
        .createQueryBuilder('activity')
        .select([
          'DATE_TRUNC(\'hour\', activity.createdAt) as hour',
          'AVG(CAST(activity.metadata->>\'responseTime\' as INTEGER)) as avgResponseTime',
          'COUNT(*) as requestCount',
          'MIN(CAST(activity.metadata->>\'responseTime\' as INTEGER)) as minResponseTime',
          'MAX(CAST(activity.metadata->>\'responseTime\' as INTEGER)) as maxResponseTime'
        ])
        .where('activity.tenantId = :tenantId', { tenantId })
        .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
        .andWhere("activity.metadata->>'responseTime' IS NOT NULL")
        .groupBy('DATE_TRUNC(\'hour\', activity.createdAt)')
        .orderBy('hour', 'ASC')
        .getRawMany();

      return performanceData.map(data => ({
        timestamp: data.hour,
        avgResponseTime: Math.round(data.avgResponseTime || 0),
        requestCount: parseInt(data.requestCount),
        minResponseTime: data.minResponseTime || 0,
        maxResponseTime: data.maxResponseTime || 0
      }));

    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      throw error;
    }
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToSave = this.metricsBuffer.splice(0, this.batchSize);

    try {
      const entities = metricsToSave.map(metric =>
        this.analyticsRepository.create({
          userId: metric.userId,
          tenantId: metric.tenantId,
          action: metric.action,
          entityType: 'dashboard',
          entityId: 'analytics',
          metadata: metric.metadata,
          createdAt: metric.timestamp
        })
      );

      await this.analyticsRepository.save(entities);
    } catch (error) {
      console.error('Failed to flush metrics buffer:', error);
      // Re-add failed metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToSave);
    }
  }

  /**
   * Get time series data for charts
   */
  private async getTimeSeriesData(tenantId: string, dateFilter: Date): Promise<any[]> {
    try {
      const timeSeries = await this.analyticsRepository
        .createQueryBuilder('activity')
        .select([
          'DATE_TRUNC(\'hour\', activity.createdAt) as timestamp',
          'COUNT(CASE WHEN activity.action = \'dashboard_view\' THEN 1 END) as views',
          'COUNT(CASE WHEN activity.action = \'dashboard_update\' THEN 1 END) as updates',
          'AVG(CAST(activity.metadata->>\'responseTime\' as INTEGER)) as responseTime'
        ])
        .where('activity.tenantId = :tenantId', { tenantId })
        .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
        .groupBy('DATE_TRUNC(\'hour\', activity.createdAt)')
        .orderBy('timestamp', 'ASC')
        .getRawMany();

      return timeSeries.map(data => ({
        timestamp: data.timestamp,
        views: parseInt(data.views || '0'),
        updates: parseInt(data.updates || '0'),
        responseTime: Math.round(data.responseTime || 0)
      }));

    } catch (error) {
      console.error('Failed to get time series data:', error);
      return [];
    }
  }

  /**
   * Get date filter based on time range
   */
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
        return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
    }
  }
}
