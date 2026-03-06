import React, { useEffect, useRef, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketConfig {
  url: string;
  token?: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Map<string, (data: any) => void> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = this.config.token 
        ? `${this.config.url}?token=${this.config.token}`
        : this.config.url;

      this.ws = new WebSocket(wsUrl, this.config.protocols);

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Send queued messages
      this.flushMessageQueue();

      // Authenticate if token provided
      if (this.config.token) {
        this.send({
          type: 'authenticate',
          data: { token: this.config.token },
          timestamp: new Date()
        });
      }

      this.config.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      this.ws = null;

      this.config.onDisconnect?.();

      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.config.onError?.(error);
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle subscription messages
    if (message.type === 'subscription_update' && message.data.subscriptionId) {
      const callback = this.subscriptions.get(message.data.subscriptionId);
      if (callback) {
        callback(message.data);
      }
    }

    // Handle global message handler
    this.config.onMessage?.(message);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = (this.config.reconnectInterval || 5000) * Math.pow(2, this.reconnectAttempts);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  subscribe(type: string, callback: (data: any) => void): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(subscriptionId, callback);
    
    // Send subscription message to server
    this.send({
      type: 'subscribe',
      data: {
        subscriptionId,
        type,
        timestamp: new Date()
      },
      timestamp: new Date()
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    
    // Send unsubscribe message to server
    this.send({
      type: 'unsubscribe',
      data: {
        subscriptionId,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.subscriptions.clear();
    this.messageQueue.length = 0;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// React Hook for WebSocket
export const useWebSocket = (config: WebSocketConfig) => {
  const wsRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);

  useEffect(() => {
    // Create WebSocket client
    wsRef.current = new WebSocketClient({
      ...config,
      onConnect: () => {
        setIsConnected(true);
        setConnectionState('connected');
        setError(null);
        config.onConnect?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
        setConnectionState('disconnected');
        config.onDisconnect?.();
      },
      onMessage: (message) => {
        setLastMessage(message);
        config.onMessage?.(message);
      },
      onError: (errorEvent) => {
        setError(errorEvent);
        setConnectionState('error');
        config.onError?.(errorEvent);
      },
    });

    // Connect to WebSocket
    wsRef.current.connect();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [config.url, config.token]);

  const sendMessage = React.useCallback((message: WebSocketMessage) => {
    if (wsRef.current) {
      wsRef.current.send(message);
    }
  }, []);

  const subscribe = React.useCallback((type: string, callback: (data: any) => void) => {
    if (wsRef.current) {
      return wsRef.current.subscribe(type, callback);
    }
    return '';
  }, []);

  const unsubscribe = React.useCallback((subscriptionId: string) => {
    if (wsRef.current) {
      wsRef.current.unsubscribe(subscriptionId);
    }
  }, []);

  const reconnect = React.useCallback(() => {
    if (wsRef.current) {
      wsRef.current.connect();
    }
  }, []);

  const disconnect = React.useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }
  }, []);

  return {
    isConnected,
    connectionState,
    lastMessage,
    error,
    sendMessage,
    subscribe,
    unsubscribe,
    reconnect,
    disconnect,
  };
};

// Hook for dashboard-specific WebSocket
export const useDashboardWebSocket = (dashboardId: string, token?: string) => {
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  const ws = useWebSocket({
    url: 'ws://localhost:5003/ws/team-activity',
    token,
    onMessage: (message) => {
      switch (message.type) {
        case 'dashboard_update':
          setRealTimeData(message.data);
          break;
        case 'collaboration_event':
          if (message.data.eventType === 'user_joined') {
            setCollaborators(prev => [...prev, message.data.userData]);
          } else if (message.data.eventType === 'user_left') {
            setCollaborators(prev => prev.filter(user => user.id !== message.data.userData.id));
          }
          break;
        case 'dashboard_activity':
          setActivity(prev => [message.data, ...prev.slice(0, 49)]);
          break;
      }
    },
  });

  useEffect(() => {
    if (ws.isConnected && dashboardId) {
      // Subscribe to dashboard updates
      ws.subscribe('dashboard', (data) => {
        console.log('Dashboard update:', data);
      });

      // Subscribe to collaboration events
      ws.subscribe('collaboration', (data) => {
        console.log('Collaboration event:', data);
      });
    }
  }, [ws.isConnected, dashboardId]);

  const sendDashboardEvent = React.useCallback((eventType: string, eventData: any) => {
    ws.sendMessage({
      type: 'dashboard_event',
      data: {
        eventType,
        dashboardId,
        eventData,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }, [ws, dashboardId]);

  const sendCollaborationEvent = React.useCallback((eventType: string, eventData: any) => {
    ws.sendMessage({
      type: 'collaboration_event',
      data: {
        eventType,
        eventData,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }, [ws]);

  return {
    ...ws,
    realTimeData,
    collaborators,
    activity,
    sendDashboardEvent,
    sendCollaborationEvent,
  };
};

export default WebSocketClient;
