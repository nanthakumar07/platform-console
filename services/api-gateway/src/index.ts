import "reflect-metadata";
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import { AuthMiddleware } from './middleware/auth';
import { RateLimitMiddleware } from './middleware/rateLimit';
import { MetadataService } from './services/MetadataService';
import { ServiceConfig } from './types';
import crypto from 'crypto';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

// Configuration
const config: ServiceConfig = {
  metadataService: process.env.METADATA_SERVICE_URL || 'http://localhost:3001',
  authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  dalService: process.env.DAL_SERVICE_URL || 'http://localhost:3003',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  },
};

// Initialize services
const authMiddleware = new AuthMiddleware(
  requireEnv('JWT_SECRET'),
  config.authService
);

const rateLimitMiddleware = new RateLimitMiddleware(
  `redis://${config.redis.host}:${config.redis.port}${config.redis.password ? `:${config.redis.password}` : ''}`
);

const metadataService = new MetadataService(config);

// Register plugins
// server.register(cors, {
//   origin: (origin, cb) => {
//     // TODO: Check against tenant's allowed origins
//     const allowedOrigins = [
//       'http://localhost:3000',
//       'http://localhost:3100',
//       'http://localhost:3101',
//     ];
    
//     if (!origin || allowedOrigins.includes(origin)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Not allowed'), false);
//     }
//   },
//   credentials: true,
// });

server.register(cors, {
  origin: async (origin) => {
    if (!origin) return true; // allow server-to-server
    
    // ✅ Per-tenant origin validation
    // Extract tenantId from subdomain or default to checking known origins
    const defaultAllowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3100,http://localhost:3101,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179').split(',');
    if (defaultAllowed.includes(origin)) return true;
    
    // For tenant subdomains, validate against tenant's registered origins
    // This replaces the TODO comment
    try {
      const tenantOrigins = await metadataService.getAllowedOrigins(origin);
      return tenantOrigins;
    } catch {
      return false;
    }
  },
  credentials: true,
});

server.register(helmet, {
  contentSecurityPolicy: false,
});

// Register WebSocket plugin
server.register(websocket);

// Global middleware
server.addHook('preHandler', authMiddleware.createAuthMiddleware);
server.addHook('preHandler', rateLimitMiddleware.createRateLimitMiddleware());

// Request logging middleware
server.addHook('preHandler', async (request, reply) => {
  const context = (request as any).context;
  if (context) {
    request.log.info({
      requestId: context.requestId,
      userId: context.user?.sub,
      tenantId: context.tenant?.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }, 'Request started');
  }
});

server.addHook('onResponse', async (request, reply) => {
  const context = (request as any).context;
  if (context) {
    const duration = Date.now() - context.startTime;
    
    request.log.info({
      requestId: context.requestId,
      userId: context.user?.sub,
      tenantId: context.tenant?.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
    }, 'Request completed');

    // TODO: Store metrics in Prometheus/TimeSeries DB
  }
});

// Health check endpoint
server.get('/health', async (request, reply) => {
  const checks = {
    gateway: true,
    metadata: await metadataService.healthCheck(),
    redis: await checkRedisHealth(),
  };

  const isHealthy = Object.values(checks).every(Boolean);
  
  return reply
    .status(isHealthy ? 200 : 503)
    .send({
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    });
});

// Auth endpoints - proxy to auth service
server.post('/auth/login', async (request, reply) => {
  try {
    const response = await fetch(`${config.authService}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return reply.status(response.status).send(data);
    }
    
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/auth/register', async (request, reply) => {
  try {
    const response = await fetch(`${config.authService}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return reply.status(response.status).send(data);
    }
    
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/auth/refresh', async (request, reply) => {
  try {
    const response = await fetch(`${config.authService}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return reply.status(response.status).send(data);
    }
    
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/auth/logout', async (request, reply) => {
  try {
    const response = await fetch(`${config.authService}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.authorization || '',
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return reply.status(response.status).send(data);
    }
    
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Dashboard endpoints
server.get('/api/v1/dashboard/:tenantId', async (request, reply) => {
  try {
    const { tenantId } = request.params as { tenantId: string };
    const context = (request as any).context;
    
    // Mock dashboard data for now
    const dashboardData = {
      id: 'dashboard1',
      name: 'Main Dashboard',
      description: 'Primary analytics dashboard',
      widgets: [
        {
          id: 'widget1',
          type: 'chart',
          title: 'Revenue Trend',
          data: [100, 150, 200, 175, 250],
          position: { x: 0, y: 0, w: 6, h: 4 }
        },
        {
          id: 'widget2',
          type: 'metric',
          title: 'Total Users',
          value: 1250,
          position: { x: 6, y: 0, w: 3, h: 2 }
        }
      ],
      layout: {
        cols: 12,
        rows: 8
      },
      lastUpdated: new Date().toISOString()
    };
    
    return reply.send({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Team activity endpoints
server.get('/api/v1/team-activity/:tenantId/members', async (request, reply) => {
  try {
    const { tenantId } = request.params as { tenantId: string };
    const context = (request as any).context;
    
    // Mock team members response
    const teamMembers = [
      {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        status: 'online',
        lastActivity: new Date().toISOString(),
        avatar: null
      },
      {
        id: 'user2', 
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'developer',
        status: 'offline',
        lastActivity: new Date(Date.now() - 3600000).toISOString(),
        avatar: null
      },
      {
        id: 'user3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        role: 'analyst',
        status: 'online',
        lastActivity: new Date(Date.now() - 1800000).toISOString(),
        avatar: null
      }
    ];
    
    return reply.send({
      success: true,
      data: teamMembers,
      total: teamMembers.length
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.get('/api/v1/team-activity/:tenantId/feed', async (request, reply) => {
  try {
    const { tenantId } = request.params as { tenantId: string };
    const query = request.query as any;
    const context = (request as any).context;
    
    // Mock activity feed
    const activities = [
      {
        id: 'activity1',
        userId: 'user1',
        userName: 'John Doe',
        action: 'dashboard_view',
        resourceType: 'dashboard',
        resourceName: 'Sales Dashboard',
        timestamp: new Date().toISOString(),
        metadata: {
          duration: 45000,
          widgetsViewed: 5
        }
      },
      {
        id: 'activity2',
        userId: 'user2',
        userName: 'Jane Smith',
        action: 'widget_update',
        resourceType: 'widget',
        resourceName: 'Revenue Chart',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        metadata: {
          chartType: 'line',
          dateRange: '30d'
        }
      }
    ];
    
    return reply.send({
      success: true,
      data: activities,
      total: activities.length,
      pagination: {
        page: parseInt(query.page) || 1,
        limit: parseInt(query.limit) || 20,
        totalPages: 1
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Statistics endpoints
// server.get('/api/v1/statistics/:tenantId/enhanced', async (request, reply) => {
//   try {
//     const { tenantId } = request.params as { tenantId: string };
//     const context = (request as any).context;
    
//     // Mock enhanced statistics matching frontend interface
//     const enhancedStats = {
//       growthTrends: Array.from({ length: 30 }, (_, i) => {
//         const date = new Date();
//         date.setDate(date.getDate() - (29 - i));
//         return {
//           date: date.toISOString().split('T')[0],
//           objects: Math.max(1, Math.floor(12 - i * 0.2 + Math.random() * 2)),
//           fields: Math.max(5, Math.floor(45 - i * 0.8 + Math.random() * 5)),
//           relations: Math.max(1, Math.floor(8 - i * 0.1 + Math.random() * 2))
//         };
//       }),
//       usageAnalytics: {
//         mostPopularObjects: [
//           { objectId: '1', objectName: 'Customer', fieldCount: 12, relationCount: 3, usageScore: 95 },
//           { objectId: '2', objectName: 'Order', fieldCount: 8, relationCount: 2, usageScore: 87 },
//           { objectId: '3', objectName: 'Product', fieldCount: 6, relationCount: 1, usageScore: 72 },
//           { objectId: '4', objectName: 'Invoice', fieldCount: 10, relationCount: 2, usageScore: 68 }
//         ],
//         fieldTypesDistribution: [
//           { type: 'TEXT', count: 18, percentage: 40.0 },
//           { type: 'NUMBER', count: 8, percentage: 17.8 },
//           { type: 'DATE', count: 6, percentage: 13.3 },
//           { type: 'BOOLEAN', count: 5, percentage: 11.1 },
//           { type: 'EMAIL', count: 4, percentage: 8.9 },
//           { type: 'PICKLIST', count: 4, percentage: 8.9 }
//         ],
//         relationTypesDistribution: [
//           { type: 'LOOKUP', count: 5, percentage: 62.5 },
//           { type: 'MASTER_DETAIL', count: 2, percentage: 25.0 },
//           { type: 'M2M', count: 1, percentage: 12.5 }
//         ]
//       },
//       storageMetrics: {
//         totalObjects: 12,
//         totalFields: 45,
//         totalRelations: 8,
//         estimatedStorageUsage: {
//           objects: 30, // KB
//           fields: 36, // KB
//           relations: 10, // KB
//           total: 76 // KB
//         },
//         averageFieldsPerObject: 3.8,
//         averageRelationsPerObject: 0.7
//       },
//       performanceIndicators: {
//         apiResponseTimes: [
//           { endpoint: 'GET /objects', avgResponseTime: 145, requestCount: 1250, errorRate: 0.8 },
//           { endpoint: 'GET /fields', avgResponseTime: 89, requestCount: 890, errorRate: 0.4 },
//           { endpoint: 'POST /objects', avgResponseTime: 234, requestCount: 156, errorRate: 2.1 },
//           { endpoint: 'PUT /objects', avgResponseTime: 198, requestCount: 234, errorRate: 1.2 }
//         ],
//         systemHealth: {
//           overall: 'good',
//           metadata: 'excellent',
//           database: 'good',
//           api: 'good'
//         },
//         recentPerformance: Array.from({ length: 24 }, (_, i) => ({
//           timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
//           responseTime: 120 + Math.random() * 80,
//           requestCount: Math.floor(50 + Math.random() * 100)
//         }))
//       },
//       summary: {
//         totalObjects: 12,
//         totalFields: 45,
//         totalRelations: 8,
//         growthRate: {
//           objects: 15.5,
//           fields: 22.3,
//           relations: 8.7
//         }
//       }
//     };
    
//     return reply.send({
//       success: true,
//       data: enhancedStats
//     });
//   } catch (error) {
//     request.log.error(error);
//     return reply.status(500).send({
//       error: 'Internal Server Error',
//       message: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// Replace /api/v1/statistics/:tenantId/enhanced with real data:
server.get('/api/v1/statistics/:tenantId/enhanced', async (request, reply) => {
  const { tenantId } = request.params as { tenantId: string };
  try {
    // Parallel fetch from metadata service and DAL
    const [objects, fields, relations] = await Promise.all([
      metadataService.getObjects(tenantId),
      metadataService.getFields(tenantId),
      metadataService.getRelations(tenantId),
    ]);

    const fieldTypeDist = fields.reduce((acc: Record<string, number>, f: any) => {
      acc[f.dataType] = (acc[f.dataType] || 0) + 1;
      return acc;
    }, {});

    return reply.send({
      success: true,
      data: {
        summary: {
          totalObjects: objects.length,
          totalFields: fields.length,
          totalRelations: relations.length,
        },
        usageAnalytics: {
          mostPopularObjects: objects.slice(0, 5).map((o: any) => ({
            objectId: o.id,
            objectName: o.label,
            fieldCount: fields.filter((f: any) => f.objectId === o.id).length,
            relationCount: relations.filter((r: any) => r.sourceObjectId === o.id).length,
            usageScore: Math.floor(Math.random() * 40 + 60), // replace with real usage tracking
          })),
          fieldTypesDistribution: Object.entries(fieldTypeDist).map(([type, count]) => ({
            type,
            count,
            percentage: Math.round(((count as number) / fields.length) * 1000) / 10,
          })),
        },
        storageMetrics: {
          totalObjects: objects.length,
          totalFields: fields.length,
          totalRelations: relations.length,
          averageFieldsPerObject: objects.length ? Math.round((fields.length / objects.length) * 10) / 10 : 0,
        },
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch statistics' });
  }
});

// Additional statistics endpoints
server.get('/api/v1/statistics/growth-trends', async (request, reply) => {
  try {
    const query = request.query as any;
    const days = parseInt(query.days) || 30;
    
    const trends = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        objects: Math.max(1, Math.floor(12 - i * 0.2 + Math.random() * 2)),
        fields: Math.max(5, Math.floor(45 - i * 0.8 + Math.random() * 5)),
        relations: Math.max(1, Math.floor(8 - i * 0.1 + Math.random() * 2))
      };
    });
    
    return reply.send(trends);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.get('/api/v1/statistics/usage-analytics', async (request, reply) => {
  try {
    const analytics = {
      mostPopularObjects: [
        { objectId: '1', objectName: 'Customer', fieldCount: 12, relationCount: 3, usageScore: 95 },
        { objectId: '2', objectName: 'Order', fieldCount: 8, relationCount: 2, usageScore: 87 },
        { objectId: '3', objectName: 'Product', fieldCount: 6, relationCount: 1, usageScore: 72 },
        { objectId: '4', objectName: 'Invoice', fieldCount: 10, relationCount: 2, usageScore: 68 }
      ],
      fieldTypesDistribution: [
        { type: 'TEXT', count: 18, percentage: 40.0 },
        { type: 'NUMBER', count: 8, percentage: 17.8 },
        { type: 'DATE', count: 6, percentage: 13.3 },
        { type: 'BOOLEAN', count: 5, percentage: 11.1 },
        { type: 'EMAIL', count: 4, percentage: 8.9 },
        { type: 'PICKLIST', count: 4, percentage: 8.9 }
      ],
      relationTypesDistribution: [
        { type: 'LOOKUP', count: 5, percentage: 62.5 },
        { type: 'MASTER_DETAIL', count: 2, percentage: 25.0 },
        { type: 'M2M', count: 1, percentage: 12.5 }
      ]
    };
    
    return reply.send(analytics);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.get('/api/v1/statistics/storage-metrics', async (request, reply) => {
  try {
    const totalObjects = 12;
    const totalFields = 45;
    const totalRelations = 8;
    
    const metrics = {
      totalObjects,
      totalFields,
      totalRelations,
      estimatedStorageUsage: {
        objects: totalObjects * 2.5, // KB
        fields: totalFields * 0.8, // KB
        relations: totalRelations * 1.2, // KB
        total: totalObjects * 2.5 + totalFields * 0.8 + totalRelations * 1.2
      },
      averageFieldsPerObject: Math.round(totalFields / totalObjects * 10) / 10,
      averageRelationsPerObject: Math.round(totalRelations / totalObjects * 10) / 10
    };
    
    return reply.send(metrics);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.get('/api/v1/statistics/performance', async (request, reply) => {
  try {
    const query = request.query as any;
    
    // Mock performance indicators matching frontend interface
    const performanceIndicators = {
      apiResponseTimes: [
        { endpoint: 'GET /objects', avgResponseTime: 145, requestCount: 1250, errorRate: 0.8 },
        { endpoint: 'GET /fields', avgResponseTime: 89, requestCount: 890, errorRate: 0.4 },
        { endpoint: 'POST /objects', avgResponseTime: 234, requestCount: 156, errorRate: 2.1 },
        { endpoint: 'PUT /objects', avgResponseTime: 198, requestCount: 234, errorRate: 1.2 }
      ],
      systemHealth: {
        overall: 'good',
        metadata: 'excellent',
        database: 'good',
        api: 'good'
      },
      recentPerformance: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        responseTime: 120 + Math.random() * 80,
        requestCount: Math.floor(50 + Math.random() * 100)
      }))
    };
    
    return reply.send(performanceIndicators);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metadata endpoints
server.get('/api/v1/metadata/:tenantId/dashboard-stats', async (request, reply) => {
  try {
    const { tenantId } = request.params as { tenantId: string };
    const context = (request as any).context;
    
    // Mock dashboard stats
    const dashboardStats = {
      totalDashboards: 12,
      activeDashboards: 8,
      totalWidgets: 45,
      totalViews: 1250,
      avgLoadTime: 1.2,
      popularWidgets: [
        { type: 'chart', count: 18 },
        { type: 'metric', count: 15 },
        { type: 'table', count: 8 },
        { type: 'filter', count: 4 }
      ],
      userActivity: {
        dailyActive: 6,
        weeklyActive: 8,
        monthlyActive: 12
      },
      timestamp: new Date().toISOString()
    };
    
    return reply.send({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// WebSocket routes
// server.get('/ws/team-activity', { websocket: true }, (connection, req) => {
//   const url = new URL(req.url, `http://${req.headers.host}`);
//   const token = url.searchParams.get('token');
  
//   // For development, allow anonymous connections
//   if (!token && process.env.NODE_ENV !== 'production') {
//     console.log('Allowing anonymous WebSocket connection (development mode)');
//   } else if (!token) {
//     connection.close(1008, 'Token required');
//     return;
//   }

//   // Verify JWT token (or use mock user for development)
//   const verifyUser = token ? authMiddleware.verifyJWT(token) : Promise.resolve({
//     sub: 'demo-user',
//     email: 'demo@example.com',
//     tenantId: 'demo',
//     roles: ['admin'],
//     permissions: ['read', 'write']
//   });
  
//   verifyUser.then(user => {
//     if (!user) {
//       connection.close(1008, 'Invalid token');
//       return;
//     }

//     // Store connection info
//     const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     (connection as any).connectionId = connectionId;
//     (connection as any).user = user;

//     console.log(`WebSocket connected: ${connectionId} for user ${user.sub}`);

//     // Send welcome message
//     connection.send(JSON.stringify({
//       type: 'connected',
//       data: {
//         connectionId,
//         user: user.sub,
//         timestamp: new Date().toISOString()
//       }
//     }));

//     // Handle incoming messages
//     connection.on('message', (message: Buffer | string) => {
//       try {
//         const data = JSON.parse(message.toString());
        
//         // Broadcast to other connections
//         server.websocketServer.clients.forEach((client: any) => {
//           if (client !== connection && client.readyState === 1) {
//             client.send(JSON.stringify({
//               type: 'team_activity',
//               data: {
//                 ...data,
//                 userId: user.sub,
//                 connectionId,
//                 timestamp: new Date().toISOString()
//               }
//             }));
//           }
//         });
//       } catch (error) {
//         console.error('WebSocket message error:', error);
//       }
//     });

//     // Handle disconnection
//     connection.on('close', () => {
//       console.log(`WebSocket disconnected: ${connectionId}`);
      
//       // Notify other clients
//       server.websocketServer.clients.forEach((client: any) => {
//         if (client !== connection && client.readyState === 1) {
//           client.send(JSON.stringify({
//             type: 'user_disconnected',
//             data: {
//               userId: user.sub,
//               connectionId,
//               timestamp: new Date().toISOString()
//             }
//           }));
//         }
//       });
//     });

//   }).catch(error => {
//     console.error('WebSocket auth error:', error);
//     connection.close(1008, 'Authentication failed');
//   });
// });

server.get('/ws/team-activity', { websocket: true }, (connection, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  // ✅ Token always required — no anonymous bypass
  if (!token) {
    connection.close(1008, 'Token required');
    return;
  }

  authMiddleware.verifyJWT(token).then(user => {
    if (!user) {
      connection.close(1008, 'Invalid token');
      return;
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (connection as any).connectionId = connectionId;
    (connection as any).user = user;

    connection.send(JSON.stringify({
      type: 'connected',
      data: { connectionId, user: user.sub, timestamp: new Date().toISOString() }
    }));

    connection.on('message', (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString());
        server.websocketServer.clients.forEach((client: any) => {
          if (client !== connection && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'team_activity',
              data: { ...data, userId: user.sub, connectionId, timestamp: new Date().toISOString() }
            }));
          }
        });
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    connection.on('close', () => {
      server.websocketServer.clients.forEach((client: any) => {
        if (client !== connection && client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'user_disconnected',
            data: { userId: user.sub, connectionId, timestamp: new Date().toISOString() }
          }));
        }
      });
    });
  }).catch(() => connection.close(1008, 'Authentication failed'));
});

// Dynamic REST routes
server.get('/api/v1/:tenantId/:objectName', async (request, reply) => {
  try {
    const { tenantId, objectName } = request.params as { tenantId: string; objectName: string };
    const query = request.query as any;
    const context = (request as any).context;

    // Get object definition from metadata service
    const objectDefinition = await metadataService.getCachedObjectDefinition(tenantId, objectName);
    
    if (!objectDefinition) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Object ${objectName} not found`
      });
    }

    // Forward request to DAL service
    const dalResponse = await fetch(`${config.dalService}/api/v1/${tenantId}/${objectName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-User-ID': context.user.sub,
        'X-Request-ID': context.requestId,
      },
    });

    const data = await dalResponse.json();
    
    return reply.status(dalResponse.status).send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/api/v1/:tenantId/:objectName', async (request, reply) => {
  try {
    const { tenantId, objectName } = request.params as { tenantId: string; objectName: string };
    const body = request.body as any;
    const context = (request as any).context;

    // Get object definition from metadata service
    const objectDefinition = await metadataService.getCachedObjectDefinition(tenantId, objectName);
    
    if (!objectDefinition) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Object ${objectName} not found`
      });
    }

    // Forward request to DAL service
    const dalResponse = await fetch(`${config.dalService}/api/v1/${tenantId}/${objectName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-User-ID': context.user.sub,
        'X-Request-ID': context.requestId,
      },
      body: JSON.stringify(body),
    });

    const data = await dalResponse.json();
    
    return reply.status(dalResponse.status).send(data);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook HMAC verification helper
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}



server.post('/webhooks/:tenantId/:webhookId', {
  config: { rawBody: true }, // need raw body for HMAC
}, async (request, reply) => {
  const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
  const signature = request.headers['x-webhook-signature'] as string;
  const rawBody = (request as any).rawBody as string;

  if (!signature) {
    return reply.status(401).send({ error: 'Missing webhook signature' });
  }

  // Fetch the webhook secret for this tenant/webhook from metadata service
  const webhookSecret = process.env[`WEBHOOK_SECRET_${tenantId}`] 
    || process.env.WEBHOOK_DEFAULT_SECRET;

  if (!webhookSecret) {
    request.log.warn({ tenantId, webhookId }, 'No webhook secret configured');
    return reply.status(500).send({ error: 'Webhook not configured' });
  }

  const valid = verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    request.log.warn({ tenantId, webhookId }, 'Invalid webhook signature');
    return reply.status(401).send({ error: 'Invalid webhook signature' });
  }

  // ✅ Signature verified — process the event
  const body = request.body as any;
  request.log.info({ tenantId, webhookId }, 'Webhook verified and received');

  // TODO: Forward to workflow engine via NATS
  return reply.status(200).send({ status: 'received' });
});

// // Webhook endpoints
// server.post('/webhooks/:tenantId/:webhookId', async (request, reply) => {
//   try {
//     const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
//     const body = request.body as any;
//     const signature = request.headers['x-webhook-signature'] as string;
//     const context = (request as any).context;

//     // TODO: Verify HMAC signature
//     // TODO: Trigger workflow engine

//     request.log.info({
//       tenantId,
//       webhookId,
//       signature: signature ? 'present' : 'missing',
//       body,
//     }, 'Webhook received');

//     return reply.status(200).send({ status: 'received' });
//   } catch (error) {
//     request.log.error(error);
//     return reply.status(500).send({
//       error: 'Internal Server Error',
//       message: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// OpenAPI spec endpoint
server.get('/api/v1/:tenantId/openapi.json', async (request, reply) => {
  try {
    const { tenantId } = request.params as { tenantId: string };

    // Get all objects for this tenant
    const objects = await metadataService.getObjects(tenantId);
    
    // Generate OpenAPI spec
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: `${tenantId} API`,
        version: '1.0.0',
        description: `Auto-generated API for tenant ${tenantId}`,
      },
      servers: [
        {
          url: `https://${tenantId}.platform.io/api/v1`,
          description: 'Production server',
        },
      ],
      paths: {} as Record<string, any>,
      components: {
        schemas: {},
      },
    };

    // Generate paths for each object
    for (const object of objects) {
      const objectName = object.apiName;
      const pluralName = object.pluralLabel.toLowerCase().replace(/\s+/g, '_');
      
      openApiSpec.paths[`/${pluralName}`] = {
        get: {
          summary: `List ${object.pluralLabel}`,
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            200: {
              description: `List of ${object.pluralLabel}`,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      records: { type: 'array' },
                      pagination: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: `Create ${object.label}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            201: {
              description: `${object.label} created successfully`,
            },
          },
        },
      };

      openApiSpec.paths[`/${pluralName}/{id}`] = {
        get: {
          summary: `Get ${object.label}`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: `${object.label} details`,
            },
            404: {
              description: `${object.label} not found`,
            },
          },
        },
        patch: {
          summary: `Update ${object.label}`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            200: {
              description: `${object.label} updated successfully`,
            },
            404: {
              description: `${object.label} not found`,
            },
          },
        },
        delete: {
          summary: `Delete ${object.label}`,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            204: {
              description: `${object.label} deleted successfully`,
            },
            404: {
              description: `${object.label} not found`,
            },
          },
        },
      };
    }

    return reply.type('application/json').send(openApiSpec);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to check Redis health
async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = rateLimitMiddleware['redis'];
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    server.log.info(`API Gateway listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Received SIGINT, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  server.log.info('Received SIGTERM, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

start();
