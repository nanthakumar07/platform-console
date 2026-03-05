import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedAnalytics } from '../types/analytics';
import { userEngagementService } from '../services/userEngagementService';
import { systemHealthService } from '../services/systemHealthService';
import { dataQualityService } from '../services/dataQualityService';
import { businessMetricsService } from '../services/businessMetricsService';
import { statisticsCache } from '../services/cacheService';

// Import recharts components
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface AdvancedAnalyticsDashboardProps {
  className?: string;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({ className = '' }) => {
  const { user, hasPermission } = useAuth();
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'engagement' | 'health' | 'quality' | 'business'>('engagement');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    if (hasPermission('analytics:read')) {
      loadAnalytics();
    }
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `advanced_analytics_${user?.tenantId || 'default'}_${timeRange}`;
      
      // Try cache first
      const cachedData = statisticsCache.get<AdvancedAnalytics>(cacheKey);
      if (cachedData) {
        setAnalytics(cachedData);
        setLoading(false);
        return;
      }

      // Load data from all services
      const [userEngagement, systemHealth, dataQuality, businessMetrics] = await Promise.all([
        userEngagementService.getEngagementAnalytics(),
        Promise.resolve(systemHealthService.getSystemHealthMetrics()),
        Promise.resolve(dataQualityService.getDataQualityMetrics()),
        Promise.resolve(businessMetricsService.calculateBusinessMetrics(getMockBusinessData()))
      ]);

      const advancedAnalytics: AdvancedAnalytics = {
        userEngagement,
        systemHealth,
        dataQuality,
        businessMetrics,
        generatedAt: new Date(),
        period: {
          start: new Date(Date.now() - getTimeRangeMs(timeRange)),
          end: new Date()
        }
      };

      setAnalytics(advancedAnalytics);
      statisticsCache.set(cacheKey, advancedAnalytics, 10 * 60 * 1000); // 10 minutes cache

    } catch (error) {
      console.error('Failed to load advanced analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const getMockBusinessData = () => {
    // Mock business data for demonstration
    return {
      objects: Array.from({ length: 45 }, (_, i) => ({ id: i, name: `Object ${i}`, entityType: 'object' })),
      fields: Array.from({ length: 180 }, (_, i) => ({ id: i, name: `Field ${i}`, entityType: 'field' })),
      relations: Array.from({ length: 12 }, (_, i) => ({ id: i, name: `Relation ${i}`, entityType: 'relation' })),
      users: Array.from({ length: 25 }, (_, i) => ({ id: i, name: `User ${i}`, isActive: i < 20 })),
      activities: [],
      systemMetrics: {
        totalAPICalls: 15000,
        fastAPICalls: 14250,
        apiCallsPerDay: 500,
        concurrentUsers: 15,
        avgCPU: 45,
        avgMemory: 62
      }
    };
  };

  const renderUserEngagement = () => {
    if (!analytics) return null;

    const { userEngagement } = analytics;

    const engagementData = [
      { name: 'Daily Active', value: userEngagement.activeUsers, color: '#3B82F6' },
      { name: 'Weekly Active', value: Math.floor(userEngagement.activeUsers * 1.3), color: '#10B981' },
      { name: 'Monthly Active', value: Math.floor(userEngagement.activeUsers * 2.1), color: '#F59E0B' }
    ];

    const retentionData = [
      { metric: 'Day 1', value: userEngagement.userRetention.daily * 100 },
      { metric: 'Day 7', value: userEngagement.userRetention.weekly * 100 },
      { metric: 'Day 30', value: userEngagement.userRetention.monthly * 100 }
    ];

    return (
      <div className="space-y-6">
        {/* Engagement Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-2xl font-bold text-gray-900">{userEngagement.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-green-600">+12% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
            <p className="text-2xl font-bold text-gray-900">{userEngagement.activeUsers.toLocaleString()}</p>
            <p className="text-sm text-green-600">+8% from last week</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Session</h3>
            <p className="text-2xl font-bold text-gray-900">{userEngagement.avgSessionDuration.toFixed(1)} min</p>
            <p className="text-sm text-blue-600">+2.3 min increase</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Engagement Score</h3>
            <p className="text-2xl font-bold text-gray-900">{userEngagement.engagementScore}/10</p>
            <p className="text-sm text-green-600">Excellent performance</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Retention</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Features */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Features Usage</h3>
          <div className="space-y-3">
            {userEngagement.topFeatures.map((feature, index) => {
              const usage = userEngagement.featureUsage.find(f => f.featureName === feature);
              return (
                <div key={feature} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="font-medium text-gray-900">{feature}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{usage?.totalUses || 0} uses</span>
                    <span className="text-xs text-gray-500 ml-2">by {usage?.uniqueUsers || 0} users</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSystemHealth = () => {
    if (!analytics) return null;

    const { systemHealth } = analytics;
    const healthStatus = systemHealthService.getHealthStatus();

    const responseTimeData = [
      { metric: 'Average', value: systemHealth.apiResponseTime.avg, color: '#3B82F6' },
      { metric: 'P50', value: systemHealth.apiResponseTime.p50, color: '#10B981' },
      { metric: 'P95', value: systemHealth.apiResponseTime.p95, color: '#F59E0B' },
      { metric: 'P99', value: systemHealth.apiResponseTime.p99, color: '#EF4444' }
    ];

    const resourceData = [
      { resource: 'CPU', usage: systemHealth.resourceUsage.cpu, color: '#3B82F6' },
      { resource: 'Memory', usage: systemHealth.resourceUsage.memory, color: '#10B981' },
      { resource: 'Disk', usage: systemHealth.resourceUsage.disk, color: '#F59E0B' },
      { resource: 'Network', usage: systemHealth.resourceUsage.network, color: '#8B5CF6' }
    ];

    return (
      <div className="space-y-6">
        {/* Health Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${
            healthStatus.status === 'healthy' ? 'border-green-500' :
            healthStatus.status === 'warning' ? 'border-yellow-500' : 'border-red-500'
          }`}>
            <h3 className="text-sm font-medium text-gray-500">System Status</h3>
            <p className="text-2xl font-bold text-gray-900 capitalize">{healthStatus.status}</p>
            <p className="text-sm text-gray-600">{healthStatus.message}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Health Score</h3>
            <p className="text-2xl font-bold text-gray-900">{healthStatus.score}%</p>
            <p className="text-sm text-gray-600">Overall performance</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Uptime</h3>
            <p className="text-2xl font-bold text-gray-900">{systemHealth.uptime.percentage.toFixed(2)}%</p>
            <p className="text-sm text-gray-600">Last 30 days</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
            <p className="text-2xl font-bold text-gray-900">{systemHealth.errorRates.total}</p>
            <p className="text-sm text-gray-600">Total errors</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">API Response Times</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ resource, usage }) => `${resource}: ${usage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="usage"
                >
                  {resourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Database Metrics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Database Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Connection Pool</h4>
              <p className="text-xl font-semibold text-gray-900">{systemHealth.database.connectionPool}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${systemHealth.database.connectionPool}%` }}
                ></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Avg Query Time</h4>
              <p className="text-xl font-semibold text-gray-900">{systemHealth.database.queryTime.toFixed(1)}ms</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(systemHealth.database.queryTime / 10, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Slow Queries</h4>
              <p className="text-xl font-semibold text-gray-900">{systemHealth.database.slowQueries}</p>
              <p className="text-xs text-gray-500 mt-1">Queries {'>'} 1s</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDataQuality = () => {
    if (!analytics) return null;

    const { dataQuality } = analytics;
    const qualitySummary = dataQualityService.getQualitySummary();

    const qualityScores = [
      { aspect: 'Completeness', score: dataQuality.completeness, color: '#3B82F6' },
      { aspect: 'Accuracy', score: dataQuality.accuracy, color: '#10B981' },
      { aspect: 'Consistency', score: dataQuality.consistency, color: '#F59E0B' },
      { aspect: 'Timeliness', score: dataQuality.timeliness, color: '#EF4444' },
      { aspect: 'Validity', score: dataQuality.validity, color: '#8B5CF6' }
    ];

    const issuesByType = dataQualityService.getIssuesByType();
    const issuesBySeverity = dataQualityService.getIssuesBySeverity();

    return (
      <div className="space-y-6">
        {/* Quality Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${
            qualitySummary.status === 'excellent' ? 'border-green-500' :
            qualitySummary.status === 'good' ? 'border-blue-500' :
            qualitySummary.status === 'fair' ? 'border-yellow-500' : 'border-red-500'
          }`}>
            <h3 className="text-sm font-medium text-gray-500">Quality Score</h3>
            <p className="text-2xl font-bold text-gray-900">{qualitySummary.score}%</p>
            <p className="text-sm text-gray-600 capitalize">{qualitySummary.status}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Issues</h3>
            <p className="text-2xl font-bold text-gray-900">{qualitySummary.issues}</p>
            <p className="text-sm text-gray-600">Detected problems</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Critical Issues</h3>
            <p className="text-2xl font-bold text-red-600">{qualitySummary.critical}</p>
            <p className="text-sm text-gray-600">Require immediate attention</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">High Priority</h3>
            <p className="text-2xl font-bold text-orange-600">{qualitySummary.high}</p>
            <p className="text-sm text-gray-600">Should be addressed soon</p>
          </div>
        </div>

        {/* Quality Scores Radar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Dimensions</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={qualityScores}>
              <PolarGrid />
              <PolarAngleAxis dataKey="aspect" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Issues Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Issues by Type</h3>
            <div className="space-y-3">
              {Object.entries(issuesByType).map(([type, issues]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize font-medium text-gray-900">{type.replace('_', ' ')}</span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                    {issues.length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Issues by Severity</h3>
            <div className="space-y-3">
              {Object.entries(issuesBySeverity).map(([severity, issues]) => (
                <div key={severity} className="flex items-center justify-between">
                  <span className="capitalize font-medium text-gray-900">{severity}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    severity === 'critical' ? 'bg-red-100 text-red-800' :
                    severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {issues.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBusinessMetrics = () => {
    if (!analytics) return null;

    const { businessMetrics } = analytics;
    const kpiPerformance = businessMetricsService.getKPIPerformanceSummary();
    const recommendations = businessMetricsService.getKPIRecommendations();

    return (
      <div className="space-y-6">
        {/* Business Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Objects</h3>
            <p className="text-2xl font-bold text-gray-900">{businessMetrics.totalObjects}</p>
            <p className="text-sm text-green-600">+15% this month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Fields</h3>
            <p className="text-2xl font-bold text-gray-900">{businessMetrics.totalFields}</p>
            <p className="text-sm text-green-600">+22% this month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Objects/User</h3>
            <p className="text-2xl font-bold text-gray-900">{businessMetrics.userProductivity.objectsCreatedPerUser.toFixed(1)}</p>
            <p className="text-sm text-blue-600">Avg productivity</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
            <p className="text-2xl font-bold text-gray-900">{businessMetrics.systemUtilization.storageUsed.toFixed(1)} MB</p>
            <p className="text-sm text-gray-600">Total storage</p>
          </div>
        </div>

        {/* KPI Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">KPI Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{kpiPerformance.total}</p>
              <p className="text-sm text-gray-500">Total KPIs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{kpiPerformance.onTarget}</p>
              <p className="text-sm text-gray-500">On Target</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{kpiPerformance.belowTarget}</p>
              <p className="text-sm text-gray-500">Below Target</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{kpiPerformance.critical}</p>
              <p className="text-sm text-gray-500">Critical</p>
            </div>
          </div>
        </div>

        {/* KPIs by Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">KPIs by Category</h3>
          <div className="space-y-4">
            {businessMetrics.customKPIs.map((kpi) => (
              <div key={kpi.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      kpi.category === 'productivity' ? 'bg-blue-100 text-blue-800' :
                      kpi.category === 'quality' ? 'bg-green-100 text-green-800' :
                      kpi.category === 'efficiency' ? 'bg-purple-100 text-purple-800' :
                      kpi.category === 'growth' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {kpi.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {kpi.value} {kpi.unit}
                  </p>
                  <p className="text-sm text-gray-500">Target: {kpi.target} {kpi.unit}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs ${
                      kpi.trend === 'up' ? 'text-green-600' :
                      kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {kpi.changePercentage > 0 ? '+' : ''}{kpi.changePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                  rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      rec.priority === 'high' ? 'bg-red-500' :
                      rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{rec.recommendation}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        KPI: {rec.kpi.name} ({rec.kpi.value}/{rec.kpi.target} {rec.kpi.unit})
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hasPermission('analytics:read')) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">You don't have permission to view advanced analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
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
                onClick={loadAnalytics}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into platform performance and user behavior</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'engagement', label: 'User Engagement' },
            { key: 'health', label: 'System Health' },
            { key: 'quality', label: 'Data Quality' },
            { key: 'business', label: 'Business Metrics' }
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

      {/* Tab Content */}
      {activeTab === 'engagement' && renderUserEngagement()}
      {activeTab === 'health' && renderSystemHealth()}
      {activeTab === 'quality' && renderDataQuality()}
      {activeTab === 'business' && renderBusinessMetrics()}
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
