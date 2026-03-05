import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { metadataService, MetaObject, MetaField, CreateMetaFieldRequest } from '../services/metadataService';
import { authService } from '../services/auth';

const FieldBuilder: React.FC = () => {
  const { hasPermission } = useAuth();
  const { objectId } = useParams<{ objectId: string }>();
  const navigate = useNavigate();
  
  const [object, setObject] = useState<MetaObject | null>(null);
  const [fields, setFields] = useState<MetaField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateMetaFieldRequest>({
    apiName: '',
    label: '',
    dataType: 'TEXT',
    required: false,
    unique: false,
    objectId: objectId || '',
    tenantId: ''
  });

  useEffect(() => {
    if (objectId) {
      loadObjectAndFields();
    }
  }, [objectId]);

  const loadObjectAndFields = async () => {
    try {
      const user = authService.getUser();
      if (!user || !objectId) return;

      // Load object details
      const objects = await metadataService.getObjects(user.tenantId);
      const currentObject = objects.find(obj => obj.id === objectId);
      setObject(currentObject || null);

      // Load fields
      const fields = await metadataService.getFields(objectId);
      setFields(Array.isArray(fields) ? fields : []);

      // Set tenant ID in form data
      setFormData(prev => ({ ...prev, tenantId: user.tenantId }));
    } catch (error) {
      console.error('Failed to load object and fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('metadata:write')) {
      alert('You do not have permission to create fields');
      return;
    }

    if (!formData.apiName || !formData.label || !objectId) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const fieldData = {
        ...formData,
        objectId
      };

      await metadataService.createField(fieldData);
      
      // Reset form
      setFormData({
        apiName: '',
        label: '',
        dataType: 'TEXT',
        required: false,
        unique: false,
        objectId,
        tenantId: formData.tenantId
      });

      // Reload fields
      await loadObjectAndFields();
      
      alert('Field created successfully!');
    } catch (error) {
      console.error('Failed to create field:', error);
      alert('Failed to create field');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!hasPermission('metadata:delete')) {
      alert('You do not have permission to delete fields');
      return;
    }

    if (!confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      await metadataService.deleteField(fieldId);
      await loadObjectAndFields();
      alert('Field deleted successfully!');
    } catch (error) {
      console.error('Failed to delete field:', error);
      alert('Failed to delete field');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/objects')}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Objects
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Fields for {object?.label || 'Object'}
        </h1>
        <p className="mt-2 text-gray-600">
          Create and manage fields for this object.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Field Creation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Field</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="apiName" className="block text-sm font-medium text-gray-700">
                    API Name *
                  </label>
                  <input
                    type="text"
                    id="apiName"
                    required
                    value={formData.apiName}
                    onChange={(e) => setFormData({ ...formData, apiName: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., firstName"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used for API and database column names.
                  </p>
                </div>

                <div>
                  <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                    Label *
                  </label>
                  <input
                    type="text"
                    id="label"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., First Name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Display name for the field.
                  </p>
                </div>

                <div>
                  <label htmlFor="dataType" className="block text-sm font-medium text-gray-700">
                    Data Type *
                  </label>
                  <select
                    id="dataType"
                    value={formData.dataType}
                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="TEXT">Text</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone</option>
                    <option value="URL">URL</option>
                    <option value="NUMBER">Number</option>
                    <option value="CURRENCY">Currency</option>
                    <option value="DATE">Date</option>
                    <option value="DATETIME">Date & Time</option>
                    <option value="BOOLEAN">Boolean (Yes/No)</option>
                    <option value="PICKLIST">Picklist</option>
                    <option value="LOOKUP">Lookup</option>
                    <option value="FORMULA">Formula</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                      Required
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="unique"
                      checked={formData.unique}
                      onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="unique" className="ml-2 text-sm text-gray-700">
                      Unique
                    </label>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isCreating || !hasPermission('metadata:write')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Field'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Fields List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Fields</h3>
              
              {fields.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fields Found</h3>
                  <p className="text-gray-500">Create your first field using the form on the left.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900">{field.label}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {field.dataType}
                            </span>
                            {field.required && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                            {field.unique && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Unique
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">API Name: {field.apiName}</p>
                          {field.defaultValue && (
                            <p className="text-sm text-gray-500">Default: {field.defaultValue}</p>
                          )}
                        </div>
                        {hasPermission('metadata:delete') && (
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldBuilder;
