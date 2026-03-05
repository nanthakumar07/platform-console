// User engagement tracking types
export interface UserEngagementEvent {
  id: string;
  userId: string;
  tenantId: string;
  eventType: 'page_view' | 'feature_usage' | 'interaction' | 'session_start' | 'session_end' | 'session_pause' | 'session_resume';
  featureName?: string;
  metadata: {
    timestamp: number;
    duration?: number;
    userAgent: string;
    sessionId: string;
    referrer?: string;
    path?: string;
    [key: string]: any;
  };
}

export interface FeatureUsageStats {
  featureName: string;
  totalUses: number;
  uniqueUsers: number;
  avgSessionTime: number;
  usageFrequency: 'daily' | 'weekly' | 'monthly' | 'rare';
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUsed: Date;
}

export interface UserSessionMetrics {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  featuresUsed: string[];
  interactions: number;
  bounceRate: number;
}

export interface EngagementAnalytics {
  totalUsers: number;
  activeUsers: number;
  avgSessionDuration: number;
  pageViews: number;
  featureUsage: FeatureUsageStats[];
  topFeatures: string[];
  userRetention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  engagementScore: number;
}

// System health monitoring types
export interface SystemHealthMetrics {
  apiResponseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errorRates: {
    total: number;
    critical: number;
    warning: number;
    byEndpoint: Record<string, number>;
  };
  uptime: {
    percentage: number;
    lastDowntime?: Date;
    downtimeDuration: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
  };
}

// Data quality types
export interface DataQualityIssue {
  id: string;
  type: 'missing_data' | 'invalid_format' | 'duplicate' | 'inconsistent' | 'outdated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityType: 'object' | 'field' | 'relation' | 'user';
  entityId: string;
  entityName: string;
  fieldName?: string;
  description: string;
  detectedAt: Date;
  count: number;
  suggestedFix?: string;
}

export interface DataQualityMetrics {
  overallScore: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  issues: DataQualityIssue[];
  trends: {
    improving: string[];
    degrading: string[];
    stable: string[];
  };
}

// Business metrics types
export interface BusinessKPI {
  id: string;
  name: string;
  description: string;
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  category: 'revenue' | 'productivity' | 'quality' | 'efficiency' | 'custom' | 'growth';
  lastUpdated: Date;
  calculation: string;
}

export interface BusinessMetrics {
  totalObjects: number;
  totalFields: number;
  totalRelations: number;
  userProductivity: {
    objectsCreatedPerUser: number;
    fieldsAddedPerUser: number;
    avgTimeToObjectCreation: number;
  };
  systemUtilization: {
    storageUsed: number;
    apiCallsPerDay: number;
    concurrentUsers: number;
  };
  customKPIs: BusinessKPI[];
}

// Advanced analytics response type
export interface AdvancedAnalytics {
  userEngagement: EngagementAnalytics;
  systemHealth: SystemHealthMetrics;
  dataQuality: DataQualityMetrics;
  businessMetrics: BusinessMetrics;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
}
