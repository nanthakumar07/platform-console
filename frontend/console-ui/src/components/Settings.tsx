import React from 'react'
import { Settings as SettingsIcon, User, Bell, Shield, Database } from 'lucide-react'

export const Settings: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your platform settings.</p>
      </div>

      <div className="console-panel">
        <div className="console-header">
          <h2 className="text-lg font-semibold text-gray-900">Platform Settings</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Settings interface coming soon</p>
        </div>
      </div>
    </div>
  )
}
