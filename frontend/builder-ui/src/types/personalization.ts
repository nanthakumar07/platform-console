export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Widget {
  id: string;
  type: 'statistics' | 'activity-feed' | 'chart' | 'table' | 'metric' | 'custom';
  title: string;
  position: WidgetPosition;
  config: Record<string, any>;
  isVisible: boolean;
  isMinimized: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: Widget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dashboardLayouts: DashboardLayout[];
  activeLayoutId: string;
  widgets: Widget[];
  sidebarCollapsed: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    activity: boolean;
  };
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface WidgetConfig {
  [key: string]: {
    title: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'color';
    options?: string[];
    default?: any;
    validation?: {
      min?: number;
      max?: number;
      required?: boolean;
      pattern?: string;
    };
  };
}

export interface WidgetDefinition {
  type: Widget['type'];
  name: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  config: WidgetConfig;
  component: React.ComponentType<{ widget: Widget; onConfigChange?: (config: Record<string, any>) => void }>;
}
