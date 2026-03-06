import { Server } from 'ws';
import { IncomingMessage } from 'http';

export class WebSocketManager {
  private wss: Server | null = null;
  private clients: Set<any> = new Set();

  constructor(private server: any) {}

  initialize() {
    // Create WebSocket server
    this.wss = new Server({ 
      server: this.server.server,
      path: '/ws/team-activity'
    });

    this.wss.on('connection', (ws: any, _req: IncomingMessage) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        data: { message: 'Connected to WebSocket server' },
        timestamp: new Date()
      }));

      // Handle messages
      ws.on('message', (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error: any) {
          console.error('Invalid message format:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log('WebSocket server initialized on /ws path');
  }

  private handleMessage(ws: any, message: any) {
    const { type, data } = message;

    switch (type) {
      case 'heartbeat':
        ws.send(JSON.stringify({
          type: 'heartbeat',
          data: null,
          timestamp: new Date()
        }));
        break;
      
      case 'subscribe':
        // Handle subscription to specific channels
        console.log('Client subscribed to:', data);
        break;
      
      default:
        console.log('Unknown message type:', type);
    }
  }

  broadcast(type: string, data: any) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date()
    });

    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  broadcastActivity(activity: any) {
    this.broadcast('activity', activity);
  }

  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
