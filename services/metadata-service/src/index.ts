import 'reflect-metadata';
import "dotenv/config";
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { initializeDatabase } from './config/database';
import { MetaObjectController } from './controllers/MetaObjectController';
import { MetaFieldController } from './controllers/MetaFieldController';
import { MetaRelationController } from './controllers/MetaRelationController';
import { MetaLayoutController } from './controllers/MetaLayoutController';
import { MetaPageController } from './controllers/MetaPageController';
import { MetaWorkflowController } from './controllers/MetaWorkflowController';
import { DashboardController } from './controllers/DashboardController';
import { WebSocketManager } from './websocket';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
server.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});

server.register(helmet, {
  contentSecurityPolicy: false,
});

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register controllers
const metaObjectController = new MetaObjectController();
const metaFieldController = new MetaFieldController();
const metaRelationController = new MetaRelationController();
const metaLayoutController = new MetaLayoutController();
const metaPageController = new MetaPageController();
const metaWorkflowController = new MetaWorkflowController();
const dashboardController = new DashboardController();

// MetaObject routes
server.register(metaObjectController.routes, { prefix: '/api/v1/objects' });

// MetaField routes
server.register(metaFieldController.routes, { prefix: '/api/v1/fields' });

// MetaRelation routes
server.register(metaRelationController.routes, { prefix: '/api/v1/relations' });

// MetaLayout routes
server.register(metaLayoutController.routes, { prefix: '/api/v1/layouts' });

// MetaPage routes
server.register(metaPageController.routes, { prefix: '/api/v1/pages' });

// MetaWorkflow routes
server.register(metaWorkflowController.routes, { prefix: '/api/v1/workflows' });

// Dashboard routes
server.register(dashboardController.routes, { prefix: '/api/v1/dashboard' });

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server);

const start = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    server.log.info(`Metadata Service listening on http://${host}:${port}`);
    
    // Initialize WebSocket server after HTTP server is ready
    wsManager.initialize();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Received SIGINT, shutting down gracefully...');
  wsManager.close();
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  server.log.info('Received SIGTERM, shutting down gracefully...');
  wsManager.close();
  await server.close();
  process.exit(0);
});

start();
