import "reflect-metadata";
import path from "path";
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { DataSource } from 'typeorm';
import { WorkflowEngine } from './core/WorkflowEngine';
import { WorkflowRoutes } from './routes/workflowRoutes';
import { HealthRoutes } from './routes/healthRoutes';
import { config } from './config/config';

const server = fastify({
  logger: {
    level: process.env['LOG_LEVEL'] || 'info',
  },
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

const isProduction = process.env['NODE_ENV'] === 'production';
const dbPassword = process.env['DB_PASSWORD'] || (!isProduction ? 'platform123' : requireEnv('DB_PASSWORD'));

// Initialize database connection
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432'),
  username: process.env['DB_USER'] || 'platform',
  password: dbPassword,
  database: process.env['DB_NAME'] || 'platform',
  entities: [path.join(__dirname, 'entities/*.{js,ts}')],
  migrations: [path.join(__dirname, 'migrations/*.{js,ts}')],
  synchronize: !isProduction && process.env['TYPEORM_SYNCHRONIZE'] === 'true',
  logging: process.env['TYPEORM_LOGGING'] === 'true',
});

// Initialize workflow engine
const workflowEngine = new WorkflowEngine(dataSource, config);

// Register plugins
const allowedOrigins = process.env['CORS_ORIGIN']
  ? process.env['CORS_ORIGIN'].split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3101', 'http://localhost:5178', 'http://localhost:5179'];

server.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

server.register(helmet);

server.register(swagger, {
  swagger: {
    info: {
      title: 'Workflow Engine API',
      description: 'Workflow & Automation Engine API',
      version: '1.0.0',
    },
    host: 'localhost:3004',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'workflows', description: 'Workflow management' },
      { name: 'triggers', description: 'Trigger management' },
      { name: 'actions', description: 'Action management' },
      { name: 'executions', description: 'Workflow execution' },
    ],
  },
});

server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
  },
});

// Register routes
server.register(HealthRoutes);
server.register(WorkflowRoutes, { workflowEngine });

// Start server
const start = async () => {
  try {
    await dataSource.initialize();
    await workflowEngine.initialize();
    
    const port = parseInt(process.env['PORT'] || '3004');
    await server.listen({ port, host: '0.0.0.0' });
    
    server.log.info(`🚀 Workflow Engine running on port ${port}`);
    server.log.info(`📚 API Documentation: http://localhost:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Shutting down gracefully...');
  await workflowEngine.shutdown();
  await dataSource.destroy();
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  server.log.info('Shutting down gracefully...');
  await workflowEngine.shutdown();
  await dataSource.destroy();
  await server.close();
  process.exit(0);
});

start();
