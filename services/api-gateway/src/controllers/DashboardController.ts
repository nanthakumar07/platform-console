import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { ActivityService } from '../services/activityService';
import { AnalyticsService } from '../services/analyticsService';
import { WebSocketService } from '../services/webSocketService';
import { PerformanceService } from '../services/performanceService';
import { Logger } from '../utils/logger';

export class DashboardController {
  private dashboardService: DashboardService;
  private activityService: ActivityService;
  private analyticsService: AnalyticsService;
  private webSocketService: WebSocketService;
  private performanceService: PerformanceService;
  private logger: Logger;

  constructor() {
    this.dashboardService = new DashboardService();
    this.activityService = new ActivityService();
    this.analyticsService = new AnalyticsService();
    this.webSocketService = new WebSocketService();
    this.performanceService = new PerformanceService();
    this.logger = new Logger('DashboardController');
  }

  /**
   * Get dashboard data with performance tracking
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    try {
      // Performance tracking start
      this.performanceService.startRequest('dashboard:get', userId, tenantId);

      // Get dashboard data
      const dashboardData = await this.dashboardService.getDashboardData(userId, tenantId);

      // Log activity
      await this.activityService.logActivity({
        userId,
        tenantId,
        action: 'dashboard_view',
        entityType: 'dashboard',
        entityId: 'main',
        metadata: {
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          responseTime: Date.now() - startTime
        }
      });

      // Analytics aggregation
      await this.analyticsService.aggregateDashboardMetrics({
        userId,
        tenantId,
        action: 'view',
        timestamp: new Date(),
        metadata: {
          responseTime: Date.now() - startTime,
          dataPoints: dashboardData.length
        }
      });

      // Real-time WebSocket notification
      this.webSocketService.broadcastToTenant(tenantId, {
        type: 'dashboard_activity',
        data: {
          userId,
          action: 'dashboard_view',
          timestamp: new Date()
        }
      });

      // Performance metrics collection
      this.performanceService.recordMetric('dashboard_response_time', Date.now() - startTime);
      this.performanceService.recordMetric('dashboard_data_points', dashboardData.length);

      // Send response
      res.json({
        success: true,
        data: dashboardData,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          userId
        }
      });

      this.logger.info('Dashboard data retrieved successfully', {
        userId,
        tenantId,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.performanceService.recordError('dashboard_get', error);
      this.logger.error('Failed to get dashboard data', { error, userId, tenantId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error.message
      });
    } finally {
      this.performanceService.endRequest('dashboard:get', startTime);
    }
  }

  /**
   * Update dashboard with comprehensive tracking
   */
  async updateDashboard(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const dashboardData = req.body;

    try {
      this.performanceService.startRequest('dashboard:update', userId, tenantId);

      // Validate and update dashboard
      const updatedDashboard = await this.dashboardService.updateDashboardData(
        userId,
        tenantId,
        dashboardData
      );

      // Log activity with change tracking
      await this.activityService.logActivity({
        userId,
        tenantId,
        action: 'dashboard_update',
        entityType: 'dashboard',
        entityId: 'main',
        metadata: {
          timestamp: new Date(),
          changes: this.detectChanges(dashboardData, updatedDashboard),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          responseTime: Date.now() - startTime
        }
      });

      // Analytics aggregation for updates
      await this.analyticsService.aggregateDashboardMetrics({
        userId,
        tenantId,
        action: 'update',
        timestamp: new Date(),
        metadata: {
          responseTime: Date.now() - startTime,
          changeCount: Object.keys(dashboardData).length,
          updateType: this.getUpdateType(dashboardData)
        }
      });

      // Real-time WebSocket notification to all tenant users
      this.webSocketService.broadcastToTenant(tenantId, {
        type: 'dashboard_update',
        data: {
          userId,
          changes: this.detectChanges(dashboardData, updatedDashboard),
          timestamp: new Date(),
          updatedBy: `${req.user?.firstName} ${req.user?.lastName}`
        }
      });

      // Performance metrics
      this.performanceService.recordMetric('dashboard_update_time', Date.now() - startTime);
      this.performanceService.recordMetric('dashboard_update_changes', Object.keys(dashboardData).length);

      res.json({
        success: true,
        data: updatedDashboard,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          userId,
          changes: this.detectChanges(dashboardData, updatedDashboard)
        }
      });

      this.logger.info('Dashboard updated successfully', {
        userId,
        tenantId,
        responseTime: Date.now() - startTime,
        changeCount: Object.keys(dashboardData).length
      });

    } catch (error) {
      this.performanceService.recordError('dashboard_update', error);
      this.logger.error('Failed to update dashboard', { error, userId, tenantId });

      res.status(500).json({
        success: false,
        error: 'Failed to update dashboard',
        message: error.message
      });
    } finally {
      this.performanceService.endRequest('dashboard:update', startTime);
    }
  }

  /**
   * Get dashboard analytics with aggregation
   */
  async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { timeRange, metrics } = req.query;

    try {
      this.performanceService.startRequest('dashboard:analytics', userId, tenantId);

      // Get aggregated analytics data
      const analyticsData = await this.analyticsService.getDashboardAnalytics({
        tenantId,
        timeRange: timeRange as string,
        metrics: metrics as string[],
        userId
      });

      // Log analytics access
      await this.activityService.logActivity({
        userId,
        tenantId,
        action: 'analytics_view',
        entityType: 'dashboard',
        entityId: 'analytics',
        metadata: {
          timestamp: new Date(),
          timeRange,
          metrics,
          responseTime: Date.now() - startTime
        }
      });

      // Performance metrics
      this.performanceService.recordMetric('analytics_response_time', Date.now() - startTime);
      this.performanceService.recordMetric('analytics_data_points', analyticsData.length);

      res.json({
        success: true,
        data: analyticsData,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          timeRange,
          metrics
        }
      });

    } catch (error) {
      this.performanceService.recordError('dashboard_analytics', error);
      this.logger.error('Failed to get dashboard analytics', { error, userId, tenantId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics',
        message: error.message
      });
    } finally {
      this.performanceService.endRequest('dashboard:analytics', startTime);
    }
  }

  /**
   * Real-time dashboard subscription via WebSocket
   */
  async subscribeToDashboard(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { dashboardId } = req.params;

    try {
      // Add user to WebSocket subscription
      this.webSocketService.addSubscription(userId, {
        type: 'dashboard',
        id: dashboardId,
        tenantId,
        filters: req.query
      });

      // Log subscription
      await this.activityService.logActivity({
        userId,
        tenantId,
        action: 'dashboard_subscribe',
        entityType: 'dashboard',
        entityId: dashboardId,
        metadata: {
          timestamp: new Date(),
          filters: req.query,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Subscribed to dashboard updates',
        subscriptionId: `${userId}_${dashboardId}`
      });

      this.logger.info('User subscribed to dashboard updates', {
        userId,
        tenantId,
        dashboardId
      });

    } catch (error) {
      this.logger.error('Failed to subscribe to dashboard', { error, userId, tenantId });

      res.status(500).json({
        success: false,
        error: 'Failed to subscribe to dashboard',
        message: error.message
      });
    }
  }

  /**
   * Get performance metrics for dashboard
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { timeRange } = req.query;

    try {
      const metrics = await this.performanceService.getMetrics({
        tenantId,
        timeRange: timeRange as string,
        component: 'dashboard'
      });

      res.json({
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date(),
          timeRange
        }
      });

    } catch (error) {
      this.logger.error('Failed to get performance metrics', { error, userId, tenantId });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        message: error.message
      });
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.performanceService.getSystemHealth();
      
      res.json({
        success: true,
        data: health,
        metadata: {
          timestamp: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get system health', { error });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system health',
        message: error.message
      });
    }
  }

  // Helper methods
  private detectChanges(oldData: any, newData: any): any {
    const changes: any = {};
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }
    
    return changes;
  }

  private getUpdateType(data: any): string {
    if (data.layout) return 'layout_change';
    if (data.widgets) return 'widget_update';
    if (data.filters) return 'filter_change';
    if (data.settings) return 'settings_change';
    return 'general_update';
  }
}

export default DashboardController;
