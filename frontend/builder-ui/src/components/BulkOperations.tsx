import React, { useState } from 'react';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { BulkOperation, BulkCreateConfig, BulkUpdateConfig, BulkExportConfig, BulkImportConfig } from '../types/quickActions';

interface BulkOperationsProps {
  className?: string;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({ className = '' }) => {
  const { state, executeBulkOperation } = useQuickActions();
  const [activeTab, setActiveTab] = useState<'create' | 'update' | 'export' | 'import' | 'history'>('create');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  const handleBulkCreate = async (config: BulkCreateConfig) => {
    await executeBulkOperation(config);
    setShowCreateForm(false);
  };

  const handleBulkUpdate = async (config: BulkUpdateConfig) => {
    await executeBulkOperation(config);
    setShowUpdateForm(false);
  };

  const handleBulkExport = async (config: BulkExportConfig) => {
    const operation = await executeBulkOperation(config);
    setShowExportForm(false);
    
    // Simulate download after operation completes
    setTimeout(() => {
      const blob = new Blob(['Sample export data'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-export.${config.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 3000);
  };

  const handleBulkImport = async (config: BulkImportConfig) => {
    await executeBulkOperation(config);
    setShowImportForm(false);
  };

  const getStatusColor = (status: BulkOperation['status']) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50',
      running: 'text-blue-600 bg-blue-50',
      completed: 'text-green-600 bg-green-50',
      failed: 'text-red-600 bg-red-50',
    };
    return colors[status];
  };

  const getStatusIcon = (status: BulkOperation['status']) => {
    const icons = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
    };
    return icons[status];
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - new Date(startTime).getTime();
    const seconds = Math.floor(duration / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Bulk Operations</h2>
        
        <div className="flex space-x-1">
          {(['create', 'update', 'export', 'import', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'create' && (
          <div>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Create Items</h3>
              <p className="text-gray-600 mb-4">Create multiple items at once using templates or custom configurations</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Start Bulk Create
              </button>
            </div>
          </div>
        )}

        {activeTab === 'update' && (
          <div>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Update Items</h3>
              <p className="text-gray-600 mb-4">Update multiple items simultaneously with the same changes</p>
              <button
                onClick={() => setShowUpdateForm(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Start Bulk Update
              </button>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Export Items</h3>
              <p className="text-gray-600 mb-4">Export multiple items in various formats (JSON, CSV, Excel)</p>
              <button
                onClick={() => setShowExportForm(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Start Bulk Export
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Import Items</h3>
              <p className="text-gray-600 mb-4">Import multiple items from files (JSON, CSV, Excel)</p>
              <button
                onClick={() => setShowImportForm(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Start Bulk Import
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Operation History</h3>
            {state.bulkOperations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600">No operations yet</p>
                <p className="text-sm text-gray-500 mt-1">Your bulk operations will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.bulkOperations.map((operation) => (
                  <div key={operation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                          {getStatusIcon(operation.status)} {operation.status}
                        </span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {operation.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDuration(operation.startTime, operation.endTime)}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{operation.processedItems} / {operation.totalItems}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${operation.progress}%` }}
                        />
                      </div>
                    </div>

                    {operation.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-red-600 mb-1">Errors ({operation.errors.length}):</p>
                        <div className="max-h-20 overflow-y-auto">
                          {operation.errors.map((error, index) => (
                            <p key={index} className="text-xs text-red-500">• {error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <BulkCreateForm onSubmit={handleBulkCreate} onCancel={() => setShowCreateForm(false)} />
      )}
      {showUpdateForm && (
        <BulkUpdateForm onSubmit={handleBulkUpdate} onCancel={() => setShowUpdateForm(false)} />
      )}
      {showExportForm && (
        <BulkExportForm onSubmit={handleBulkExport} onCancel={() => setShowExportForm(false)} />
      )}
      {showImportForm && (
        <BulkImportForm onSubmit={handleBulkImport} onCancel={() => setShowImportForm(false)} />
      )}
    </div>
  );
};

// Form Components
interface BulkCreateFormProps {
  onSubmit: (config: BulkCreateConfig) => void;
  onCancel: () => void;
}

const BulkCreateForm: React.FC<BulkCreateFormProps> = ({ onSubmit, onCancel }) => {
  const [config, setConfig] = useState({
    itemType: 'form' as const,
    namingPattern: 'Item {index}',
    startIndex: 1,
    items: [
      { name: '', config: {} }
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  const addItem = () => {
    setConfig({
      ...config,
      items: [...config.items, { name: '', config: {} }]
    });
  };

  const removeItem = (index: number) => {
    setConfig({
      ...config,
      items: config.items.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Create Items</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select
              value={config.itemType}
              onChange={(e) => setConfig({ ...config, itemType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="form">Forms</option>
              <option value="field">Fields</option>
              <option value="template">Templates</option>
              <option value="page">Pages</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naming Pattern</label>
            <input
              type="text"
              value={config.namingPattern}
              onChange={(e) => setConfig({ ...config, namingPattern: e.target.value })}
              placeholder="Item {index}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Items</label>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
              >
                Add Item
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {config.items.map((item, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...config.items];
                      newItems[index].name = e.target.value;
                      setConfig({ ...config, items: newItems });
                    }}
                    placeholder={`Item ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="px-3 py-2 text-red-600 bg-red-50 rounded hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BulkUpdateFormProps {
  onSubmit: (config: BulkUpdateConfig) => void;
  onCancel: () => void;
}

const BulkUpdateForm: React.FC<BulkUpdateFormProps> = ({ onSubmit, onCancel }) => {
  const [config, setConfig] = useState({
    itemType: 'form' as const,
    itemIds: [] as string[],
    updates: {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Update Items</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select
              value={config.itemType}
              onChange={(e) => setConfig({ ...config, itemType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="form">Forms</option>
              <option value="field">Fields</option>
              <option value="template">Templates</option>
              <option value="page">Pages</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item IDs (comma-separated)</label>
            <textarea
              value={config.itemIds.join(', ')}
              onChange={(e) => setConfig({ ...config, itemIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean) })}
              placeholder="item-1, item-2, item-3"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Update Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BulkExportFormProps {
  onSubmit: (config: BulkExportConfig) => void;
  onCancel: () => void;
}

const BulkExportForm: React.FC<BulkExportFormProps> = ({ onSubmit, onCancel }) => {
  const [config, setConfig] = useState({
    itemType: 'form' as const,
    format: 'json' as const,
    includeMetadata: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Export Items</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select
              value={config.itemType}
              onChange={(e) => setConfig({ ...config, itemType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="form">Forms</option>
              <option value="field">Fields</option>
              <option value="template">Templates</option>
              <option value="page">Pages</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={config.format}
              onChange={(e) => setConfig({ ...config, format: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeMetadata"
              checked={config.includeMetadata}
              onChange={(e) => setConfig({ ...config, includeMetadata: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="includeMetadata" className="text-sm text-gray-700">
              Include metadata
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Export Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BulkImportFormProps {
  onSubmit: (config: BulkImportConfig) => void;
  onCancel: () => void;
}

const BulkImportForm: React.FC<BulkImportFormProps> = ({ onSubmit, onCancel }) => {
  const [config, setConfig] = useState({
    itemType: 'form' as const,
    options: {
      overwriteExisting: false,
      validateBeforeImport: true,
      createMissingReferences: false,
    },
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    const fileType = file.name.endsWith('.json') ? 'json' : 
                   file.name.endsWith('.csv') ? 'csv' : 'xlsx';
    
    onSubmit({ ...config, file, fileType });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Import Items</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select
              value={config.itemType}
              onChange={(e) => setConfig({ ...config, itemType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="form">Forms</option>
              <option value="field">Fields</option>
              <option value="template">Templates</option>
              <option value="page">Pages</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              type="file"
              accept=".json,.csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.options.overwriteExisting}
                onChange={(e) => setConfig({
                  ...config,
                  options: { ...config.options, overwriteExisting: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Overwrite existing items</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.options.validateBeforeImport}
                onChange={(e) => setConfig({
                  ...config,
                  options: { ...config.options, validateBeforeImport: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Validate before import</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.options.createMissingReferences}
                onChange={(e) => setConfig({
                  ...config,
                  options: { ...config.options, createMissingReferences: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Create missing references</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Import Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
