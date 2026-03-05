import React from 'react';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { RecentItem } from '../types/quickActions';

interface RecentItemsProps {
  className?: string;
  maxItems?: number;
  onItemClick?: (item: RecentItem) => void;
}

export const RecentItems: React.FC<RecentItemsProps> = ({ 
  className = '', 
  maxItems = 10,
  onItemClick 
}) => {
  const { state, removeRecentItem, addRecentItem } = useQuickActions();
  
  const recentItems = state.recentItems.slice(0, maxItems);

  const getItemIcon = (type: RecentItem['type']) => {
    const icons = {
      form: '📝',
      field: '🔧',
      template: '📋',
      page: '📄',
      api: '🔌',
      webhook: '🎣',
    };
    return icons[type] || '📁';
  };

  const getItemColor = (type: RecentItem['type']) => {
    const colors = {
      form: 'text-blue-600 bg-blue-50',
      field: 'text-green-600 bg-green-50',
      template: 'text-purple-600 bg-purple-50',
      page: 'text-orange-600 bg-orange-50',
      api: 'text-red-600 bg-red-50',
      webhook: 'text-indigo-600 bg-indigo-50',
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  const handleItemClick = (item: RecentItem) => {
    // Update access count and last accessed time
    addRecentItem({
      type: item.type,
      name: item.name,
      description: item.description,
      metadata: item.metadata,
    });
    
    onItemClick?.(item);
  };

  const handleRemoveItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    removeRecentItem(itemId);
  };

  const formatLastAccessed = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (recentItems.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600">No recent items</p>
        <p className="text-sm text-gray-500 mt-1">Items you work with will appear here</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Recent Items</h3>
        <span className="text-xs text-gray-500">{recentItems.length} items</span>
      </div>
      
      <div className="space-y-1">
        {recentItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${getItemColor(item.type)}`}>
              <span className="text-sm">{getItemIcon(item.type)}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </p>
                <button
                  onClick={(e) => handleRemoveItem(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getItemColor(item.type)}`}>
                  {item.type}
                </span>
                <span className="text-xs text-gray-500">
                  {formatLastAccessed(item.lastAccessed)}
                </span>
                {item.accessCount > 1 && (
                  <span className="text-xs text-gray-400">
                    {item.accessCount}×
                  </span>
                )}
              </div>
              
              {item.description && (
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
