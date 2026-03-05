import { AppDataSource } from '../config/database';
import { Activity } from '../entities/Activity';

export interface ActivityLog {
  userId: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: {
    timestamp: Date;
    userAgent?: string;
    ip?: string;
    responseTime?: number;
    changes?: any;
    [key: string]: any;
  };
}

export class ActivityService {
  private activityRepository = AppDataSource.getRepository(Activity);
  private activityBuffer: ActivityLog[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Start periodic flush of activity buffer
    setInterval(() => {
      this.flushActivityBuffer();
    }, this.flushInterval);
  }

  /**
   * Log user activity
   */
  async logActivity(activity: ActivityLog): Promise<void> {
    // Add to buffer for batch processing
    this.activityBuffer.push(activity);

    // Flush immediately if buffer is full
    if (this.activityBuffer.length >= this.batchSize) {
      await this.flushActivityBuffer();
    }
  }

  /**
   * Get activities for user or tenant
   */
  async getActivities(filters: {
    userId?: string;
    tenantId: string;
    entityType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Activity[]> {
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId', { tenantId: filters.tenantId });

    if (filters.userId) {
      queryBuilder.andWhere('activity.userId = :userId', { userId: filters.userId });
    }

    if (filters.entityType) {
      queryBuilder.andWhere('activity.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters.action) {
      queryBuilder.andWhere('activity.action = :action', { action: filters.action });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('activity.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('activity.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    queryBuilder
      .orderBy('activity.createdAt', 'DESC')
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return await queryBuilder.getMany();
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(tenantId: string, timeRange?: string): Promise<any> {
    const dateFilter = this.getDateFilter(timeRange);

    const stats = await this.activityRepository
      .createQueryBuilder('activity')
      .select([
        'COUNT(*) as total_activities',
        'COUNT(DISTINCT activity.userId) as unique_users',
        'activity.action',
        'activity.entityType'
      ])
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
      .groupBy('activity.action, activity.entityType')
      .orderBy('total_activities', 'DESC')
      .getRawMany();

    return stats;
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string, tenantId: string, timeRange?: string): Promise<any> {
    const dateFilter = this.getDateFilter(timeRange);

    const summary = await this.activityRepository
      .createQueryBuilder('activity')
      .select([
        'COUNT(*) as total_activities',
        'COUNT(DISTINCT DATE(activity.createdAt)) as active_days',
        'MAX(activity.createdAt) as last_activity',
        'activity.action'
      ])
      .where('activity.userId = :userId', { userId })
      .andWhere('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.createdAt >= :dateFrom', { dateFrom: dateFilter })
      .groupBy('activity.action')
      .getRawMany();

    return summary;
  }

  /**
   * Flush activity buffer to database
   */
  private async flushActivityBuffer(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const activitiesToSave = this.activityBuffer.splice(0, this.batchSize);

    try {
      const entities = activitiesToSave.map(log => 
        this.activityRepository.create({
          userId: log.userId,
          tenantId: log.tenantId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata: log.metadata,
          createdAt: log.metadata.timestamp
        })
      );

      await this.activityRepository.save(entities);
    } catch (error) {
      console.error('Failed to flush activity buffer:', error);
      // Re-add failed activities to buffer for retry
      this.activityBuffer.unshift(...activitiesToSave);
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

  /**
   * Cleanup old activities
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const result = await this.activityRepository
        .createQueryBuilder('activity')
        .delete()
        .where('activity.createdAt < :cutoffDate', { cutoffDate })
        .execute();

      console.log(`Cleaned up ${result.affected} old activities`);
    } catch (error) {
      console.error('Failed to cleanup old activities:', error);
    }
  }
}
