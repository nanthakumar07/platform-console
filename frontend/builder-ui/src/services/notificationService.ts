import { type Notification, NotificationAction } from '../types/collaboration';
import { authService } from './auth';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: string[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

class NotificationService {
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences = {
    email: true,
    push: true,
    inApp: true,
    types: ['mention', 'comment', 'share', 'update', 'delete', 'system'],
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    frequency: 'immediate'
  };
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.loadPreferences();
    this.initializeWebSocket();
    this.requestNotificationPermission();
  }

  // Initialize WebSocket for real-time notifications
  private initializeWebSocket(): void {
    const token = authService.getToken();
    if (!token) {
      return;
    }
    const wsUrl = `ws://localhost:5003/ws/team-activity?token=${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Notifications WebSocket connected');
        this.reconnectAttempts = 0;
        this.sendHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = () => {
        console.log('Notifications WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Notifications WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize notifications WebSocket:', error);
      // Fallback to polling
      this.startPolling();
    }
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'notification':
          this.handleNewNotification(message.data);
          break;
        case 'notification_read':
          this.handleNotificationRead(message.data);
          break;
        case 'preferences_updated':
          this.preferences = message.data;
          break;
        case 'heartbeat':
          this.sendHeartbeat();
          break;
      }
    } catch (error) {
      console.error('Failed to parse notification WebSocket message:', error);
    }
  }

  // Handle new notification
  private handleNewNotification(notification: Notification): void {
    // Check if user wants this type of notification
    if (!this.preferences.types.includes(notification.type)) {
      return;
    }

    // Check quiet hours
    if (this.isQuietHours() && notification.metadata.priority !== 'urgent') {
      return;
    }

    // Add to notifications list
    this.notifications.unshift(notification);
    
    // Keep only last 1000 notifications in memory
    if (this.notifications.length > 1000) {
      this.notifications = this.notifications.slice(0, 1000);
    }

    // Show in-app notification
    if (this.preferences.inApp) {
      this.showInAppNotification(notification);
    }

    // Show browser notification
    if (this.preferences.push && this.hasNotificationPermission()) {
      this.showBrowserNotification(notification);
    }

    // Send email notification (handled by backend)
    if (this.preferences.email) {
      this.scheduleEmailNotification(notification);
    }

    // Emit custom event for UI updates
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
  }

  // Handle notification read
  private handleNotificationRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.metadata.read = true;
      notification.metadata.readAt = new Date();
    }

    // Emit custom event for UI updates
    window.dispatchEvent(new CustomEvent('notificationRead', { detail: notificationId }));
  }

  // Send heartbeat to keep connection alive
  private sendHeartbeat(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  // Attempt to reconnect WebSocket
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.startPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect notifications (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initializeWebSocket();
    }, delay);
  }

  // Start polling as fallback
  private startPolling(): void {
    setInterval(() => {
      this.fetchUnreadNotifications();
    }, 30000); // Poll every 30 seconds
  }

  // Request browser notification permission
  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // Check if we have notification permission
  private hasNotificationPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // Check if current time is within quiet hours
  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.preferences.quietHours;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  // Show in-app notification
  private showInAppNotification(notification: Notification): void {
    // This would integrate with a toast/notification component
    console.log('In-app notification:', notification);
    
    const priorityClass =
      notification.metadata.priority === 'urgent' ? 'bg-red-500' :
      notification.metadata.priority === 'high' ? 'bg-orange-500' :
      notification.metadata.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500';

    // Create a simple notification element for demo without innerHTML interpolation.
    const notificationElement = document.createElement('div');
    notificationElement.className = 'fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm';

    const container = document.createElement('div');
    container.className = 'flex items-start space-x-3';

    const dotContainer = document.createElement('div');
    dotContainer.className = 'flex-shrink-0';
    const dot = document.createElement('div');
    dot.className = `w-2 h-2 rounded-full ${priorityClass}`;
    dotContainer.appendChild(dot);

    const content = document.createElement('div');
    content.className = 'flex-1';

    const title = document.createElement('p');
    title.className = 'text-sm font-medium text-gray-900';
    title.textContent = notification.title;

    const message = document.createElement('p');
    message.className = 'text-sm text-gray-600 mt-1';
    message.textContent = notification.message;

    content.appendChild(title);
    content.appendChild(message);

    if (notification.actions?.length) {
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'mt-2 flex gap-2 flex-wrap';

      notification.actions.forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `px-3 py-1 text-xs font-medium rounded ${
          action.style === 'primary' ? 'bg-blue-600 text-white' :
          action.style === 'danger' ? 'bg-red-600 text-white' :
          'bg-gray-200 text-gray-800'
        }`;
        button.textContent = action.label;
        button.addEventListener('click', () => {
          if (!action.url) return;
          try {
            const safeUrl = new URL(action.url, window.location.origin);
            if (safeUrl.origin === window.location.origin) {
              window.location.href = safeUrl.toString();
            }
          } catch {
            // Ignore invalid URLs
          }
        });
        actionsWrap.appendChild(button);
      });

      content.appendChild(actionsWrap);
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'text-gray-400 hover:text-gray-600';
    closeButton.textContent = 'x';
    closeButton.addEventListener('click', () => notificationElement.remove());

    container.appendChild(dotContainer);
    container.appendChild(content);
    container.appendChild(closeButton);
    notificationElement.appendChild(container);
    
    document.body.appendChild(notificationElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notificationElement.parentElement) {
        notificationElement.remove();
      }
    }, 5000);
  }

  // Show browser notification
  private showBrowserNotification(notification: Notification): void {
    if (!this.hasNotificationPermission()) return;

    const browserNotification = new (window as any).Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.metadata.priority === 'urgent'
    });

    browserNotification.onclick = () => {
      if (notification.metadata.actionUrl) {
        window.location.href = notification.metadata.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-close after 5 seconds for non-urgent notifications
    if (notification.metadata.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  // Schedule email notification (handled by backend)
  private scheduleEmailNotification(notification: Notification): void {
    // In a real implementation, this would call the backend to send email
    console.log('Email notification scheduled:', notification);
  }

  // Create notification
  createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    metadata: Partial<Notification['metadata']> = {},
    sender?: Notification['sender'],
    actions?: NotificationAction[]
  ): Notification {
    const user = authService.getUser();
    if (!user) throw new Error('User not authenticated');

    const notification: Notification = {
      id: this.generateNotificationId(),
      userId,
      type,
      title,
      message,
      metadata: {
        timestamp: new Date(),
        tenantId: user.tenantId || 'default',
        read: false,
        priority: this.determinePriority(type),
        category: this.determineCategory(type),
        ...metadata
      },
      sender,
      actions
    };

    // Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    } else {
      // Fallback to API
      this.sendNotificationToAPI(notification);
    }

    // Add to local notifications
    this.handleNewNotification(notification);

    return notification;
  }

  // Get notifications for user
  getNotifications(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      type?: string;
      read?: boolean;
      category?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Notification[] {
    let filtered = [...this.notifications];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(n => n.type === filters.type);
      }
      if (filters.read !== undefined) {
        filtered = filtered.filter(n => n.metadata.read === filters.read);
      }
      if (filters.category) {
        filtered = filtered.filter(n => n.metadata.category === filters.category);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter(n => n.metadata.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(n => n.metadata.timestamp <= filters.dateTo!);
      }
    }

    return filtered.slice(offset, offset + limit);
  }

  // Get unread notifications count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.metadata.read).length;
  }

  // Mark notification as read
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.metadata.read) {
      notification.metadata.read = true;
      notification.metadata.readAt = new Date();

      // Send via WebSocket if available
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'notification_read',
          data: notificationId
        }));
      } else {
        // Fallback to API
        this.markNotificationReadInAPI(notificationId);
      }
    }
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.metadata.read);
    
    unreadNotifications.forEach(notification => {
      notification.metadata.read = true;
      notification.metadata.readAt = new Date();
    });

    // Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_all_read',
        data: unreadNotifications.map(n => n.id)
      }));
    } else {
      // Fallback to API
        this.markAllNotificationsReadInAPI();
    }
  }

  // Update notification preferences
  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();

    // Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'preferences_update',
        data: this.preferences
      }));
    } else {
      // Fallback to API
      this.updatePreferencesInAPI(this.preferences);
    }
  }

  // Get notification preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Private helper methods
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determinePriority(type: Notification['type']): Notification['metadata']['priority'] {
    switch (type) {
      case 'system':
      case 'deadline':
      case 'approval':
        return 'high';
      case 'mention':
      case 'share':
        return 'medium';
      default:
        return 'low';
    }
  }

  private determineCategory(type: Notification['type']): Notification['metadata']['category'] {
    switch (type) {
      case 'mention':
      case 'comment':
      case 'share':
        return 'collaboration';
      case 'update':
      case 'delete':
        return 'activity';
      case 'system':
      case 'deadline':
      case 'approval':
        return 'system';
      default:
        return 'activity';
    }
  }

  private async sendNotificationToAPI(notification: Notification): Promise<void> {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Failed to send notification to API:', error);
    }
  }

  private async markNotificationReadInAPI(notificationId: string): Promise<void> {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  private async markAllNotificationsReadInAPI(): Promise<void> {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  private async updatePreferencesInAPI(preferences: NotificationPreferences): Promise<void> {
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(preferences)
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  private async fetchUnreadNotifications(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unread', {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (response.ok) {
        const notifications = await response.json();
        notifications.forEach((notification: Notification) => {
          this.handleNewNotification(notification);
        });
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications:', error);
    }
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('notificationPreferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  // Cleanup
  cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const notificationService = new NotificationService();
export default NotificationService;
