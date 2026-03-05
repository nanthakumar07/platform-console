import React from 'react'
import { Users, Plus, Edit, Trash2, Shield } from 'lucide-react'

export const UserManager: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage user accounts and permissions.</p>
      </div>

      <div className="console-panel">
        <div className="console-header">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>User management interface coming soon</p>
        </div>
      </div>
    </div>
  )
}
