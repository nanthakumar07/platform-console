import React from 'react';
import { Widget } from '../types/personalization';

interface WidgetProps {
  widget: Widget;
  onConfigChange?: (config: Record<string, any>) => void;
}

export const StatisticsWidget: React.FC<WidgetProps> = ({ widget, onConfigChange }) => {
  const { config } = widget;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {config.totalForms || 0}
          </div>
          <div className="text-sm text-gray-600">Total Forms</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {config.activeUsers || 0}
          </div>
          <div className="text-sm text-gray-600">Active Users</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {config.submissions || 0}
          </div>
          <div className="text-sm text-gray-600">Submissions</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {config.conversionRate || 0}%
          </div>
          <div className="text-sm text-gray-600">Conversion Rate</div>
        </div>
      </div>
      {config.showChart && (
        <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-sm">Chart visualization</div>
        </div>
      )}
    </div>
  );
};

export const ActivityFeedWidget: React.FC<WidgetProps> = ({ widget, onConfigChange }) => {
  const { config } = widget;
  const activities = config.recentActivities || [];

  return (
    <div className="space-y-2">
      {activities.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No recent activity
        </div>
      ) : (
        activities.slice(0, config.maxItems || 5).map((activity: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
            <div className="text-blue-500">•</div>
            <div className="flex-1">
              <div className="text-sm text-gray-900">{activity.description}</div>
              <div className="text-xs text-gray-500">{activity.timestamp}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export const MetricWidget: React.FC<WidgetProps> = ({ widget, onConfigChange }) => {
  const { config } = widget;

  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${config.color || 'text-blue-600'}`}>
        {config.value || 0}
      </div>
      <div className="text-sm text-gray-600 mt-1">{config.label || 'Metric'}</div>
      {config.showChange && (
        <div className={`text-xs mt-2 ${config.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {config.changeType === 'positive' ? '↑' : '↓'} {config.changeValue || 0}%
        </div>
      )}
    </div>
  );
};

export const ChartWidget: React.FC<WidgetProps> = ({ widget, onConfigChange }) => {
  const { config } = widget;

  return (
    <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="text-sm text-gray-600">{config.title || 'Chart'}</div>
        <div className="text-xs text-gray-400 mt-1">{config.chartType || 'Line'} chart</div>
      </div>
    </div>
  );
};

export const TableWidget: React.FC<WidgetProps> = ({ widget, onConfigChange }) => {
  const { config } = widget;
  const data = config.data || [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {(config.columns || ['Name', 'Value', 'Status']).map((column: string, index: number) => (
              <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={config.columns?.length || 3} className="px-3 py-4 text-center text-sm text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            data.slice(0, config.maxRows || 5).map((row: any, index: number) => (
              <tr key={index}>
                {(config.columns || ['name', 'value', 'status']).map((column: string, colIndex: number) => (
                  <td key={colIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {row[column] || '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export const CustomWidget: React.FC<WidgetProps> = ({ widget, onConfigChange }) => {
  const { config } = widget;

  return (
    <div className="p-4">
      <div className="text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <div className="text-sm text-gray-600">{config.title || 'Custom Widget'}</div>
        <div className="text-xs text-gray-400 mt-2">Custom content</div>
      </div>
    </div>
  );
};

export const WIDGET_COMPONENTS = {
  statistics: StatisticsWidget,
  'activity-feed': ActivityFeedWidget,
  metric: MetricWidget,
  chart: ChartWidget,
  table: TableWidget,
  custom: CustomWidget,
};
