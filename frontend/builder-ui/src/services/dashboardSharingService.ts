import { SharedDashboard, SharePermissions, Collaborator } from '../types/collaboration';
import { authService } from './auth';

interface DashboardExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'png' | 'svg';
  includeData: boolean;
  includeConfig: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

interface ShareLink {
  id: string;
  url: string;
  token: string;
  expiresAt?: Date;
  permissions: SharePermissions;
  createdAt: Date;
  accessCount: number;
  isActive: boolean;
}

class DashboardSharingService {
  private sharedDashboards: Map<string, SharedDashboard> = new Map();
  private shareLinks: Map<string, ShareLink> = new Map();

  // Share dashboard with specific users or publicly
  async shareDashboard(
    name: string,
    description?: string,
    permissions?: SharePermissions,
    collaborators?: Collaborator[]
  ): Promise<SharedDashboard> {
    const user = authService.getUser();
    if (!user) throw new Error('User not authenticated');
    if (!permissions) throw new Error('Permissions are required');

    const sharedDashboard: SharedDashboard = {
      id: this.generateShareId(),
      name,
      description,
      ownerId: user.id,
      ownerName: `${user.firstName} ${user.lastName}`,
      ownerEmail: user.email,
      config: {
        layout: this.getCurrentDashboardLayout(),
        filters: this.getCurrentDashboardFilters(),
        timeRange: this.getCurrentTimeRange(),
        widgets: this.getCurrentWidgets(),
        permissions
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: permissions.isPublic,
        tenantId: user.tenantId || 'default',
        accessCount: 0
      },
      collaborators: collaborators || []
    };

    // Generate share token if public
    if (permissions.isPublic) {
      sharedDashboard.metadata.shareToken = this.generateShareToken();
    }

    try {
      const response = await fetch('/api/shared-dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(sharedDashboard)
      });

      if (!response.ok) {
        throw new Error('Failed to share dashboard');
      }

      const savedDashboard = await response.json();
      this.sharedDashboards.set(savedDashboard.id, savedDashboard);

      return savedDashboard;
    } catch (error) {
      console.error('Failed to share dashboard:', error);
      throw error;
    }
  }

  // Update shared dashboard
  async updateSharedDashboard(
    shareId: string,
    updates: Partial<SharedDashboard>
  ): Promise<SharedDashboard> {
    const existing = this.sharedDashboards.get(shareId);
    if (!existing) {
      throw new Error('Shared dashboard not found');
    }

    const updatedDashboard = { ...existing, ...updates };
    updatedDashboard.metadata.updatedAt = new Date();

    try {
      const response = await fetch(`/api/shared-dashboards/${shareId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(updatedDashboard)
      });

      if (!response.ok) {
        throw new Error('Failed to update shared dashboard');
      }

      const savedDashboard = await response.json();
      this.sharedDashboards.set(shareId, savedDashboard);

      return savedDashboard;
    } catch (error) {
      console.error('Failed to update shared dashboard:', error);
      throw error;
    }
  }

  // Get shared dashboard by ID
  async getSharedDashboard(shareId: string, token: string): Promise<SharedDashboard | null> {
    try {
      const url = `/api/shared-dashboards/public/${shareId}?token=${token}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(url, { headers });

      if (!response.ok) {
        return null;
      }

      const dashboard = await response.json();
      this.sharedDashboards.set(shareId, dashboard);

      // Update access count
      this.updateAccessCount(shareId);

      return dashboard;
    } catch (error) {
      console.error('Failed to get shared dashboard:', error);
      return null;
    }
  }

  // Get user's shared dashboards
  async getSharedDashboards(): Promise<SharedDashboard[]> {
    try {
      const response = await fetch('/api/shared-dashboards', {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shared dashboards');
      }

      const dashboards = await response.json();
      dashboards.forEach((dashboard: SharedDashboard) => {
        this.sharedDashboards.set(dashboard.id, dashboard);
      });

      return dashboards;
    } catch (error) {
      console.error('Failed to fetch shared dashboards:', error);
      return [];
    }
  }

  // Delete shared dashboard
  async deleteSharedDashboard(shareId: string): Promise<void> {
    try {
      const response = await fetch(`/api/shared-dashboards/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete shared dashboard');
      }

      this.sharedDashboards.delete(shareId);
    } catch (error) {
      console.error('Failed to delete shared dashboard:', error);
      throw error;
    }
  }

  // Add collaborator to shared dashboard
  async addCollaborator(
    shareId: string,
    userId: string,
    role: Collaborator['role'],
    permissions: string[]
  ): Promise<Collaborator> {
    const user = authService.getUser();
    if (!user) throw new Error('User not authenticated');

    const collaborator: Collaborator = {
      id: this.generateCollaboratorId(),
      userId,
      userName: '', // Will be filled by backend
      userEmail: '', // Will be filled by backend
      role,
      permissions,
      addedAt: new Date(),
      addedBy: user.id,
      isActive: true
    };

    try {
      const response = await fetch(`/api/shared-dashboards/${shareId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(collaborator)
      });

      if (!response.ok) {
        throw new Error('Failed to add collaborator');
      }

      const savedCollaborator = await response.json();
      
      // Update local dashboard
      const dashboard = this.sharedDashboards.get(shareId);
      if (dashboard) {
        dashboard.collaborators.push(savedCollaborator);
      }

      return savedCollaborator;
    } catch (error) {
      console.error('Failed to add collaborator:', error);
      throw error;
    }
  }

  // Remove collaborator from shared dashboard
  async removeCollaborator(shareId: string, collaboratorId: string): Promise<void> {
    try {
      const response = await fetch(`/api/shared-dashboards/${shareId}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove collaborator');
      }

      // Update local dashboard
      const dashboard = this.sharedDashboards.get(shareId);
      if (dashboard) {
        dashboard.collaborators = dashboard.collaborators.filter(c => c.id !== collaboratorId);
      }
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      throw error;
    }
  }

  // Export dashboard
  async exportDashboard(
    dashboardId: string,
    options: DashboardExportOptions
  ): Promise<Blob> {
    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error('Failed to export dashboard');
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      throw error;
    }
  }

  // Generate share link
  generateShareLink(shareId: string, permissions: SharePermissions): ShareLink {
    const token = this.generateShareToken();
    const url = `${window.location.origin}/shared/${shareId}?token=${token}`;

    const shareLink: ShareLink = {
      id: this.generateLinkId(),
      url,
      token,
      permissions,
      createdAt: new Date(),
      accessCount: 0,
      isActive: true
    };

    this.shareLinks.set(shareLink.id, shareLink);

    return shareLink;
  }

  // Get share links
  getShareLinks(shareId: string): ShareLink[] {
    return Array.from(this.shareLinks.values()).filter(link => 
      link.url.includes(shareId)
    );
  }

  // Revoke share link
  revokeShareLink(linkId: string): void {
    const link = this.shareLinks.get(linkId);
    if (link) {
      link.isActive = false;
      this.shareLinks.set(linkId, link);
    }
  }

  // Download dashboard as file
  async downloadDashboard(
    dashboardId: string,
    options: DashboardExportOptions
  ): Promise<void> {
    try {
      const blob = await this.exportDashboard(dashboardId, options);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard_${new Date().toISOString().split('T')[0]}.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download dashboard:', error);
      throw error;
    }
  }

  // Get embed code for dashboard
  getEmbedCode(shareId: string, token?: string): string {
    const baseUrl = window.location.origin;
    const embedUrl = token 
      ? `${baseUrl}/shared/${shareId}?token=${token}&embed=true`
      : `${baseUrl}/shared/${shareId}?embed=true`;
    
    return `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  }

  // Private helper methods
  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateShareToken(): string {
    return btoa(`${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  private generateCollaboratorId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLinkId(): string {
    return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentDashboardLayout(): any {
    // Mock implementation - in real app would get from dashboard state
    return {
      columns: 3,
      rows: 4,
      grid: []
    };
  }

  private getCurrentDashboardFilters(): Record<string, any> {
    // Mock implementation - in real app would get from dashboard state
    return {};
  }

  private getCurrentTimeRange(): string {
    // Mock implementation - in real app would get from dashboard state
    return '7d';
  }

  private getCurrentWidgets(): any[] {
    // Mock implementation - in real app would get from dashboard state
    return [];
  }

  private async updateAccessCount(shareId: string): Promise<void> {
    try {
      await fetch(`/api/shared-dashboards/${shareId}/access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
    } catch (error) {
      console.error('Failed to update access count:', error);
    }
  }
}

export const dashboardSharingService = new DashboardSharingService();
export default DashboardSharingService;
