import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './auth';

export interface MetaObject {
  id: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  description?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface MetaField {
  id: string;
  objectId: string;
  tenantId: string;
  apiName: string;
  label: string;
  dataType: 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'DATETIME' | 'BOOLEAN' | 'PICKLIST' | 'LOOKUP' | 'FORMULA';
  required: boolean;
  unique: boolean;
  defaultValue?: string;
  picklistValues?: Array<{
    value: string;
    label: string;
    isActive: boolean;
    sortOrder: number;
  }>;
  validationRules?: Array<{
    type: 'required' | 'unique' | 'regex' | 'minLength' | 'maxLength' | 'min' | 'max';
    value?: string | number;
    message?: string;
  }>;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetaRelation {
  id: string;
  parentObjectId: string;
  childObjectId: string;
  tenantId: string;
  relationType: 'LOOKUP' | 'MASTER_DETAIL' | 'M2M';
  fieldName: string;
  relatedFieldName?: string;
  cascadeDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetaObjectRequest {
  tenantId: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  description?: string;
}

export interface UpdateMetaObjectRequest {
  label?: string;
  pluralLabel?: string;
  description?: string;
}

export interface CreateMetaFieldRequest {
  tenantId: string;
  objectId: string;
  apiName: string;
  label: string;
  dataType: MetaField['dataType'];
  required?: boolean;
  unique?: boolean;
  defaultValue?: string;
  picklistValues?: MetaField['picklistValues'];
  validationRules?: MetaField['validationRules'];
}

export interface CreateMetaRelationRequest {
  parentObjectId: string;
  childObjectId: string;
  relationType: MetaRelation['relationType'];
  fieldName: string;
  relatedFieldName?: string;
  cascadeDelete?: boolean;
}

class MetadataService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Setup response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshResponse = await authService.refreshTokens();
            if (refreshResponse.success && refreshResponse.token) {
              // Retry the original request
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            await authService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Object Management
  async getObjects(tenantId?: string): Promise<MetaObject[]> {
    try {
      const url = tenantId ? `/api/v1/objects?tenantId=${tenantId}` : '/api/v1/objects';
      const response: AxiosResponse<{ objects: MetaObject[]; pagination: any }> = await this.api.get(url);
      return response.data.objects;
    } catch (error) {
      console.error('Failed to fetch objects:', error);
      throw error;
    }
  }

  async getObject(id: string): Promise<MetaObject> {
    try {
      const response: AxiosResponse<MetaObject> = await this.api.get(`/api/v1/objects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch object:', error);
      throw error;
    }
  }

  async createObject(data: CreateMetaObjectRequest): Promise<MetaObject> {
    try {
      const response: AxiosResponse<MetaObject> = await this.api.post('/api/v1/objects', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create object:', error);
      throw error;
    }
  }

  async updateObject(id: string, data: UpdateMetaObjectRequest): Promise<MetaObject> {
    try {
      const response: AxiosResponse<MetaObject> = await this.api.patch(`/api/v1/objects/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update object:', error);
      throw error;
    }
  }

  async deleteObject(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/objects/${id}`);
    } catch (error) {
      console.error('Failed to delete object:', error);
      throw error;
    }
  }

  // Field Management
  async getFields(objectId?: string): Promise<MetaField[]> {
    try {
      const url = objectId ? `/api/v1/fields?objectId=${objectId}` : '/api/v1/fields';
      const response: AxiosResponse<{ fields: MetaField[] }> = await this.api.get(url);
      return response.data.fields;
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      throw error;
    }
  }

  async getField(id: string): Promise<MetaField> {
    try {
      const response: AxiosResponse<MetaField> = await this.api.get(`/api/v1/fields/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch field:', error);
      throw error;
    }
  }

  async createField(data: CreateMetaFieldRequest): Promise<MetaField> {
    try {
      const response: AxiosResponse<MetaField> = await this.api.post('/api/v1/fields', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create field:', error);
      throw error;
    }
  }

  async updateField(id: string, data: Partial<CreateMetaFieldRequest>): Promise<MetaField> {
    try {
      const response: AxiosResponse<MetaField> = await this.api.patch(`/api/v1/fields/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update field:', error);
      throw error;
    }
  }

  async deleteField(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/fields/${id}`);
    } catch (error) {
      console.error('Failed to delete field:', error);
      throw error;
    }
  }

  // Relation Management
  async getRelations(): Promise<MetaRelation[]> {
    try {
      const response: AxiosResponse<MetaRelation[]> = await this.api.get('/api/v1/relations');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch relations:', error);
      throw error;
    }
  }

  async getRelation(id: string): Promise<MetaRelation> {
    try {
      const response: AxiosResponse<MetaRelation> = await this.api.get(`/api/v1/relations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch relation:', error);
      throw error;
    }
  }

  async createRelation(data: CreateMetaRelationRequest): Promise<MetaRelation> {
    try {
      const response: AxiosResponse<MetaRelation> = await this.api.post('/api/v1/relations', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create relation:', error);
      throw error;
    }
  }

  async updateRelation(id: string, data: Partial<CreateMetaRelationRequest>): Promise<MetaRelation> {
    try {
      const response: AxiosResponse<MetaRelation> = await this.api.put(`/api/v1/relations/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update relation:', error);
      throw error;
    }
  }

  async deleteRelation(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/relations/${id}`);
    } catch (error) {
      console.error('Failed to delete relation:', error);
      throw error;
    }
  }

  // Dashboard Statistics
  async getDashboardStats(tenantId?: string): Promise<{
    totalObjects: number;
    totalFields: number;
    totalRelations: number;
    recentActivity: Array<{
      id: string;
      type: 'object' | 'field' | 'relation';
      action: 'created' | 'updated' | 'deleted';
      name: string;
      timestamp: string;
    }>;
  }> {
    try {
      const url = tenantId ? `/api/v1/dashboard/stats?tenantId=${tenantId}` : '/api/v1/dashboard/stats';
      const response: AxiosResponse<any> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const metadataService = new MetadataService();
