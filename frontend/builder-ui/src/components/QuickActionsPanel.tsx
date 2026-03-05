import React, { useState } from 'react';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { RecentItems } from './RecentItems';
import { TemplateLibrary } from './TemplateLibrary';
import { BulkOperations } from './BulkOperations';
import { KeyboardShortcuts } from './KeyboardShortcuts';

interface QuickActionsPanelProps {
  className?: string;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'templates' | 'bulk' | 'shortcuts'>('recent');

  const tabs = [
    { id: 'recent' as const, name: 'Recent Items', icon: '🕐' },
    { id: 'templates' as const, name: 'Templates', icon: '📋' },
    { id: 'bulk' as const, name: 'Bulk Ops', icon: '📦' },
    { id: 'shortcuts' as const, name: 'Shortcuts', icon: '⌨️' },
  ];

  const handleRecentItemClick = (item: any) => {
    console.log('Opening recent item:', item);
    // Navigate to the item or open it in a modal
  };

  const handleTemplateSelect = (template: any) => {
    console.log('Using template:', template);
    // Create new item from template
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 p-2" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'recent' && (
          <RecentItems
            onItemClick={handleRecentItemClick}
            maxItems={15}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateLibrary
            onTemplateSelect={handleTemplateSelect}
            showCreateButton={true}
          />
        )}

        {activeTab === 'bulk' && (
          <BulkOperations />
        )}

        {activeTab === 'shortcuts' && (
          <KeyboardShortcuts />
        )}
      </div>
    </div>
  );
};
