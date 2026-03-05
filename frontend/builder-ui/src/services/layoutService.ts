import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './auth';

export interface LayoutComponent {
  id: string;
  type: 'header' | 'sidebar' | 'content' | 'footer' | 'card' | 'form' | 'table' | 'chart';
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface Layout {
  id: string;
  name: string;
  description: string;
  components: LayoutComponent[];
  gridSettings: {
    columns: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
  };
  settings: {
    isResponsive: boolean;
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  version: number;
  tags: string[];
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'form' | 'report' | 'landing' | 'admin';
  thumbnail: string;
  layout: Omit<Layout, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
  isPremium: boolean;
}

class LayoutService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 15000,
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

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshResponse = await authService.refreshTokens();
            if (refreshResponse.success && refreshResponse.token) {
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            await authService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async getLayouts(tenantId?: string): Promise<Layout[]> {
    try {
      const url = tenantId 
        ? `/api/v1/layouts?tenantId=${tenantId}` 
        : '/api/v1/layouts';
      const response: AxiosResponse<Layout[]> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch layouts:', error);
      return this.getMockLayouts();
    }
  }

  async getLayout(layoutId: string, tenantId?: string): Promise<Layout | null> {
    try {
      const url = tenantId 
        ? `/api/v1/layouts/${layoutId}?tenantId=${tenantId}` 
        : `/api/v1/layouts/${layoutId}`;
      const response: AxiosResponse<Layout> = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch layout:', error);
      return null;
    }
  }

  async createLayout(layout: Omit<Layout, 'id' | 'createdAt' | 'updatedAt' | 'version'>, tenantId?: string): Promise<Layout> {
    try {
      const url = tenantId ? `/api/v1/layouts?tenantId=${tenantId}` : '/api/v1/layouts';
      const response: AxiosResponse<Layout> = await this.api.post(url, layout);
      return response.data;
    } catch (error) {
      console.error('Failed to create layout:', error);
      // Return mock layout for development
      return {
        ...layout,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
    }
  }

  async updateLayout(layoutId: string, updates: Partial<Layout>, tenantId?: string): Promise<Layout> {
    try {
      const url = tenantId 
        ? `/api/v1/layouts/${layoutId}?tenantId=${tenantId}` 
        : `/api/v1/layouts/${layoutId}`;
      const response: AxiosResponse<Layout> = await this.api.put(url, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update layout:', error);
      throw error;
    }
  }

  async deleteLayout(layoutId: string, tenantId?: string): Promise<void> {
    try {
      const url = tenantId 
        ? `/api/v1/layouts/${layoutId}?tenantId=${tenantId}` 
        : `/api/v1/layouts/${layoutId}`;
      await this.api.delete(url);
    } catch (error) {
      console.error('Failed to delete layout:', error);
      throw error;
    }
  }

  async duplicateLayout(layoutId: string, newName: string, tenantId?: string): Promise<Layout> {
    try {
      const originalLayout = await this.getLayout(layoutId, tenantId);
      if (!originalLayout) {
        throw new Error('Original layout not found');
      }

      const { id, createdAt, updatedAt, version, ...layoutToDuplicate } = originalLayout;
      const duplicatedLayout = {
        ...layoutToDuplicate,
        name: newName,
        description: `${originalLayout.description} (Copy)`
      };

      return await this.createLayout(duplicatedLayout, tenantId);
    } catch (error) {
      console.error('Failed to duplicate layout:', error);
      throw error;
    }
  }

  async getTemplates(): Promise<LayoutTemplate[]> {
    try {
      const response: AxiosResponse<LayoutTemplate[]> = await this.api.get('/api/v1/layout-templates');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return this.getMockTemplates();
    }
  }

  async createLayoutFromTemplate(templateId: string, layoutName: string, tenantId?: string): Promise<Layout> {
    try {
      const response: AxiosResponse<Layout> = await this.api.post('/api/v1/layouts/from-template', {
        templateId,
        name: layoutName,
        tenantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create layout from template:', error);
      throw error;
    }
  }

  // Mock data for development
  private getMockLayouts(): Layout[] {
    return [
      {
        id: '1',
        name: 'Dashboard Layout',
        description: 'Main dashboard with sidebar and content area',
        components: [
          {
            id: 'comp_1',
            type: 'header',
            name: 'Main Header',
            width: 12,
            height: 2,
            x: 0,
            y: 0,
            config: { title: 'Dashboard', subtitle: 'Welcome back' }
          },
          {
            id: 'comp_2',
            type: 'sidebar',
            name: 'Navigation Sidebar',
            width: 3,
            height: 8,
            x: 0,
            y: 2,
            config: { menuItems: ['Home', 'Analytics', 'Settings'], collapsible: true }
          },
          {
            id: 'comp_3',
            type: 'content',
            name: 'Main Content',
            width: 9,
            height: 8,
            x: 3,
            y: 2,
            config: { contentType: 'dashboard', dataSource: 'analytics' }
          }
        ],
        gridSettings: {
          columns: 12,
          rowHeight: 60,
          margin: [10, 10],
          containerPadding: [20, 20]
        },
        settings: {
          isResponsive: true,
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1280 }
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T15:30:00Z',
        version: 2,
        tags: ['dashboard', 'responsive']
      },
      {
        id: '2',
        name: 'Form Layout',
        description: 'Contact form with validation',
        components: [
          {
            id: 'comp_4',
            type: 'header',
            name: 'Form Header',
            width: 12,
            height: 2,
            x: 0,
            y: 0,
            config: { title: 'Contact Us', subtitle: 'Get in touch' }
          },
          {
            id: 'comp_5',
            type: 'form',
            name: 'Contact Form',
            width: 8,
            height: 6,
            x: 2,
            y: 2,
            config: { formId: 'contact', fields: ['name', 'email', 'message'], validation: true }
          }
        ],
        gridSettings: {
          columns: 12,
          rowHeight: 60,
          margin: [10, 10],
          containerPadding: [20, 20]
        },
        settings: {
          isResponsive: false,
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1280 }
        },
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T11:20:00Z',
        version: 1,
        tags: ['form', 'contact']
      }
    ];
  }

  private getMockTemplates(): LayoutTemplate[] {
    return [
      {
        id: 'dashboard-template',
        name: 'Analytics Dashboard',
        description: 'Complete dashboard with charts and metrics',
        category: 'dashboard',
        thumbnail: '/templates/dashboard-thumb.png',
        isPremium: false,
        layout: {
          name: 'Analytics Dashboard',
          description: 'Complete analytics dashboard template',
          components: [
            {
              id: 'template_header',
              type: 'header',
              name: 'Dashboard Header',
              width: 12,
              height: 2,
              x: 0,
              y: 0,
              config: { title: 'Analytics Dashboard', subtitle: 'Real-time metrics' }
            },
            {
              id: 'template_sidebar',
              type: 'sidebar',
              name: 'Navigation',
              width: 3,
              height: 10,
              x: 0,
              y: 2,
              config: { menuItems: ['Overview', 'Reports', 'Settings'], collapsible: true }
            },
            {
              id: 'template_content',
              type: 'content',
              name: 'Main Content',
              width: 9,
              height: 10,
              x: 3,
              y: 2,
              config: { contentType: 'analytics', dataSource: 'metrics' }
            }
          ],
          gridSettings: {
            columns: 12,
            rowHeight: 60,
            margin: [10, 10],
            containerPadding: [20, 20]
          },
          settings: {
            isResponsive: true,
            breakpoints: { mobile: 768, tablet: 1024, desktop: 1280 }
          },
          tags: ['dashboard', 'analytics', 'responsive']
        }
      },
      {
        id: 'form-template',
        name: 'Contact Form',
        description: 'Professional contact form layout',
        category: 'form',
        thumbnail: '/templates/form-thumb.png',
        isPremium: false,
        layout: {
          name: 'Contact Form',
          description: 'Professional contact form',
          components: [
            {
              id: 'form_header',
              type: 'header',
              name: 'Form Header',
              width: 12,
              height: 2,
              x: 0,
              y: 0,
              config: { title: 'Contact Us', subtitle: 'We would love to hear from you' }
            },
            {
              id: 'form_main',
              type: 'form',
              name: 'Contact Form',
              width: 8,
              height: 8,
              x: 2,
              y: 2,
              config: { formId: 'contact', fields: ['name', 'email', 'phone', 'message'], validation: true }
            }
          ],
          gridSettings: {
            columns: 12,
            rowHeight: 60,
            margin: [10, 10],
            containerPadding: [20, 20]
          },
          settings: {
            isResponsive: true,
            breakpoints: { mobile: 768, tablet: 1024, desktop: 1280 }
          },
          tags: ['form', 'contact', 'responsive']
        }
      }
    ];
  }
}

// Create singleton instance
export const layoutService = new LayoutService();
