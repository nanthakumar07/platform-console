import React, { useState } from 'react';
import { usePersonalization } from '../contexts/PersonalizationContext';
import { DashboardLayout, Widget } from '../types/personalization';

interface SavedViewsProps {
  className?: string;
}

export const SavedViews: React.FC<SavedViewsProps> = ({ className = '' }) => {
  const { preferences, addDashboardLayout, updateDashboardLayout, deleteDashboardLayout, setActiveLayout } = usePersonalization();
  const [isCreating, setIsCreating] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingLayout, setEditingLayout] = useState<string | null>(null);

  const handleCreateLayout = () => {
    if (!newLayoutName.trim()) return;

    const newLayout: DashboardLayout = {
      id: Date.now().toString(),
      name: newLayoutName,
      widgets: preferences.widgets,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addDashboardLayout(newLayout);
    setNewLayoutName('');
    setIsCreating(false);
  };

  const handleUpdateLayout = (layoutId: string, name: string) => {
    updateDashboardLayout(layoutId, { name });
    setEditingLayout(null);
  };

  const handleSetAsDefault = (layoutId: string) => {
    // Remove default from all layouts
    preferences.dashboardLayouts.forEach(layout => {
      if (layout.isDefault) {
        updateDashboardLayout(layout.id, { isDefault: false });
      }
    });
    updateDashboardLayout(layoutId, { isDefault: true });
  };

  const handleLoadLayout = (layout: DashboardLayout) => {
    setActiveLayout(layout.id);
    // Here you would also load the widgets from the layout
    // This might involve updating the widgets in the preferences
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Saved Views</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Save Current View
          </button>
        </div>
      </div>

      <div className="p-6">
        {isCreating && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Create New View</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="Enter view name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateLayout}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewLayoutName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {preferences.dashboardLayouts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-gray-600">No saved views yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first saved view to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {preferences.dashboardLayouts.map((layout) => (
              <div
                key={layout.id}
                className={`p-4 border rounded-lg ${
                  preferences.activeLayoutId === layout.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingLayout === layout.id ? (
                      <input
                        type="text"
                        defaultValue={layout.name}
                        onBlur={(e) => handleUpdateLayout(layout.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateLayout(layout.id, e.currentTarget.value);
                          }
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-gray-900">{layout.name}</h3>
                    )}
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {layout.widgets.length} widgets
                      </span>
                      <span className="text-xs text-gray-500">
                        Created {new Date(layout.createdAt).toLocaleDateString()}
                      </span>
                      {layout.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLoadLayout(layout)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => setEditingLayout(layout.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleSetAsDefault(layout.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Set as default"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteDashboardLayout(layout.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
