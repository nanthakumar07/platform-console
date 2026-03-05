export interface RecentItem {
  id: string;
  type: 'form' | 'field' | 'template' | 'page' | 'api' | 'webhook';
  name: string;
  description?: string;
  lastAccessed: Date;
  accessCount: number;
  metadata: Record<string, any>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'form' | 'field' | 'page' | 'api' | 'webhook';
  type: 'user' | 'system';
  isDefault: boolean;
  config: Record<string, any>;
  fields?: FieldTemplate[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
}

export interface FieldTemplate {
  id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'file' | 'textarea';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  placeholder?: string;
  description?: string;
}

export interface BulkOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'export' | 'import';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  config: Record<string, any>;
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  action: () => void;
  category: 'navigation' | 'creation' | 'editing' | 'bulk' | 'general';
  enabled: boolean;
  global?: boolean;
}

export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string[];
  action: () => void;
  category: 'recent' | 'template' | 'bulk' | 'create' | 'navigation';
  order: number;
}

export interface QuickActionsState {
  recentItems: RecentItem[];
  templates: Template[];
  bulkOperations: BulkOperation[];
  shortcuts: KeyboardShortcut[];
  quickActions: QuickAction[];
  isLoading: boolean;
  error: string | null;
}

export interface BulkCreateConfig {
  itemType: 'form' | 'field' | 'template' | 'page';
  items: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  templateId?: string;
  namingPattern?: string;
  startIndex?: number;
}

export interface BulkUpdateConfig {
  itemType: 'form' | 'field' | 'template' | 'page';
  itemIds: string[];
  updates: Record<string, any>;
  conditions?: Record<string, any>;
}

export interface BulkExportConfig {
  itemType: 'form' | 'field' | 'template' | 'page';
  itemIds?: string[];
  format: 'json' | 'csv' | 'xlsx';
  includeMetadata: boolean;
  filters?: Record<string, any>;
}

export interface BulkImportConfig {
  fileType: 'json' | 'csv' | 'xlsx';
  file: File;
  itemType: 'form' | 'field' | 'template' | 'page';
  options: {
    overwriteExisting: boolean;
    validateBeforeImport: boolean;
    createMissingReferences: boolean;
  };
}
