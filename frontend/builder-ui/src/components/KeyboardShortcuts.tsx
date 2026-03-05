import React, { useEffect, useState, useCallback } from 'react';
import { useQuickActions } from '../contexts/QuickActionsContext';
import { KeyboardShortcut } from '../types/quickActions';

interface KeyboardShortcutsProps {
  className?: string;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ className = '' }) => {
  const { state, registerShortcut, unregisterShortcut, executeShortcut } = useQuickActions();
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys: string[] = [];
      
      if (event.ctrlKey || event.metaKey) pressedKeys.push('ctrl');
      if (event.altKey) pressedKeys.push('alt');
      if (event.shiftKey) pressedKeys.push('shift');
      
      if (event.key && !['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
        pressedKeys.push(event.key.toLowerCase());
      }

      // Check for matching shortcuts
      const matchingShortcut = state.shortcuts.find(shortcut => {
        if (!shortcut.enabled) return false;
        
        const shortcutKeys = [...shortcut.keys].sort();
        const pressedKeysSorted = [...pressedKeys].sort();
        
        return shortcutKeys.length === pressedKeysSorted.length &&
               shortcutKeys.every((key, index) => key === pressedKeysSorted[index]);
      });

      if (matchingShortcut) {
        event.preventDefault();
        executeShortcut(matchingShortcut.id);
      }

      // Global shortcuts
      if (event.ctrlKey && event.key === '?' && showHelp) {
        event.preventDefault();
        setShowHelp(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.shortcuts, showHelp, executeShortcut]);

  const filteredShortcuts = state.shortcuts.filter(shortcut => {
    const query = searchQuery.toLowerCase();
    return shortcut.name.toLowerCase().includes(query) ||
           shortcut.description.toLowerCase().includes(query) ||
           shortcut.category.toLowerCase().includes(query);
  });

  const formatKeys = (keys: string[]) => {
    return keys.map(key => {
      if (key === 'ctrl') return 'Ctrl';
      if (key === 'alt') return 'Alt';
      if (key === 'shift') return 'Shift';
      return key.toUpperCase();
    }).join(' + ');
  };

  const getCategoryIcon = (category: KeyboardShortcut['category']) => {
    const icons = {
      navigation: '🧭',
      creation: '➕',
      editing: '✏️',
      bulk: '📦',
      general: '⚙️',
    };
    return icons[category] || '⌨️';
  };

  const getCategoryColor = (category: KeyboardShortcut['category']) => {
    const colors = {
      navigation: 'text-blue-600 bg-blue-50',
      creation: 'text-green-600 bg-green-50',
      editing: 'text-orange-600 bg-orange-50',
      bulk: 'text-purple-600 bg-purple-50',
      general: 'text-gray-600 bg-gray-50',
    };
    return colors[category] || 'text-gray-600 bg-gray-50';
  };

  const handleCreateShortcut = (shortcutData: Omit<KeyboardShortcut, 'id'>) => {
    const newShortcut: KeyboardShortcut = {
      ...shortcutData,
      id: `shortcut-${Date.now()}`,
      action: () => console.log(`Executing shortcut: ${shortcutData.name}`),
    };
    registerShortcut(newShortcut);
  };

  const handleUpdateShortcut = (id: string, updates: Partial<KeyboardShortcut>) => {
    unregisterShortcut(id);
    const existingShortcut = state.shortcuts.find(s => s.id === id);
    if (existingShortcut) {
      registerShortcut({ ...existingShortcut, ...updates });
    }
  };

  const handleDeleteShortcut = (id: string) => {
    unregisterShortcut(id);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showHelp ? 'Hide' : 'Show'} Help
          </button>
        </div>

        {showHelp && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Press <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + ?</kbd> to toggle this help panel.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="p-6">
        {filteredShortcuts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600">No shortcuts found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(['navigation', 'creation', 'editing', 'bulk', 'general'] as const).map((category) => {
              const categoryShortcuts = filteredShortcuts.filter(s => s.category === category);
              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 capitalize flex items-center space-x-2">
                    <span>{getCategoryIcon(category)}</span>
                    <span>{category}</span>
                    <span className="text-gray-400">({categoryShortcuts.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900">{shortcut.name}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(shortcut.category)}`}>
                              {shortcut.category}
                            </span>
                            {!shortcut.enabled && (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{shortcut.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                            {formatKeys(shortcut.keys)}
                          </kbd>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => executeShortcut(shortcut.id)}
                              disabled={!shortcut.enabled}
                              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                              title="Test shortcut"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteShortcut(shortcut.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete shortcut"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-200">
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          Create New Shortcut
        </button>
      </div>

      {showCreateForm && (
        <ShortcutForm
          onSubmit={handleCreateShortcut}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

interface ShortcutFormProps {
  onSubmit: (shortcut: Omit<KeyboardShortcut, 'id'>) => void;
  onCancel: () => void;
}

const ShortcutForm: React.FC<ShortcutFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keys: [] as string[],
    category: 'general' as KeyboardShortcut['category'],
    enabled: true,
    global: false,
  });

  const [keyInput, setKeyInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isRecording) return;
    
    event.preventDefault();
    const keys = [];
    
    if (event.ctrlKey || event.metaKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    
    if (event.key && !['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
      keys.push(event.key.toLowerCase());
    }
    
    if (keys.length > 0) {
      setFormData({ ...formData, keys });
      setKeyInput(formatKeys(keys));
      setIsRecording(false);
    }
  }, [isRecording, formData]);

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isRecording, handleKeyDown]);

  const formatKeys = (keys: string[]) => {
    return keys.map(key => {
      if (key === 'ctrl') return 'Ctrl';
      if (key === 'alt') return 'Alt';
      if (key === 'shift') return 'Shift';
      return key.toUpperCase();
    }).join(' + ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      action: () => console.log(`Executing shortcut: ${formData.name}`),
    });
  };

  const startRecording = () => {
    setIsRecording(true);
    setKeyInput('Press keys...');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Keyboard Shortcut</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keys</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={keyInput}
                readOnly
                placeholder="Click to record keys"
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isRecording ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={startRecording}
                disabled={isRecording}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
              >
                {isRecording ? 'Recording...' : 'Record'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="navigation">Navigation</option>
              <option value="creation">Creation</option>
              <option value="editing">Editing</option>
              <option value="bulk">Bulk Operations</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Enabled</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.global}
                onChange={(e) => setFormData({ ...formData, global: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Global</span>
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
              disabled={formData.keys.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Shortcut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
