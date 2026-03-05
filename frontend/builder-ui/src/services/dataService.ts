import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './auth';

export interface DataRecord {
  id: string;
  [key: string]: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataRequest {
  [key: string]: any;
}

export interface UpdateDataRequest {
  [key: string]: any;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class DataService {
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

  // Generic CRUD operations for any object
  async getRecords(
    objectApiName: string, 
    options: QueryOptions = {}
  ): Promise<QueryResult<DataRecord>> {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sort) params.append('sort', options.sort);
      if (options.order) params.append('order', options.order);
      if (options.search) params.append('search', options.search);
      
      // Add filter parameters
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(`filter[${key}]`, value.toString());
          }
        });
      }

      const response: AxiosResponse<QueryResult<DataRecord>> = await this.api.get(
        `/api/v1/${objectApiName}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${objectApiName} records:`, error);
      throw error;
    }
  }

  async getRecord(objectApiName: string, id: string): Promise<DataRecord> {
    try {
      const response: AxiosResponse<DataRecord> = await this.api.get(
        `/api/v1/${objectApiName}/${id}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${objectApiName} record:`, error);
      throw error;
    }
  }

  async createRecord(
    objectApiName: string, 
    data: CreateDataRequest
  ): Promise<DataRecord> {
    try {
      const response: AxiosResponse<DataRecord> = await this.api.post(
        `/api/v1/${objectApiName}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to create ${objectApiName} record:`, error);
      throw error;
    }
  }

  async updateRecord(
    objectApiName: string, 
    id: string, 
    data: UpdateDataRequest
  ): Promise<DataRecord> {
    try {
      const response: AxiosResponse<DataRecord> = await this.api.put(
        `/api/v1/${objectApiName}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update ${objectApiName} record:`, error);
      throw error;
    }
  }

  async deleteRecord(objectApiName: string, id: string): Promise<void> {
    try {
      await this.api.delete(`/api/v1/${objectApiName}/${id}`);
    } catch (error) {
      console.error(`Failed to delete ${objectApiName} record:`, error);
      throw error;
    }
  }

  async bulkCreateRecords(
    objectApiName: string, 
    records: CreateDataRequest[]
  ): Promise<DataRecord[]> {
    try {
      const response: AxiosResponse<DataRecord[]> = await this.api.post(
        `/api/v1/${objectApiName}/bulk`,
        { records }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to bulk create ${objectApiName} records:`, error);
      throw error;
    }
  }

  async bulkUpdateRecords(
    objectApiName: string, 
    updates: Array<{ id: string; data: UpdateDataRequest }>
  ): Promise<DataRecord[]> {
    try {
      const response: AxiosResponse<DataRecord[]> = await this.api.put(
        `/api/v1/${objectApiName}/bulk`,
        { updates }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to bulk update ${objectApiName} records:`, error);
      throw error;
    }
  }

  async bulkDeleteRecords(
    objectApiName: string, 
    ids: string[]
  ): Promise<void> {
    try {
      await this.api.delete(`/api/v1/${objectApiName}/bulk`, { data: { ids } });
    } catch (error) {
      console.error(`Failed to bulk delete ${objectApiName} records:`, error);
      throw error;
    }
  }

  // Export/Import operations
  async exportRecords(
    objectApiName: string, 
    options: QueryOptions = {}
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sort) params.append('sort', options.sort);
      if (options.order) params.append('order', options.order);
      if (options.search) params.append('search', options.search);
      
      // Add filter parameters
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(`filter[${key}]`, value.toString());
          }
        });
      }

      const response: AxiosResponse<Blob> = await this.api.get(
        `/api/v1/${objectApiName}/export?${params.toString()}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to export ${objectApiName} records:`, error);
      throw error;
    }
  }

  async importRecords(
    objectApiName: string, 
    file: File
  ): Promise<{ imported: number; errors: string[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response: AxiosResponse<{ imported: number; errors: string[] }> = await this.api.post(
        `/api/v1/${objectApiName}/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to import ${objectApiName} records:`, error);
      throw error;
    }
  }

  // Search operations
  async searchRecords(
    objectApiName: string, 
    query: string, 
    options: QueryOptions = {}
  ): Promise<QueryResult<DataRecord>> {
    try {
      const searchOptions = { ...options, search: query };
      return this.getRecords(objectApiName, searchOptions);
    } catch (error) {
      console.error(`Failed to search ${objectApiName} records:`, error);
      throw error;
    }
  }

  // Aggregation operations
  async getAggregations(
    objectApiName: string,
    aggregations: Array<{
      field: string;
      operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
      alias?: string;
    }>
  ): Promise<Record<string, any>> {
    try {
      const response: AxiosResponse<Record<string, any>> = await this.api.post(
        `/api/v1/${objectApiName}/aggregate`,
        { aggregations }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to get ${objectApiName} aggregations:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const dataService = new DataService();
