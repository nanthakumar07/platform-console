import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { metadataService, MetaObject, MetaField } from '../services/metadataService';
import { authService } from '../services/auth';

interface FormLayout {
  id: string;
  name: string;
  objectId: string;
  sections: number;
  settings: {
    submitButtonText?: string;
    resetButtonText?: string;
    showResetButton?: boolean;
  };
}

const FormBuilder: React.FC = () => {
  const { hasPermission } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [objects, setObjects] = useState<MetaObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<MetaObject | null>(null);
  const [fields, setFields] = useState<MetaField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'preview'>('design');

  // Mock form layouts for demo
  const [formLayouts] = useState<FormLayout[]>([
    {
      id: '1',
      name: 'Customer Registration Form',
      objectId: '1',
      sections: 2,
      settings: {
        submitButtonText: 'Register',
        resetButtonText: 'Clear Form',
        showResetButton: true
      }
    },
    {
      id: '2', 
      name: 'Product Order Form',
      objectId: '2',
      sections: 1,
      settings: {
        submitButtonText: 'Submit Order',
        resetButtonText: 'Reset',
        showResetButton: false
      }
    }
  ]);

  const [selectedLayout, setSelectedLayout] = useState<FormLayout | null>(null);

  useEffect(() => {
    const initializeComponent = async () => {
      console.log('FormBuilder: Initializing component, id:', id);
      await fetchObjects();
      
      if (id) {
        console.log('FormBuilder: Editing mode, checking for navigation state');
        setIsEditing(true);
        
        // Check if we have navigation state (for new layouts)
        const state = location.state as any;
        console.log('FormBuilder: Navigation state:', state);
        
        if (state?.layout && state?.isNewLayout) {
          // New layout from create button
          console.log('FormBuilder: Loading new layout from navigation state');
          setSelectedLayout(state.layout);
          setSelectedObject(state.object);
          if (state.object) {
            await fetchFields(state.object.id);
          }
        } else {
          // Existing layout - find in mock data
          console.log('FormBuilder: Loading existing layout from mock data');
          const layout = formLayouts.find(l => l.id === id);
          if (layout) {
            setSelectedLayout(layout);
            const object = objects.find(obj => obj.id === layout.objectId);
            setSelectedObject(object || null);
            if (object) {
              await fetchFields(object.id);
            }
          } else {
            console.log('FormBuilder: Layout not found for id:', id);
          }
        }
      } else {
        console.log('FormBuilder: List mode (no id)');
      }
      setLoading(false);
    };

    initializeComponent();
  }, [id, location.state]);

  const fetchObjects = async () => {
    try {
      const user = authService.getUser();
      const objects = await metadataService.getObjects(user?.tenantId);
      setObjects(objects);
    } catch (error) {
      console.error('Failed to fetch objects:', error);
    }
  };

  const fetchFields = async (objectId: string) => {
    try {
      const fields = await metadataService.getFields(objectId);
      setFields(Array.isArray(fields) ? fields : []);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      setFields([]); // Ensure fields is always an array on error
    }
  };

  const handleObjectChange = async (objectId: string) => {
    const object = objects.find(obj => obj.id === objectId);
    setSelectedObject(object || null);
    
    if (object) {
      await fetchFields(object.id);
    } else {
      setFields([]);
    }
  };

  const handleCreateLayout = () => {
    console.log('FormBuilder: handleCreateLayout called');
    console.log('FormBuilder: selectedObject:', selectedObject);
    
    if (!selectedObject) {
      alert('Please select an object first');
      return;
    }

    const newLayout: FormLayout = {
      id: Date.now().toString(),
      name: `${selectedObject.label} Form`,
      objectId: selectedObject.id,
      sections: 1,
      settings: {
        submitButtonText: 'Submit',
        resetButtonText: 'Clear',
        showResetButton: true
      }
    };

    console.log('FormBuilder: Creating new layout:', newLayout);

    // Navigate to the edit page with the new layout ID
    navigate(`/forms/${newLayout.id}`, { 
      state: { 
        layout: newLayout,
        object: selectedObject,
        isNewLayout: true 
      } 
    });
  };

  const handleSaveLayout = async () => {
    if (!selectedLayout || !hasPermission('metadata:write')) {
      return;
    }

    try {
      console.log('Saving form layout:', selectedLayout);
      alert('Form layout saved successfully!');
      navigate('/forms');
    } catch (error) {
      console.error('Failed to save form layout:', error);
      alert('Failed to save form layout');
    }
  };

  const handleDeleteLayout = async (layoutId: string) => {
    if (!hasPermission('metadata:delete')) {
      return;
    }

    if (!confirm('Are you sure you want to delete this form layout?')) {
      return;
    }

    try {
      console.log('Deleting form layout:', layoutId);
      alert('Form layout deleted successfully!');
      navigate('/forms');
    } catch (error) {
      console.error('Failed to delete form layout:', error);
      alert('Failed to delete form layout');
    }
  };

  const renderPreview = () => {
    if (!selectedLayout || !selectedObject) return null;

    const renderFieldInput = (field: MetaField) => {
      const baseClasses = "w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
      
      switch (field.dataType) {
        case 'TEXT':
          return (
            <input 
              type="text" 
              className={baseClasses}
              placeholder={`Enter ${field.label}`}
              required={field.required}
            />
          );
        case 'EMAIL':
          return (
            <input 
              type="email" 
              className={baseClasses}
              placeholder={`Enter ${field.label}`}
              required={field.required}
            />
          );
        case 'NUMBER':
          return (
            <input 
              type="number" 
              className={baseClasses}
              placeholder={`Enter ${field.label}`}
              required={field.required}
            />
          );
        case 'DATE':
          return (
            <input 
              type="date" 
              className={baseClasses}
              required={field.required}
            />
          );
        case 'BOOLEAN':
          return (
            <div className="flex items-center">
              <input
                type="checkbox"
                id={field.id}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                required={field.required}
              />
              <label htmlFor={field.id} className="ml-2 text-sm text-gray-700">
                {field.label}
              </label>
            </div>
          );
        case 'PHONE':
          return (
            <input 
              type="tel" 
              className={baseClasses}
              placeholder={`Enter ${field.label}`}
              required={field.required}
            />
          );
        case 'URL':
          return (
            <input 
              type="url" 
              className={baseClasses}
              placeholder={`Enter ${field.label}`}
              required={field.required}
            />
          );
        default:
          return (
            <input 
              type="text" 
              className={baseClasses}
              placeholder={`Enter ${field.label}`}
              required={field.required}
            />
          );
      }
    };

    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Form Preview</h3>
        <p className="text-gray-600 mb-6">Preview for {selectedLayout.name}</p>
        
        <form className="space-y-4">
          {Array.isArray(fields) && fields.length > 0 ? (
            fields.slice(0, 5).map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderFieldInput(field)}
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Fields Available</h3>
              <p className="text-gray-500">This object doesn't have any fields yet. Create fields first to build your form.</p>
            </div>
          )}
          
          {Array.isArray(fields) && fields.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                {selectedLayout.settings?.showResetButton && (
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {selectedLayout.settings.resetButtonText || 'Reset'}
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {selectedLayout.settings?.submitButtonText || 'Submit'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show form list if no ID is provided
  if (!id) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Form Layouts</h1>
            {hasPermission('metadata:write') && (
              <button
                onClick={handleCreateLayout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Form Layout
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {formLayouts.map((layout) => (
              <li key={layout.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{layout.name}</div>
                        <div className="text-sm text-gray-500">
                          {objects.find(obj => obj.id === layout.objectId)?.label || 'Unknown Object'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {layout.sections} section{layout.sections !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate(`/forms/${layout.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    {hasPermission('metadata:delete') && (
                      <button
                        onClick={() => handleDeleteLayout(layout.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {formLayouts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No form layouts found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first form layout.</p>
              {hasPermission('metadata:write') && (
                <button
                  onClick={handleCreateLayout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Form Layout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Form Layout' : 'Create Form Layout'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEditing ? 'Update the form layout configuration.' : 'Create a new form layout for your objects.'}
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('design')}
              className={`py-2 border-b-2 font-medium text-sm ${
                activeTab === 'design'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Design
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-2 border-b-2 font-medium text-sm ${
                activeTab === 'preview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preview
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'design' ? (
            <div className="space-y-6">
              {/* Object Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Object
                </label>
                <select
                  value={selectedObject?.id || ''}
                  onChange={(e) => handleObjectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select an object</option>
                  {objects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Name
                </label>
                <input
                  type="text"
                  value={selectedLayout?.name || ''}
                  onChange={(e) => setSelectedLayout(selectedLayout ? { ...selectedLayout, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter form name"
                />
              </div>

              {/* Settings */}
              {selectedLayout && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Submit Button Text
                      </label>
                      <input
                        type="text"
                        value={selectedLayout.settings?.submitButtonText || ''}
                        onChange={(e) => setSelectedLayout({
                          ...selectedLayout,
                          settings: {
                            ...selectedLayout.settings,
                            submitButtonText: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Submit"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showResetButton"
                        checked={selectedLayout.settings?.showResetButton || false}
                        onChange={(e) => setSelectedLayout({
                          ...selectedLayout,
                          settings: {
                            ...selectedLayout.settings,
                            showResetButton: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showResetButton" className="ml-2 text-sm text-gray-700">
                        Show Reset Button
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Fields */}
              {selectedObject && Array.isArray(fields) && fields.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Available Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fields.map((field) => (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                          <span className="text-sm font-medium">{field.label}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>Type: {field.dataType}</div>
                          <div>Required: {field.required ? 'Yes' : 'No'}</div>
                          {field.defaultValue && <div>Default: {field.defaultValue}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Fields Message */}
              {selectedObject && (!Array.isArray(fields) || fields.length === 0) && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fields Available</h3>
                  <p className="text-gray-500">This object doesn't have any fields yet. Create fields first to build your form.</p>
                </div>
              )}
            </div>
          ) : (
            renderPreview()
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 sm:px-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate('/forms')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            {hasPermission('metadata:write') && (
              <button
                onClick={handleSaveLayout}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isEditing ? 'Update' : 'Create'} Form Layout
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
