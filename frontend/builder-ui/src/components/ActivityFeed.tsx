import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ActivityItem, ActivityFilter, ExportOptions } from '../types/activity';
import { activityService } from '../services/activityService';
import { wsService } from '../services/websocket';
import { VirtualizedList, useInfiniteScroll } from './VirtualizedList';
import { activityCache } from '../services/cacheService';

interface ActivityFeedProps {
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ className = '' }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>({
    types: [],
    entityTypes: [],
    dateRange: null,
    users: [],
    searchQuery: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [useVirtualization, setUseVirtualization] = useState(false);

  const ACTIVITY_ITEM_HEIGHT = 120; // Height of each activity item in pixels
  const CONTAINER_HEIGHT = 600; // Height of the container
  const ITEMS_PER_PAGE = 20;

  // Load initial activities
  useEffect(() => {
    loadActivities(true);
  }, [filter]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsService.connect();
        wsService.subscribe('activity', (newActivity: ActivityItem) => {
          setActivities(prev => [newActivity, ...prev].slice(0, 100)); // Keep latest 100
        });
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      wsService.disconnect();
    };
  }, []);

  const loadActivities = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setActivities([]);
      }

      const cacheKey = `activities_${JSON.stringify(filter)}_page_${page}`;
      
      // Try to get data from cache first
      const cachedData = activityCache.get<ActivityItem[]>(cacheKey);
      if (cachedData && !reset) {
        setActivities(prev => [...prev, ...cachedData]);
        setHasMore(cachedData.length === ITEMS_PER_PAGE);
        return;
      }
      
      const data = await activityService.getActivities(filter);
      
      if (reset) {
        setActivities(data.slice(0, ITEMS_PER_PAGE));
      } else {
        setActivities(prev => [...prev, ...data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)]);
      }
      
      setHasMore(data.length === ITEMS_PER_PAGE);
      
      // Cache the data
      activityCache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes cache
      
      // Enable virtualization for large lists
      if (activities.length > 50) {
        setUseVirtualization(true);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreActivities = useCallback(async () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
    await loadActivities(false);
  }, [hasMore, loading]);

  const { isFetching } = useInfiniteScroll(loadMoreActivities, hasMore);

  const handleFilterChange = (newFilter: Partial<ActivityFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const handleActivityClick = async (activity: ActivityItem) => {
    try {
      const entity = await activityService.getRelatedEntity(activity.entityType, activity.entityId);
      setSelectedActivity({ ...activity, metadata: { ...activity.metadata, entity } });
    } catch (error) {
      setSelectedActivity(activity);
    }
  };

  const handleExport = async (format: ExportOptions['format']) => {
    try {
      setIsExporting(true);
      const exportOptions: ExportOptions = {
        format,
        includeMetadata: true,
        dateRange: filter.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date(),
        },
        filters: filter,
      };

      const blob = await activityService.exportActivities(exportOptions);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export activities');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setFilter({
      types: [],
      entityTypes: [],
      dateRange: null,
      users: [],
      searchQuery: '',
    });
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (filter.types.length > 0 && !filter.types.includes(activity.type)) {
        return false;
      }
      if (filter.entityTypes.length > 0 && !filter.entityTypes.includes(activity.entityType)) {
        return false;
      }
      if (filter.users.length > 0 && !filter.users.includes(activity.userId)) {
        return false;
      }
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        return (
          activity.description.toLowerCase().includes(query) ||
          activity.entityName.toLowerCase().includes(query) ||
          activity.userName.toLowerCase().includes(query)
        );
      }
      if (filter.dateRange) {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= filter.dateRange.start && activityDate <= filter.dateRange.end;
      }
      return true;
    });
  }, [activities, filter]);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Activity Feed</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <div className="relative inline-block text-left">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
              <div className="absolute right-0 z-10 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={filter.searchQuery}
                  onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
                  placeholder="Search activities..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Types</label>
                <select
                  multiple
                  value={filter.types}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value as ActivityItem['type']);
                    handleFilterChange({ types: values });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="export">Export</option>
                  <option value="import">Import</option>
                  <option value="share">Share</option>
                  <option value="comment">Comment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Types</label>
                <select
                  multiple
                  value={filter.entityTypes}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value as ActivityItem['entityType']);
                    handleFilterChange({ entityTypes: values });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="form">Form</option>
                  <option value="field">Field</option>
                  <option value="user">User</option>
                  <option value="template">Template</option>
                  <option value="page">Page</option>
                  <option value="api">API</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => loadActivities(true)}
              className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
            >
              Retry
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No activities found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {useVirtualization ? (
              <VirtualizedList
                items={filteredActivities}
                itemHeight={ACTIVITY_ITEM_HEIGHT}
                containerHeight={CONTAINER_HEIGHT}
                renderItem={(activity, index) => (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors mx-2"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`text-2xl ${activityService.getActivityColor(activity.type)}`}>
                        {activityService.getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activityService.formatActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.userName} • {new Date(activity.timestamp).toLocaleString()}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {activity.entityType}
                      </div>
                    </div>
                  </div>
                )}
              />
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`text-2xl ${activityService.getActivityColor(activity.type)}`}>
                      {activityService.getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activityService.formatActivityDescription(activity)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.userName} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {activity.entityType}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Load more button for non-virtualized lists */}
            {!useVirtualization && hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMoreActivities}
                  disabled={isFetching}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {isFetching ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Activity Details</h3>
              <button
                onClick={() => setSelectedActivity(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Description</h4>
                <p className="text-sm text-gray-900">{activityService.formatActivityDescription(selectedActivity)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">User</h4>
                <p className="text-sm text-gray-900">{selectedActivity.userName} ({selectedActivity.userEmail})</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Timestamp</h4>
                <p className="text-sm text-gray-900">{new Date(selectedActivity.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Entity</h4>
                <p className="text-sm text-gray-900">
                  {selectedActivity.entityType}: {selectedActivity.entityName}
                </p>
              </div>
              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Metadata</h4>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedActivity.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={() => {
                    // Handle edit action
                    console.log('Edit entity:', selectedActivity.entityId);
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  View/Edit Item
                </button>
                <button
                  onClick={() => {
                    // Handle view details action
                    console.log('View details:', selectedActivity.entityId);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
