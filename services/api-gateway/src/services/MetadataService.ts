import axios, { AxiosInstance } from 'axios';
import { ServiceConfig } from '../types';

export interface MetaObject {
  id: string;
  tenantId: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetaField {
  id: string;
  objectId: string;
  tenantId: string;
  apiName: string;
  label: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  defaultValue?: string;
  picklistValues?: Array<{ value: string; label: string; isActive: boolean }>;
  validationRules?: Array<{ type: string; value?: string | number; message?: string }>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetaRelation {
  id: string;
  tenantId: string;
  sourceObjectId: string;
  targetObjectId: string;
  relationType: string;
  fieldName?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantMetadata {
  id: string;
  name: string;
  settings?: {
    allowedOrigins?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ObjectDefinition {
  apiName: string;
  label: string;
  fields: MetaField[];
  relationships?: Array<{
    id: string;
    parentObjectId: string;
    childObjectId: string;
    relationType: string;
    fieldName: string;
  }>;
}

export class MetadataService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: ServiceConfig) {
    this.baseUrl = config.metadataService;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getTenantInfo(tenantId: string): Promise<TenantMetadata | null> {
    try {
      const response = await this.client.get(`/api/v1/tenants/${tenantId}`);
      return response.data?.tenant || response.data || null;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 404) {
          return null;
        }
      }
      throw new Error(`Failed to fetch tenant info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllowedOrigins(origin: string): Promise<boolean> {
  try {
    // Extract potential tenant from subdomain
    const hostname = new URL(origin).hostname;
    const subdomain = hostname.split('.')[0];
    if (!subdomain) return false;

    const tenant = await this.getTenantInfo(subdomain);
    if (!tenant || !tenant.settings?.allowedOrigins) return false;
    return tenant.settings.allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

  // Object operations
  async getObjects(tenantId: string): Promise<MetaObject[]> {
    try {
      const response = await this.client.get('/api/v1/objects', {
        params: { tenantId }
      });
      return response.data.objects || response.data;
    } catch (error) {
      throw new Error(`Failed to fetch objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getObject(tenantId: string, objectId: string): Promise<MetaObject | null> {
    try {
      const response = await this.client.get(`/api/v1/objects/${objectId}`, {
        headers: { 'X-Tenant-ID': tenantId }
      });
      return response.data;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 404) {
          return null;
        }
      }
      throw new Error(`Failed to fetch object: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createObject(tenantId: string, objectData: Partial<MetaObject>): Promise<MetaObject> {
    try {
      const response = await this.client.post('/api/v1/objects', {
        ...objectData,
        tenantId
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create object: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateObject(tenantId: string, objectId: string, updateData: Partial<MetaObject>): Promise<MetaObject> {
    try {
      const response = await this.client.patch(`/api/v1/objects/${objectId}`, updateData, {
        headers: { 'X-Tenant-ID': tenantId }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update object: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteObject(tenantId: string, objectId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/objects/${objectId}`, {
        headers: { 'X-Tenant-ID': tenantId }
      });
    } catch (error) {
      throw new Error(`Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Field operations
  async getFields(tenantId: string, objectId?: string): Promise<MetaField[]> {
    try {
      const params: any = { tenantId };
      if (objectId) params.objectId = objectId;

      const response = await this.client.get('/api/v1/fields', { params });
      return response.data.fields || response.data;
    } catch (error) {
      throw new Error(`Failed to fetch fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRelations(tenantId: string, objectId?: string): Promise<MetaRelation[]> {
    try {
      const params: Record<string, string> = { tenantId };
      if (objectId) params.objectId = objectId;

      const response = await this.client.get('/api/v1/relations', { params });
      return response.data.relations || response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createField(tenantId: string, fieldData: Partial<MetaField>): Promise<MetaField> {
    try {
      const response = await this.client.post('/api/v1/fields', {
        ...fieldData,
        tenantId
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateField(tenantId: string, fieldId: string, updateData: Partial<MetaField>): Promise<MetaField> {
    try {
      const response = await this.client.patch(`/api/v1/fields/${fieldId}`, updateData, {
        headers: { 'X-Tenant-ID': tenantId }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteField(tenantId: string, fieldId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/fields/${fieldId}`, {
        headers: { 'X-Tenant-ID': tenantId }
      });
    } catch (error) {
      throw new Error(`Failed to delete field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get complete object definition with fields
  async getObjectDefinition(tenantId: string, objectApiName: string): Promise<ObjectDefinition | null> {
    try {
      // First get the object
      const object = await this.getObjects(tenantId).then(objects => 
        objects.find(obj => obj.apiName === objectApiName)
      );

      if (!object) {
        return null;
      }

      // Get fields for this object
      const fields = await this.getFields(tenantId, object.id);

      return {
        apiName: object.apiName,
        label: object.label,
        fields
      };
    } catch (error) {
      throw new Error(`Failed to get object definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cache object definitions
  private objectCache = new Map<string, { definition: ObjectDefinition; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getCachedObjectDefinition(tenantId: string, objectApiName: string): Promise<ObjectDefinition | null> {
    const cacheKey = `${tenantId}:${objectApiName}`;
    const cached = this.objectCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.definition;
    }

    const definition = await this.getObjectDefinition(tenantId, objectApiName);
    
    if (definition) {
      this.objectCache.set(cacheKey, {
        definition,
        timestamp: Date.now()
      });
    }

    return definition;
  }

  // Invalidate cache when object/field changes
  invalidateObjectCache(tenantId: string, objectApiName: string): void {
    const cacheKey = `${tenantId}:${objectApiName}`;
    this.objectCache.delete(cacheKey);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}
