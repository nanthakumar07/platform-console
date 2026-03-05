// Team activity and collaboration types
export interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  action: 'create' | 'update' | 'delete' | 'comment' | 'share' | 'login' | 'logout';
  entityType: 'object' | 'field' | 'relation' | 'user' | 'dashboard' | 'comment';
  entityId: string;
  entityName: string;
  entityDescription?: string;
  metadata: {
    timestamp: Date;
    tenantId: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, any>;
    previousValues?: Record<string, any>;
    [key: string]: any;
  };
  visibility: 'public' | 'team' | 'private';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  content: string;
  metadata: {
    timestamp: Date;
    tenantId: string;
    editedAt?: Date;
    editedBy?: string;
    mentions: string[];
    attachments: string[];
    isResolved: boolean;
    resolvedBy?: string;
    resolvedAt?: Date;
    [key: string]: any;
  };
  reactions: CommentReaction[];
  replies: ActivityComment[];
  parentId?: string;
}

export interface CommentReaction {
  id: string;
  userId: string;
  userName: string;
  emoji: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'mention' | 'comment' | 'share' | 'update' | 'delete' | 'system' | 'deadline' | 'approval';
  title: string;
  message: string;
  metadata: {
    timestamp: Date;
    tenantId: string;
    read: boolean;
    readAt?: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'activity' | 'system' | 'collaboration' | 'security';
    entityId?: string;
    entityType?: string;
    actionUrl?: string;
    expiresAt?: Date;
    [key: string]: any;
  };
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  url?: string;
  action?: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface SharedDashboard {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  config: {
    layout: DashboardLayout;
    filters: Record<string, any>;
    timeRange: string;
    widgets: WidgetConfig[];
    permissions: SharePermissions;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessed?: Date;
    accessCount: number;
    isPublic: boolean;
    shareToken?: string;
    expiresAt?: Date;
    tenantId: string;
  };
  collaborators: Collaborator[];
}

export interface Collaborator {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: string[];
  addedAt: Date;
  addedBy: string;
  lastAccessed?: Date;
  isActive: boolean;
}

export interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  canExport: boolean;
  canComment: boolean;
  allowedUsers: string[];
  allowedRoles: string[];
  isPublic: boolean;
  requireAuth: boolean;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  grid: DashboardGridItem[];
}

export interface DashboardGridItem {
  id: string;
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface WidgetConfig {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text' | 'image' | 'activity';
  title: string;
  config: Record<string, any>;
  dataSource: string;
  refreshInterval?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  permissions: string[];
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
  currentActivity?: string;
  timezone: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    types: string[];
  };
  privacy: {
    showOnlineStatus: boolean;
    showActivity: boolean;
    allowMentions: boolean;
  };
  dashboard: {
    defaultLayout: string;
    autoRefresh: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface CollaborationSession {
  id: string;
  dashboardId: string;
  participants: SessionParticipant[];
  activity: SessionActivity[];
  metadata: {
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    tenantId: string;
  };
}

export interface SessionParticipant {
  userId: string;
  userName: string;
  joinedAt: Date;
  leftAt?: Date;
  cursor?: {
    x: number;
    y: number;
    element?: string;
  };
  isActive: boolean;
}

export interface SessionActivity {
  id: string;
  userId: string;
  type: 'cursor_move' | 'selection' | 'edit' | 'comment' | 'filter_change';
  data: Record<string, any>;
  timestamp: Date;
}
