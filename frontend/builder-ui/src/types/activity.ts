export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'share' | 'comment';
  entityType: 'form' | 'field' | 'user' | 'template' | 'page' | 'api' | 'webhook';
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: Date;
  description: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityFilter {
  types: ActivityItem['type'][];
  entityTypes: ActivityItem['entityType'][];
  dateRange: {
    start: Date;
    end: Date;
  } | null;
  users: string[];
  searchQuery: string;
}

export interface ActivityStats {
  totalActivities: number;
  activitiesByType: Record<ActivityItem['type'], number>;
  activitiesByEntityType: Record<ActivityItem['entityType'], number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  recentActivity: ActivityItem[];
}

export interface WebSocketMessage {
  type: 'activity' | 'heartbeat' | 'error';
  data: ActivityItem | any;
  timestamp: Date;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeMetadata: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: Partial<ActivityFilter>;
}
