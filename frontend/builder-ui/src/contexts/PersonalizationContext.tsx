import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPreferences, DashboardLayout, Widget } from '../types/personalization';

interface PersonalizationContextType {
  preferences: UserPreferences;
  theme: 'light' | 'dark';
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addDashboardLayout: (layout: DashboardLayout) => void;
  updateDashboardLayout: (id: string, updates: Partial<DashboardLayout>) => void;
  deleteDashboardLayout: (id: string) => void;
  setActiveLayout: (id: string) => void;
  addWidget: (widget: Widget) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  deleteWidget: (id: string) => void;
  reorderWidgets: (widgets: Widget[]) => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  dashboardLayouts: [],
  activeLayoutId: '',
  widgets: [],
  sidebarCollapsed: false,
  notifications: {
    email: true,
    push: true,
    activity: true,
  },
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
};

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined);

export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};

interface PersonalizationProviderProps {
  children: ReactNode;
}

export const PersonalizationProvider: React.FC<PersonalizationProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }, [preferences]);

  // Handle theme changes
  useEffect(() => {
    const updateTheme = () => {
      if (preferences.theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setThemeState(systemTheme);
      } else {
        setThemeState(preferences.theme);
      }
    };

    updateTheme();

    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [preferences.theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    updatePreferences({ theme: newTheme });
  };

  const addDashboardLayout = (layout: DashboardLayout) => {
    setPreferences(prev => ({
      ...prev,
      dashboardLayouts: [...prev.dashboardLayouts, layout],
    }));
  };

  const updateDashboardLayout = (id: string, updates: Partial<DashboardLayout>) => {
    setPreferences(prev => ({
      ...prev,
      dashboardLayouts: prev.dashboardLayouts.map(layout =>
        layout.id === id ? { ...layout, ...updates, updatedAt: new Date() } : layout
      ),
    }));
  };

  const deleteDashboardLayout = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      dashboardLayouts: prev.dashboardLayouts.filter(layout => layout.id !== id),
      activeLayoutId: prev.activeLayoutId === id ? '' : prev.activeLayoutId,
    }));
  };

  const setActiveLayout = (id: string) => {
    setPreferences(prev => ({ ...prev, activeLayoutId: id }));
  };

  const addWidget = (widget: Widget) => {
    setPreferences(prev => ({
      ...prev,
      widgets: [...prev.widgets, widget],
    }));
  };

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setPreferences(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === id ? { ...widget, ...updates } : widget
      ),
    }));
  };

  const deleteWidget = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== id),
    }));
  };

  const reorderWidgets = (widgets: Widget[]) => {
    setPreferences(prev => ({ ...prev, widgets }));
  };

  return (
    <PersonalizationContext.Provider
      value={{
        preferences,
        theme,
        updatePreferences,
        setTheme,
        addDashboardLayout,
        updateDashboardLayout,
        deleteDashboardLayout,
        setActiveLayout,
        addWidget,
        updateWidget,
        deleteWidget,
        reorderWidgets,
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
};
