import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Logger } from '../utils/logger';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
}

export interface Subscription {
  userId: string;
  type: string;
  id: string;
  tenantId: string;
  filters?: any;
  socketId: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('WebSocketService');
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.logger.info('WebSocket server initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info('Client connected', { socketId: socket.id });

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token, userId, tenantId } = data;
          
          // Verify token and extract user info
          const user = await this.verifyToken(token);
          
          if (user && user.id === userId && user.tenantId === tenantId) {
            socket.userId = userId;
            socket.tenantId = tenantId;
            socket.authenticated = true;
            
            socket.emit('authenticated', { success: true });
            this.logger.info('User authenticated via WebSocket', { userId, tenantId, socketId: socket.id });
          } else {
            socket.emit('authentication_error', { error: 'Invalid credentials' });
            socket.disconnect();
          }
        } catch (error) {
          this.logger.error('WebSocket authentication failed', { error, socketId: socket.id });
          socket.emit('authentication_error', { error: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle subscription requests
      socket.on('subscribe', (data) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        this.handleSubscription(socket, data);
      });

      // Handle unsubscription requests
      socket.on('unsubscribe', (data) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        this.handleUnsubscription(socket, data);
      });

      // Handle dashboard events
      socket.on('dashboard_event', (data) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        this.handleDashboardEvent(socket, data);
      });

      // Handle collaboration events
      socket.on('collaboration_event', (data) => {
        if (!socket.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        this.handleCollaborationEvent(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error('WebSocket error', { error, socketId: socket.id });
      });
    });
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(socket: any, data: any): void {
    const { type, id, filters } = data;
    const subscription: Subscription = {
      userId: socket.userId,
      type,
      id,
      tenantId: socket.tenantId,
      filters,
      socketId: socket.id
    };

    const subscriptionKey = this.getSubscriptionKey(socket.tenantId, type, id);
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, []);
    }

    this.subscriptions.get(subscriptionKey)!.push(subscription);

    socket.emit('subscribed', { type, id, message: 'Successfully subscribed' });
    
    this.logger.info('User subscribed', {
      userId: socket.userId,
      tenantId: socket.tenantId,
      type,
      id,
      socketId: socket.id
    });
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(socket: any, data: any): void {
    const { type, id } = data;
    const subscriptionKey = this.getSubscriptionKey(socket.tenantId, type, id);
    
    const subscriptions = this.subscriptions.get(subscriptionKey);
    if (subscriptions) {
      const filteredSubscriptions = subscriptions.filter(
        sub => sub.socketId !== socket.id
      );
      
      if (filteredSubscriptions.length === 0) {
        this.subscriptions.delete(subscriptionKey);
      } else {
        this.subscriptions.set(subscriptionKey, filteredSubscriptions);
      }
    }

    socket.emit('unsubscribed', { type, id, message: 'Successfully unsubscribed' });
    
    this.logger.info('User unsubscribed', {
      userId: socket.userId,
      tenantId: socket.tenantId,
      type,
      id,
      socketId: socket.id
    });
  }

  /**
   * Handle dashboard events
   */
  private handleDashboardEvent(socket: any, data: any): void {
    const { eventType, dashboardId, eventData } = data;
    
    // Broadcast to other users subscribed to the same dashboard
    this.broadcastToDashboard(socket.tenantId, dashboardId, {
      type: 'dashboard_event',
      data: {
        eventType,
        dashboardId,
        eventData,
        userId: socket.userId,
        timestamp: new Date()
      }
    }, socket.id);

    this.logger.info('Dashboard event broadcasted', {
      userId: socket.userId,
      tenantId: socket.tenantId,
      dashboardId,
      eventType
    });
  }

  /**
   * Handle collaboration events
   */
  private handleCollaborationEvent(socket: any, data: any): void {
    const { eventType, sessionId, eventData } = data;
    
    // Broadcast to collaboration session participants
    this.broadcastToSession(socket.tenantId, sessionId, {
      type: 'collaboration_event',
      data: {
        eventType,
        sessionId,
        eventData,
        userId: socket.userId,
        timestamp: new Date()
      }
    }, socket.id);

    this.logger.info('Collaboration event broadcasted', {
      userId: socket.userId,
      tenantId: socket.tenantId,
      sessionId,
      eventType
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: any): void {
    // Remove all subscriptions for this socket
    for (const [key, subscriptions] of this.subscriptions.entries()) {
      const filteredSubscriptions = subscriptions.filter(
        sub => sub.socketId !== socket.id
      );
      
      if (filteredSubscriptions.length === 0) {
        this.subscriptions.delete(key);
      } else {
        this.subscriptions.set(key, filteredSubscriptions);
      }
    }

    this.logger.info('Client disconnected', {
      userId: socket.userId,
      tenantId: socket.tenantId,
      socketId: socket.id
    });
  }

  /**
   * Broadcast message to all users in a tenant
   */
  broadcastToTenant(tenantId: string, message: WebSocketMessage): void {
    const sockets = Array.from(this.io.sockets.sockets.values())
      .filter((socket: any) => socket.tenantId === tenantId && socket.authenticated);

    sockets.forEach((socket: any) => {
      socket.emit('message', message);
    });

    this.logger.debug('Broadcasted to tenant', {
      tenantId,
      messageType: message.type,
      recipientCount: sockets.length
    });
  }

  /**
   * Broadcast message to dashboard subscribers
   */
  broadcastToDashboard(tenantId: string, dashboardId: string, message: WebSocketMessage, excludeSocketId?: string): void {
    const subscriptionKey = this.getSubscriptionKey(tenantId, 'dashboard', dashboardId);
    const subscriptions = this.subscriptions.get(subscriptionKey) || [];

    subscriptions.forEach(subscription => {
      if (subscription.socketId !== excludeSocketId) {
        const socket = this.io.sockets.sockets.get(subscription.socketId);
        if (socket) {
          socket.emit('message', message);
        }
      }
    });

    this.logger.debug('Broadcasted to dashboard', {
      tenantId,
      dashboardId,
      messageType: message.type,
      recipientCount: subscriptions.length - (excludeSocketId ? 1 : 0)
    });
  }

  /**
   * Broadcast message to collaboration session
   */
  broadcastToSession(tenantId: string, sessionId: string, message: WebSocketMessage, excludeSocketId?: string): void {
    const subscriptionKey = this.getSubscriptionKey(tenantId, 'session', sessionId);
    const subscriptions = this.subscriptions.get(subscriptionKey) || [];

    subscriptions.forEach(subscription => {
      if (subscription.socketId !== excludeSocketId) {
        const socket = this.io.sockets.sockets.get(subscription.socketId);
        if (socket) {
          socket.emit('message', message);
        }
      }
    });

    this.logger.debug('Broadcasted to session', {
      tenantId,
      sessionId,
      messageType: message.type,
      recipientCount: subscriptions.length - (excludeSocketId ? 1 : 0)
    });
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    const sockets = Array.from(this.io.sockets.sockets.values())
      .filter((socket: any) => socket.userId === userId && socket.authenticated);

    sockets.forEach((socket: any) => {
      socket.emit('message', message);
    });

    this.logger.debug('Sent to user', {
      userId,
      messageType: message.type,
      recipientCount: sockets.length
    });
  }

  /**
   * Add subscription programmatically
   */
  addSubscription(userId: string, subscription: Omit<Subscription, 'userId' | 'socketId'>): void {
    const userSockets = Array.from(this.io.sockets.sockets.values())
      .filter((socket: any) => socket.userId === userId && socket.authenticated);

    userSockets.forEach((socket: any) => {
      const fullSubscription: Subscription = {
        ...subscription,
        userId,
        socketId: socket.id
      };

      const subscriptionKey = this.getSubscriptionKey(subscription.tenantId, subscription.type, subscription.id);
      
      if (!this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.set(subscriptionKey, []);
      }

      this.subscriptions.get(subscriptionKey)!.push(fullSubscription);
    });
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): any {
    const stats = {
      totalConnections: 0,
      totalSubscriptions: 0,
      subscriptionsByType: {} as Record<string, number>,
      subscriptionsByTenant: {} as Record<string, number>
    };

    // Count connections
    for (const socket of this.io.sockets.sockets.values()) {
      if ((socket as any).authenticated) {
        stats.totalConnections++;
      }
    }

    // Count subscriptions
    for (const [key, subscriptions] of this.subscriptions.entries()) {
      stats.totalSubscriptions += subscriptions.length;
      
      const [, type, tenantId] = key.split(':');
      stats.subscriptionsByType[type] = (stats.subscriptionsByType[type] || 0) + subscriptions.length;
      stats.subscriptionsByTenant[tenantId] = (stats.subscriptionsByTenant[tenantId] || 0) + subscriptions.length;
    }

    return stats;
  }

  /**
   * Helper method to generate subscription key
   */
  private getSubscriptionKey(tenantId: string, type: string, id: string): string {
    return `${tenantId}:${type}:${id}`;
  }

  /**
   * Verify JWT token (placeholder implementation)
   */
  private async verifyToken(token: string): Promise<any> {
    // In a real implementation, this would verify the JWT token
    // and return the user information
    try {
      // Mock verification for now
      return { id: 'user123', tenantId: 'tenant123', email: 'user@example.com' };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
