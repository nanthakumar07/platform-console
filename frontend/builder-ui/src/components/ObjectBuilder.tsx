import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { metadataService, MetaObject } from '../services/metadataService';
import { authService } from '../services/auth';

export const ObjectBuilder: React.FC = () => {
  const { hasPermission } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  
  const [objects, setObjects] = useState<MetaObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<MetaObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    apiName: '',
    label: '',
    pluralLabel: '',
    description: ''
  });

  useEffect(() => {
    fetchObjects();
    if (id) {
      fetchObject(id);
      setIsEditing(true);
    } else if (action === 'create') {
      setIsEditing(true);
      setLoading(false);
      // Clear form for new object
      setSelectedObject(null);
      setFormData({
        apiName: '',
        label: '',
        pluralLabel: '',
        description: ''
      });
    }
  }, [id, action]);

  const fetchObjects = async () => {
    try {
      setLoading(true);
      const user = authService.getUser();
      console.log('ObjectBuilder - Current user:', user);
      const objects = await metadataService.getObjects(user?.tenantId);
      console.log('ObjectBuilder - Received objects:', objects);
      setObjects(Array.isArray(objects) ? objects : []);
    } catch (error) {
      console.error('Failed to fetch objects:', error);
      // Fallback to mock data if API fails
      const mockObjects: MetaObject[] = [
        {
          id: '1',
          apiName: 'Customer',
          label: 'Customer',
          pluralLabel: 'Customers',
          description: 'Customer information',
          tenantId: 'demo',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          apiName: 'Order',
          label: 'Order',
          pluralLabel: 'Orders',
          description: 'Order information',
          tenantId: 'demo',
          createdAt: '2024-01-14T16:45:00Z',
          updatedAt: '2024-01-14T16:45:00Z'
        }
      ];
      setObjects(mockObjects);
    } finally {
      setLoading(false);
    }
  };

  const fetchObject = async (objectId: string) => {
    try {
      const object = await metadataService.getObject(objectId);
      setSelectedObject(object);
      setFormData({
        apiName: object.apiName,
        label: object.label,
        pluralLabel: object.pluralLabel,
        description: object.description || ''
      });
    } catch (error) {
      console.error('Failed to fetch object:', error);
      // Fallback to mock data
      const mockObject = objects.find(obj => obj.id === objectId);
      if (mockObject) {
        setSelectedObject(mockObject);
        setFormData({
          apiName: mockObject.apiName,
          label: mockObject.label,
          pluralLabel: mockObject.pluralLabel,
          description: mockObject.description || ''
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('metadata:write')) {
      alert('You do not have permission to create or update objects');
      return;
    }

    try {
      if (isEditing && selectedObject) {
        // Update existing object
        const updatedObject = await metadataService.updateObject(selectedObject.id, {
          label: formData.label,
          pluralLabel: formData.pluralLabel,
          description: formData.description
        });
        
        // Update local state
        const updatedObjects = Array.isArray(objects) ? objects.map(obj => 
          obj.id === selectedObject.id 
            ? { ...obj, ...updatedObject }
            : obj
        ) : [];
        setObjects(updatedObjects);
      } else {
        // Create new object
        const user = authService.getUser();
        if (!user) {
          alert('You must be logged in to create objects');
          return;
        }
        
        const newObject = await metadataService.createObject({
          tenantId: user.tenantId,
          apiName: formData.apiName,
          label: formData.label,
          pluralLabel: formData.pluralLabel,
          description: formData.description
        });
        
        setObjects([...objects, newObject]);
      }
      
      navigate('/objects');
    } catch (error) {
      console.error('Failed to save object:', error);
      alert('Failed to save object');
    }
  };

  const handleDelete = async (objectId: string) => {
    if (!hasPermission('metadata:delete')) {
      alert('You do not have permission to delete objects');
      return;
    }

    if (!confirm('Are you sure you want to delete this object?')) {
      return;
    }

    try {
      await metadataService.deleteObject(objectId);
      setObjects(objects.filter(obj => obj.id !== objectId));
      navigate('/objects');
    } catch (error) {
      console.error('Failed to delete object:', error);
      alert('Failed to delete object');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show object list if not in edit mode
  if (!isEditing) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Objects</h1>
            {hasPermission('metadata:write') && (
              <button
                onClick={() => navigate('/objects?action=create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Object
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {Array.isArray(objects) && objects.map((object) => (
              <li key={object.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{object.label}</div>
                        <div className="text-sm text-gray-500">{object.apiName}</div>
                        {object.description && (
                          <div className="text-sm text-gray-400 mt-1">{object.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate(`/objects/${object.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/objects/${object.id}/fields`)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      Fields
                    </button>
                    {hasPermission('metadata:delete') && (
                      <button
                        onClick={() => handleDelete(object.id)}
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
          
          {objects.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No objects found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first object.</p>
              {hasPermission('metadata:write') && (
                <button
                  onClick={() => navigate('/objects?action=create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Object
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show object form for create/edit
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Object' : 'Create Object'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEditing ? 'Update the object configuration.' : 'Create a new object to manage your data.'}
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                placeholder="e.g., Customer"
              />
              <p className="mt-1 text-sm text-gray-500">
                Used for API endpoints and database table names.
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
                placeholder="e.g., Customer"
              />
              <p className="mt-1 text-sm text-gray-500">
                Display name for the object.
              </p>
            </div>

            <div>
              <label htmlFor="pluralLabel" className="block text-sm font-medium text-gray-700">
                Plural Label *
              </label>
              <input
                type="text"
                id="pluralLabel"
                required
                value={formData.pluralLabel}
                onChange={(e) => setFormData({ ...formData, pluralLabel: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Customers"
              />
              <p className="mt-1 text-sm text-gray-500">
                Plural display name for the object.
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Describe what this object is used for..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/objects')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            {hasPermission('metadata:write') && (
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isEditing ? 'Update' : 'Create'} Object
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
