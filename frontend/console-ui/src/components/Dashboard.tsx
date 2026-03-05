import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Activity,
  Server,
  Database,
  GitBranch,
  AlertTriangle,
  TrendingUp,
  Clock
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()

  const stats = [
    {
      name: 'API Requests',
      value: '12,543',
      change: '+12%',
      changeType: 'increase',
      icon: Activity,
      color: 'bg-blue-500'
    },
    {
      name: 'Database Queries',
      value: '8,234',
      change: '+5%',
      changeType: 'increase',
      icon: Database,
      color: 'bg-green-500'
    },
    {
      name: 'Active Workflows',
      value: '23',
      change: '+2',
      changeType: 'increase',
      icon: GitBranch,
      color: 'bg-purple-500'
    },
    {
      name: 'System Errors',
      value: '3',
      change: '-1',
      changeType: 'decrease',
      icon: AlertTriangle,
      color: 'bg-red-500'
    }
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'api_request',
      message: 'GET /api/users completed successfully',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'workflow_execution',
      message: 'User registration workflow completed',
      timestamp: '5 minutes ago',
      status: 'success'
    },
    {
      id: 3,
      type: 'error',
      message: 'Database connection timeout',
      timestamp: '12 minutes ago',
      status: 'error'
    },
    {
      id: 4,
      type: 'api_request',
      message: 'POST /api/auth/login completed',
      timestamp: '15 minutes ago',
      status: 'success'
    },
    {
      id: 5,
      type: 'system',
      message: 'Scheduled backup completed',
      timestamp: '1 hour ago',
      status: 'success'
    }
  ]

  const systemHealth = [
    {
      name: 'API Server',
      status: 'healthy',
      uptime: '99.9%',
      responseTime: '45ms'
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: '99.8%',
      responseTime: '12ms'
    },
    {
      name: 'Auth Service',
      status: 'healthy',
      uptime: '99.7%',
      responseTime: '23ms'
    },
    {
      name: 'Workflow Engine',
      status: 'warning',
      uptime: '98.5%',
      responseTime: '156ms'
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Admin'}
        </h1>
        <p className="text-gray-600">Here's what's happening with your platform today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="console-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.changeType === 'increase' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-500 mr-1 transform rotate-180" />
                    )}
                    <span className={`text-sm ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="console-panel">
            <div className="console-header">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-100' :
                      activity.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {activity.type === 'api_request' && <Activity className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'workflow_execution' && <GitBranch className="h-4 w-4 text-purple-600" />}
                      {activity.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      {activity.type === 'system' && <Server className="h-4 w-4 text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <div className="flex items-center mt-1">
                        <Clock className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div>
          <div className="console-panel">
            <div className="console-header">
              <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {systemHealth.map((service) => (
                  <div key={service.name} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        service.status === 'healthy' ? 'bg-green-100 text-green-800' :
                        service.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {service.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>Uptime: {service.uptime}</div>
                      <div>Response: {service.responseTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
