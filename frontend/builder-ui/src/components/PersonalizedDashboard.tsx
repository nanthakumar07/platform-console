import React, { useState } from 'react';
import { usePersonalization } from '../contexts/PersonalizationContext';
import { DashboardGrid } from './DashboardGrid';
import { WIDGET_COMPONENTS } from './Widgets';
import { ThemeToggle } from './ThemeToggle';
import { SavedViews } from './SavedViews';
import { Widget } from '../types/personalization';

interface PersonalizedDashboardProps {
  className?: string;
}

export const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({ className = '' }) => {
  const { preferences, addWidget, updateWidget, deleteWidget, reorderWidgets } = usePersonalization();
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);

  const defaultWidgets: Widget[] = [
    {
      id: 'stats-1',
      type: 'statistics',
      title: 'Overview Statistics',
      position: { x: 0, y: 0, width: 2, height: 2 },
      config: {
        totalForms: 12,
        activeUsers: 156,
        submissions: 1234,
        conversionRate: 45,
        showChart: true,
      },
      isVisible: true,
      isMinimized: false,
    },
    {
      id: 'activity-1',
      type: 'activity-feed',
      title: 'Recent Activity',
      position: { x: 2, y: 0, width: 1, height: 2 },
      config: {
        maxItems: 5,
        recentActivities: [
          { description: 'New form created', timestamp: '2 hours ago' },
          { description: 'User registration', timestamp: '4 hours ago' },
          { description: 'Form submission', timestamp: '6 hours ago' },
        ],
      },
      isVisible: true,
      isMinimized: false,
    },
    {
      id: 'metric-1',
      type: 'metric',
      title: 'Conversion Rate',
      position: { x: 3, y: 0, width: 1, height: 1 },
      config: {
        value: '45%',
        label: 'Monthly Average',
        color: 'text-green-600',
        showChange: true,
        changeType: 'positive',
        changeValue: 12,
      },
      isVisible: true,
      isMinimized: false,
    },
  ];

  const widgets = preferences.widgets.length > 0 ? preferences.widgets : defaultWidgets;

  const handleAddWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type} Widget`,
      position: { x: 0, y: 0, width: 1, height: 1 },
      config: {},
      isVisible: true,
      isMinimized: false,
    };
    addWidget(newWidget);
    setShowWidgetLibrary(false);
  };

  const renderWidgetContent = (widget: Widget) => {
    const WidgetComponent = WIDGET_COMPONENTS[widget.type];
    if (!WidgetComponent) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div className="text-sm text-gray-600 mt-2">Unknown widget type</div>
        </div>
      );
    }
    return <WidgetComponent widget={widget} />;
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personalized Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Customize your workspace with widgets and themes</p>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={() => setShowSavedViews(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Saved Views
              </button>
              <button
                onClick={() => setShowWidgetLibrary(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="p-6">
        <DashboardGrid
          widgets={widgets}
          onWidgetUpdate={updateWidget}
          onWidgetDelete={deleteWidget}
          onWidgetReorder={reorderWidgets}
        >
          {renderWidgetContent}
        </DashboardGrid>
      </div>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Widget</h3>
              <button
                onClick={() => setShowWidgetLibrary(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(WIDGET_COMPONENTS).map(([type, Component]) => (
                <button
                  key={type}
                  onClick={() => handleAddWidget(type as Widget['type'])}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                >
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {type.replace('-', ' ')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {type === 'statistics' && 'Display key metrics and statistics'}
                    {type === 'activity-feed' && 'Show recent activity and updates'}
                    {type === 'metric' && 'Single metric with trend'}
                    {type === 'chart' && 'Data visualization'}
                    {type === 'table' && 'Tabular data display'}
                    {type === 'custom' && 'Custom content widget'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Views Modal */}
      {showSavedViews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Saved Views</h3>
              <button
                onClick={() => setShowSavedViews(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <SavedViews />
          </div>
        </div>
      )}
    </div>
  );
};
