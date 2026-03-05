import { ActivityItem, ActivityFilter, ActivityStats, ExportOptions } from '../types/activity';

export class ActivityService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  }

  async getActivities(filter?: Partial<ActivityFilter>): Promise<ActivityItem[]> {
    const params = new URLSearchParams();
    
    if (filter?.types?.length) {
      params.append('types', filter.types.join(','));
    }
    if (filter?.entityTypes?.length) {
      params.append('entityTypes', filter.entityTypes.join(','));
    }
    if (filter?.dateRange) {
      params.append('startDate', filter.dateRange.start.toISOString());
      params.append('endDate', filter.dateRange.end.toISOString());
    }
    if (filter?.users?.length) {
      params.append('users', filter.users.join(','));
    }
    if (filter?.searchQuery) {
      params.append('search', filter.searchQuery);
    }

    const response = await fetch(`${this.baseUrl}/api/activities?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return response.json();
  }

  async getActivityStats(filter?: Partial<ActivityFilter>): Promise<ActivityStats> {
    const params = new URLSearchParams();
    
    if (filter?.dateRange) {
      params.append('startDate', filter.dateRange.start.toISOString());
      params.append('endDate', filter.dateRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/api/activities/stats?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch activity stats');
    }
    return response.json();
  }

  async exportActivities(options: ExportOptions): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/activities/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error('Failed to export activities');
    }

    return response.blob();
  }

  async getActivityById(id: string): Promise<ActivityItem> {
    const response = await fetch(`${this.baseUrl}/api/activities/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch activity');
    }
    return response.json();
  }

  async getRelatedEntity(entityType: string, entityId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/${entityType}/${entityId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch related entity');
    }
    return response.json();
  }

  async addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<ActivityItem> {
    const response = await fetch(`${this.baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      throw new Error('Failed to add activity');
    }
    return response.json();
  }

  formatActivityDescription(activity: ActivityItem): string {
    const actionMap = {
      create: 'created',
      update: 'updated',
      delete: 'deleted',
      login: 'logged in',
      logout: 'logged out',
      export: 'exported',
      import: 'imported',
      share: 'shared',
      comment: 'commented on',
    };

    const entityMap = {
      form: 'form',
      field: 'field',
      user: 'user',
      template: 'template',
      page: 'page',
      api: 'API endpoint',
      webhook: 'webhook',
    };

    const action = actionMap[activity.type];
    const entity = entityMap[activity.entityType];

    return `${activity.userName} ${action} ${entity} "${activity.entityName}"`;
  }

  getActivityIcon(type: ActivityItem['type']): string {
    const iconMap = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      login: '🔐',
      logout: '🚪',
      export: '📤',
      import: '📥',
      share: '🔗',
      comment: '💬',
    };
    return iconMap[type] || '📋';
  }

  getActivityColor(type: ActivityItem['type']): string {
    const colorMap = {
      create: 'text-green-600',
      update: 'text-blue-600',
      delete: 'text-red-600',
      login: 'text-purple-600',
      logout: 'text-gray-600',
      export: 'text-orange-600',
      import: 'text-cyan-600',
      share: 'text-pink-600',
      comment: 'text-indigo-600',
    };
    return colorMap[type] || 'text-gray-600';
  }
}

export const activityService = new ActivityService();
