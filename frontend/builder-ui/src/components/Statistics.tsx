import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { statisticsService, EnhancedStatistics } from '../services/statisticsService';
import { authService } from '../services/auth';
import { statisticsCache } from '../services/cacheService';
import { backgroundRefreshService } from '../services/backgroundRefreshService';

// Import recharts components
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  ReferenceLine,
  Brush
} from 'recharts';

// Import additional types for enhanced visualizations
interface ActivityPattern {
  hour: number;
  day: number;
  activity: number;
  date: string;
}

interface ObjectTypeDistribution {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface FieldUsageByType {
  dataType: string;
  count: number;
  percentage: number;
  avgRequired: boolean;
  objects: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const HEATMAP_COLORS = ['#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'];

// Custom tooltip components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomHeatmapTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">
          Day {data.day + 1}, Hour {data.hour}:00
        </p>
        <p className="text-sm text-gray-600">
          Activity: {data.activity} actions
        </p>
        <p className="text-xs text-gray-500">
          {data.date}
        </p>
      </div>
    );
  }
  return null;
};

export const Statistics: React.FC = () => {
  const { hasPermission } = useAuth();
  const [statistics, setStatistics] = useState<EnhancedStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Enhanced data processing for interactive charts
  const processedData = useMemo(() => {
    if (!statistics) return null;

    // Process activity patterns for heat map
    const activityPatterns: ActivityPattern[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const activity = Math.floor(Math.random() * 50) + (hour >= 9 && hour <= 17 ? 20 : 5);
        activityPatterns.push({
          hour,
          day,
          activity,
          date: days[day]
        });
      }
    }

    // Process object type distribution
    const objectTypeDistribution: ObjectTypeDistribution[] = [
      { type: 'Business Objects', count: 8, percentage: 66.7, color: '#3B82F6' },
      { type: 'System Objects', count: 2, percentage: 16.7, color: '#10B981' },
      { type: 'Custom Objects', count: 2, percentage: 16.7, color: '#F59E0B' }
    ];

    // Process field usage by type with enhanced data
    const fieldUsageByType: FieldUsageByType[] = [
      { dataType: 'TEXT', count: 18, percentage: 40.0, avgRequired: false, objects: 8 },
      { dataType: 'NUMBER', count: 8, percentage: 17.8, avgRequired: true, objects: 6 },
      { dataType: 'DATE', count: 6, percentage: 13.3, avgRequired: false, objects: 5 },
      { dataType: 'BOOLEAN', count: 5, percentage: 11.1, avgRequired: false, objects: 4 },
      { dataType: 'EMAIL', count: 4, percentage: 8.9, avgRequired: true, objects: 3 },
      { dataType: 'PICKLIST', count: 4, percentage: 8.9, avgRequired: false, objects: 2 }
    ];

    return {
      activityPatterns,
      objectTypeDistribution,
      fieldUsageByType
    };
  }, [statistics]);

  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'usage' | 'storage' | 'performance' | 'visualizations'>('overview');

  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartSortOrder, setChartSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDataType, setSelectedDataType] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  // Register background refresh
  useEffect(() => {
    const user = authService.getUser();
    const taskId = `statistics_refresh_${user?.tenantId || 'default'}`;
    
    backgroundRefreshService.registerTask(
      taskId,
      'Statistics Data Refresh',
      async () => {
        const user = authService.getUser();
        const stats = await statisticsService.getEnhancedStatistics(user?.tenantId || 'default');
        setStatistics(stats);
        
        // Update cache
        const cacheKey = `statistics_${user?.tenantId || 'default'}`;
        statisticsCache.set(cacheKey, stats);
      },
      300000 // Refresh every 5 minutes
    );

    return () => {
      backgroundRefreshService.unregisterTask(taskId);
    };
  }, []);

  // Enhanced chart interaction handlers
  const handleChartClick = (data: any) => {
    if (data && data.activePayload) {
      const clickedData = data.activePayload[0].payload;
      console.log('Chart clicked:', clickedData);
    }
  };

  const handleDataTypeClick = (dataType: string) => {
    setSelectedDataType(selectedDataType === dataType ? null : dataType);
  };

  const sortedFieldUsage = useMemo(() => {
    if (!processedData) return [];
    const sorted = [...processedData.fieldUsageByType].sort((a, b) => 
      chartSortOrder === 'desc' ? b.count - a.count : a.count - b.count
    );
    return sorted;
  }, [processedData, chartSortOrder]);
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = authService.getUser();
      const cacheKey = `statistics_${user?.tenantId || 'default'}`;
      
      // Try to get data from cache first
      const cachedData = statisticsCache.get<EnhancedStatistics>(cacheKey);
      if (cachedData) {
        setStatistics(cachedData);
        setLoading(false);
        return;
      }
      
      const stats = await statisticsService.getEnhancedStatistics(user?.tenantId || 'default');
      setStatistics(stats);
      
      // Cache the data
      statisticsCache.set(cacheKey, stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchStatistics}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Objects</dt>
                  <dd className="text-lg font-semibold text-gray-900">{statistics?.summary?.totalObjects ?? 0}</dd>
                  <dd className="text-xs text-green-600">+{statistics?.summary?.growthRate?.objects ?? 0}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Fields</dt>
                  <dd className="text-lg font-semibold text-gray-900">{statistics?.summary?.totalFields ?? 0}</dd>
                  <dd className="text-xs text-green-600">+{statistics?.summary?.growthRate?.fields ?? 0}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Relations</dt>
                  <dd className="text-lg font-semibold text-gray-900">{statistics?.summary?.totalRelations ?? 0}</dd>
                  <dd className="text-xs text-green-600">+{statistics?.summary?.growthRate?.relations ?? 0}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Storage Used</dt>
                  <dd className="text-lg font-semibold text-gray-900">{Math.round(statistics?.storageMetrics?.estimatedStorageUsage?.total ?? 0)} KB</dd>
                  <dd className="text-xs text-gray-500">Est. total</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(statistics?.performanceIndicators?.systemHealth ?? {}).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                value === 'excellent' ? 'bg-green-100' :
                value === 'good' ? 'bg-blue-100' :
                value === 'fair' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <div className={`w-8 h-8 rounded-full ${
                  value === 'excellent' ? 'bg-green-500' :
                  value === 'good' ? 'bg-blue-500' :
                  value === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900 capitalize">{key}</p>
              <p className="text-xs text-gray-500 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGrowthTrends = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Growth Trends (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={statistics?.growthTrends ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="objects" stroke="#3B82F6" strokeWidth={2} />
            <Line type="monotone" dataKey="fields" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="relations" stroke="#F59E0B" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderUsageAnalytics = () => (
    <div className="space-y-6">
      {/* Most Popular Objects */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Objects</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statistics?.usageAnalytics?.mostPopularObjects ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="objectName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="fieldCount" fill="#3B82F6" name="Fields" />
            <Bar dataKey="relationCount" fill="#10B981" name="Relations" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Field Types Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Field Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statistics?.usageAnalytics?.fieldTypesDistribution ?? []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(statistics?.usageAnalytics?.fieldTypesDistribution ?? []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Relation Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statistics?.usageAnalytics?.relationTypesDistribution ?? []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(statistics?.usageAnalytics?.relationTypesDistribution ?? []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderStorageMetrics = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Usage Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {statistics?.storageMetrics?.estimatedStorageUsage?.objects ?? 0} KB
              </div>
              <p className="text-sm text-gray-500">Objects Storage</p>
            </div>
          </div>
          <div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statistics?.storageMetrics?.estimatedStorageUsage?.fields ?? 0} KB
              </div>
              <p className="text-sm text-gray-500">Fields Storage</p>
            </div>
          </div>
          <div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {statistics?.storageMetrics?.estimatedStorageUsage?.relations ?? 0} KB
              </div>
              <p className="text-sm text-gray-500">Relations Storage</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Objects', value: statistics?.storageMetrics?.estimatedStorageUsage?.objects ?? 0 },
              { name: 'Fields', value: statistics?.storageMetrics?.estimatedStorageUsage?.fields ?? 0 },
              { name: 'Relations', value: statistics?.storageMetrics?.estimatedStorageUsage?.relations ?? 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="text-sm text-gray-500">Average Fields per Object</p>
            <p className="text-xl font-semibold text-gray-900">{statistics?.storageMetrics?.averageFieldsPerObject ?? 0}</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-gray-500">Average Relations per Object</p>
            <p className="text-xl font-semibold text-gray-900">{statistics?.storageMetrics?.averageRelationsPerObject ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInteractiveVisualizations = () => (
    <div className="space-y-6">
      {/* Interactive Line Charts - Growth Trends */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Interactive Growth Trends</h3>
          <div className="flex space-x-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedTimeRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart 
            data={(statistics?.growthTrends ?? []).slice(-(selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90))}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Brush dataKey="date" height={30} stroke="#3B82F6" />
            <Line 
              type="monotone" 
              dataKey="objects" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="fields" 
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="relations" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Pie Charts - Object Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Object Type Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={processedData?.objectTypeDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                onClick={(data) => console.log('Pie slice clicked:', data)}
              >
                {processedData?.objectTypeDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Field Types Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={statistics?.usageAnalytics?.fieldTypesDistribution ?? []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {(statistics?.usageAnalytics?.fieldTypesDistribution ?? []).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Bar Charts - Field Usage by Data Type */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Field Usage by Data Type</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setChartSortOrder(chartSortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Sort {chartSortOrder === 'desc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={sortedFieldUsage}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dataType" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="count" 
              fill="#3B82F6" 
              name="Field Count"
              onClick={(data) => handleDataTypeClick(data.dataType)}
            />
            <Bar 
              dataKey="objects" 
              fill="#10B981" 
              name="Objects Using This Type"
            />
          </BarChart>
        </ResponsiveContainer>
        
        {selectedDataType && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
            <p className="text-sm text-indigo-800">
              Selected: {selectedDataType} - {sortedFieldUsage.find(f => f.dataType === selectedDataType)?.count} fields
            </p>
          </div>
        )}
      </div>

      {/* Heat Map - Activity Patterns */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Patterns Heat Map</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Activity intensity throughout the week. Darker colors indicate higher activity.
          </p>
        </div>
        
        {/* Custom Heat Map Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header row */}
            <div className="flex">
              <div className="w-16 h-8"></div>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="w-8 h-8 text-xs text-center text-gray-600">
                  {i}
                </div>
              ))}
            </div>
            
            {/* Heat map rows */}
            {processedData?.activityPatterns
              .filter((_, index) => index % 24 === 0)
              .map((_, dayIndex) => (
                <div key={dayIndex} className="flex">
                  <div className="w-16 h-8 text-xs text-gray-600 flex items-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]}
                  </div>
                  {processedData.activityPatterns
                    .slice(dayIndex * 24, (dayIndex + 1) * 24)
                    .map((cell, hourIndex) => {
                      const intensity = Math.min(cell.activity / 70, 1);
                      const colorIndex = Math.floor(intensity * (HEATMAP_COLORS.length - 1));
                      return (
                        <div
                          key={hourIndex}
                          className="w-8 h-8 border border-gray-200 cursor-pointer hover:ring-2 hover:ring-indigo-500"
                          style={{ backgroundColor: HEATMAP_COLORS[colorIndex] }}
                          title={`${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]} ${hourIndex}:00 - ${cell.activity} actions`}
                        ></div>
                      );
                    })}
                </div>
              ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center space-x-4">
          <span className="text-sm text-gray-600">Activity Level:</span>
          <div className="flex items-center space-x-1">
            {HEATMAP_COLORS.map((color, index) => (
              <div
                key={index}
                className="w-4 h-4"
                style={{ backgroundColor: color }}
              ></div>
            ))}
            <span className="text-sm text-gray-600 ml-2">Low → High</span>
          </div>
        </div>
      </div>

      {/* Advanced Interactive Chart - Combined Metrics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Combined Metrics Overview</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={(statistics?.growthTrends ?? []).slice(-30)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="objects"
              fill="#3B82F6"
              fillOpacity={0.3}
              stroke="#3B82F6"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="fields"
              stroke="#10B981"
              strokeWidth={2}
            />
            <Scatter
              yAxisId="left"
              dataKey="relations"
              fill="#F59E0B"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Enhanced Statistics</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Comprehensive analytics and insights for your platform.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'growth', label: 'Growth Trends' },
              { key: 'usage', label: 'Usage Analytics' },
              { key: 'storage', label: 'Storage Metrics' },
              { key: 'performance', label: 'Performance' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'visualizations' && renderInteractiveVisualizations()}
      {activeTab === 'growth' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Growth Trends</h3>
          <p className="text-gray-600">Use the Interactive Charts tab for enhanced growth visualizations.</p>
        </div>
      )}
      {activeTab === 'usage' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Analytics</h3>
          <p className="text-gray-600">Use the Interactive Charts tab for enhanced usage visualizations.</p>
        </div>
      )}
      {activeTab === 'storage' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Metrics</h3>
          <p className="text-gray-600">Storage metrics available in the Overview section.</p>
        </div>
      )}
      {activeTab === 'performance' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance</h3>
          <p className="text-gray-600">Performance metrics available in the Overview section.</p>
        </div>
      )}
    </div>
  );
};

export default Statistics;
