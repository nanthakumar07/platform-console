import React from 'react'
import { GitBranch, Play, Pause, Square } from 'lucide-react'

export const WorkflowMonitor: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Monitor</h1>
        <p className="text-gray-600">Monitor and manage your workflow executions.</p>
      </div>

      <div className="console-panel">
        <div className="console-header">
          <h2 className="text-lg font-semibold text-gray-900">Active Workflows</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Workflow monitoring interface coming soon</p>
        </div>
      </div>
    </div>
  )
}
