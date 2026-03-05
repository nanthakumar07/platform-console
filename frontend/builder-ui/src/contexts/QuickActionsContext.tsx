import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  RecentItem, 
  Template, 
  BulkOperation, 
  KeyboardShortcut, 
  QuickAction,
  QuickActionsState,
  BulkCreateConfig,
  BulkUpdateConfig,
  BulkExportConfig,
  BulkImportConfig
} from '../types/quickActions';

interface QuickActionsContextType {
  state: QuickActionsState;
  addRecentItem: (item: Omit<RecentItem, 'id' | 'lastAccessed' | 'accessCount'>) => void;
  removeRecentItem: (id: string) => void;
  clearRecentItems: () => void;
  createTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  getTemplatesByCategory: (category: Template['category']) => Template[];
  executeBulkOperation: (config: BulkCreateConfig | BulkUpdateConfig | BulkExportConfig | BulkImportConfig) => Promise<BulkOperation>;
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  executeShortcut: (id: string) => void;
  addQuickAction: (action: QuickAction) => void;
  removeQuickAction: (id: string) => void;
  getQuickActionsByCategory: (category: QuickAction['category']) => QuickAction[];
}

const defaultState: QuickActionsState = {
  recentItems: [],
  templates: [],
  bulkOperations: [],
  shortcuts: [],
  quickActions: [],
  isLoading: false,
  error: null,
};

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(undefined);

export const useQuickActions = () => {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error('useQuickActions must be used within a QuickActionsProvider');
  }
  return context;
};

interface QuickActionsProviderProps {
  children: ReactNode;
}

export const QuickActionsProvider: React.FC<QuickActionsProviderProps> = ({ children }) => {
  const [state, setState] = useState<QuickActionsState>(defaultState);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('quickActionsData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setState(prev => ({
          ...prev,
          recentItems: parsed.recentItems || [],
          templates: parsed.templates || [],
          shortcuts: parsed.shortcuts || [],
          quickActions: parsed.quickActions || [],
        }));
      } catch (error) {
        console.error('Failed to load quick actions data:', error);
      }
    }
    initializeDefaultData();
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const dataToSave = {
      recentItems: state.recentItems,
      templates: state.templates,
      shortcuts: state.shortcuts,
      quickActions: state.quickActions,
    };
    localStorage.setItem('quickActionsData', JSON.stringify(dataToSave));
  }, [state.recentItems, state.templates, state.shortcuts, state.quickActions]);

  const initializeDefaultData = () => {
    const defaultTemplates: Template[] = [
      {
        id: 'contact-form',
        name: 'Contact Form',
        description: 'Standard contact form with name, email, and message fields',
        category: 'form',
        type: 'system',
        isDefault: true,
        config: {
          title: 'Contact Us',
          description: 'Get in touch with us',
          submitButtonText: 'Send Message',
        },
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: 'Full Name',
            required: true,
            placeholder: 'Enter your full name',
          },
          {
            id: 'email',
            name: 'email',
            type: 'email',
            label: 'Email Address',
            required: true,
            placeholder: 'Enter your email',
            validation: {
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              message: 'Please enter a valid email address',
            },
          },
          {
            id: 'message',
            name: 'message',
            type: 'textarea',
            label: 'Message',
            required: true,
            placeholder: 'Enter your message',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['contact', 'basic', 'common'],
      },
      {
        id: 'user-registration',
        name: 'User Registration',
        description: 'Complete user registration form with validation',
        category: 'form',
        type: 'system',
        isDefault: true,
        config: {
          title: 'Create Account',
          description: 'Join our platform',
          submitButtonText: 'Register',
        },
        fields: [
          {
            id: 'username',
            name: 'username',
            type: 'text',
            label: 'Username',
            required: true,
            validation: {
              min: 3,
              max: 20,
              pattern: '^[a-zA-Z0-9_]+$',
              message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
            },
          },
          {
            id: 'email',
            name: 'email',
            type: 'email',
            label: 'Email',
            required: true,
          },
          {
            id: 'password',
            name: 'password',
            type: 'text',
            label: 'Password',
            required: true,
            validation: {
              min: 8,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
              message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['user', 'registration', 'auth'],
      },
    ];

    const defaultShortcuts: KeyboardShortcut[] = [
      {
        id: 'new-form',
        name: 'New Form',
        description: 'Create a new form',
        keys: ['ctrl', 'n'],
        action: () => console.log('Creating new form...'),
        category: 'creation',
        enabled: true,
      },
      {
        id: 'save',
        name: 'Save',
        description: 'Save current item',
        keys: ['ctrl', 's'],
        action: () => console.log('Saving...'),
        category: 'editing',
        enabled: true,
      },
      {
        id: 'search',
        name: 'Search',
        description: 'Open search',
        keys: ['ctrl', 'k'],
        action: () => console.log('Opening search...'),
        category: 'navigation',
        enabled: true,
      },
    ];

    setState(prev => ({
      ...prev,
      templates: defaultTemplates,
      shortcuts: defaultShortcuts,
    }));
  };

  const addRecentItem = useCallback((item: Omit<RecentItem, 'id' | 'lastAccessed' | 'accessCount'>) => {
    setState(prev => {
      const existingIndex = prev.recentItems.findIndex(ri => ri.type === item.type && ri.name === item.name);
      let newRecentItems: RecentItem[];

      if (existingIndex >= 0) {
        // Update existing item
        newRecentItems = prev.recentItems.map((ri, index) => {
          if (index === existingIndex) {
            return {
              ...ri,
              lastAccessed: new Date(),
              accessCount: ri.accessCount + 1,
            };
          }
          return ri;
        });
      } else {
        // Add new item
        const newItem: RecentItem = {
          ...item,
          id: `${item.type}-${Date.now()}`,
          lastAccessed: new Date(),
          accessCount: 1,
        };
        newRecentItems = [newItem, ...prev.recentItems];
      }

      // Keep only the most recent 20 items
      return {
        ...prev,
        recentItems: newRecentItems.slice(0, 20),
      };
    });
  }, []);

  const removeRecentItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      recentItems: prev.recentItems.filter(item => item.id !== id),
    }));
  }, []);

  const clearRecentItems = useCallback(() => {
    setState(prev => ({
      ...prev,
      recentItems: [],
    }));
  }, []);

  const createTemplate = useCallback((template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: Template = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate],
    }));
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.map(template =>
        template.id === id
          ? { ...template, ...updates, updatedAt: new Date() }
          : template
      ),
    }));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.filter(template => template.id !== id),
    }));
  }, []);

  const getTemplatesByCategory = useCallback((category: Template['category']) => {
    return state.templates.filter(template => template.category === category);
  }, [state.templates]);

  const executeBulkOperation = useCallback(async (config: BulkCreateConfig | BulkUpdateConfig | BulkExportConfig | BulkImportConfig): Promise<BulkOperation> => {
    let operationType: BulkOperation['type'];
    
    if ('file' in config) {
      operationType = 'import';
    } else if ('format' in config) {
      operationType = 'export';
    } else if ('updates' in config) {
      operationType = 'update';
    } else {
      operationType = 'create';
    }

    const operation: BulkOperation = {
      id: `bulk-${Date.now()}`,
      type: operationType,
      status: 'pending',
      progress: 0,
      totalItems: 'items' in config ? config.items.length : ('itemIds' in config && config.itemIds) ? config.itemIds.length : 1,
      processedItems: 0,
      errors: [],
      startTime: new Date(),
      config,
    };

    setState(prev => ({
      ...prev,
      bulkOperations: [...prev.bulkOperations, operation],
    }));

    // Simulate bulk operation execution
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        bulkOperations: prev.bulkOperations.map(op =>
          op.id === operation.id
            ? { ...op, status: 'running', progress: 50 }
            : op
        ),
      }));

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          bulkOperations: prev.bulkOperations.map(op =>
            op.id === operation.id
              ? { 
                  ...op, 
                  status: 'completed', 
                  progress: 100, 
                  processedItems: op.totalItems,
                  endTime: new Date()
                }
              : op
          ),
        }));
      }, 2000);
    }, 1000);

    return operation;
  }, []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setState(prev => ({
      ...prev,
      shortcuts: [...prev.shortcuts, shortcut],
    }));
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.filter(shortcut => shortcut.id !== id),
    }));
  }, []);

  const executeShortcut = useCallback((id: string) => {
    const shortcut = state.shortcuts.find(s => s.id === id);
    if (shortcut && shortcut.enabled) {
      shortcut.action();
    }
  }, [state.shortcuts]);

  const addQuickAction = useCallback((action: QuickAction) => {
    setState(prev => ({
      ...prev,
      quickActions: [...prev.quickActions, action].sort((a, b) => a.order - b.order),
    }));
  }, []);

  const removeQuickAction = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      quickActions: prev.quickActions.filter(action => action.id !== id),
    }));
  }, []);

  const getQuickActionsByCategory = useCallback((category: QuickAction['category']) => {
    return state.quickActions.filter(action => action.category === category);
  }, [state.quickActions]);

  return (
    <QuickActionsContext.Provider
      value={{
        state,
        addRecentItem,
        removeRecentItem,
        clearRecentItems,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        getTemplatesByCategory,
        executeBulkOperation,
        registerShortcut,
        unregisterShortcut,
        executeShortcut,
        addQuickAction,
        removeQuickAction,
        getQuickActionsByCategory,
      }}
    >
      {children}
    </QuickActionsContext.Provider>
  );
};
