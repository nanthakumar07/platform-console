import "reflect-metadata";
import "dotenv/config";
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from 'jsonwebtoken';
import { initializeDatabase } from './config/database';
import { DynamicQueryBuilder } from './builders/DynamicQueryBuilder';
import { TenantTableService } from './services/TenantTableService';

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

type AuthPayload = {
  sub: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
};

const jwtSecret = requireEnv('JWT_SECRET');
const jwtIssuer = process.env.JWT_ISSUER || 'platform-auth-service';
const jwtAudience = process.env.JWT_AUDIENCE || 'platform-api';
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3101', 'http://localhost:5178', 'http://localhost:5179'];

// Register plugins
server.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

server.register(helmet, {
  contentSecurityPolicy: false,
});

server.addHook('preHandler', async (request, reply) => {
  if (request.url === '/health') {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.substring(7);
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, jwtSecret, {
      issuer: jwtIssuer,
      audience: jwtAudience
    }) as AuthPayload;
  } catch {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  if (request.url.startsWith('/admin/')) {
    const roles = payload.roles || [];
    if (!roles.includes('admin')) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin role required'
      });
    }
  }

  const routeTenantId = (request.params as any)?.tenantId as string | undefined;
  if (routeTenantId && payload.tenantId && routeTenantId !== payload.tenantId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Cross-tenant access is not allowed'
    });
  }

  request.headers['x-user-id'] = payload.sub;
  if (payload.tenantId) {
    request.headers['x-tenant-id'] = payload.tenantId;
  }
});

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Initialize services
const tenantTableService = new TenantTableService();

// Dynamic CRUD endpoints
server.post('/api/v1/:tenantId/:objectName', async (request, reply) => {
  try {
    const { tenantId, objectName } = request.params as { tenantId: string; objectName: string };
    const data = request.body as Record<string, any>;

    // TODO: Fetch object definition from metadata service
    const objectDefinition = {
      apiName: objectName,
      fields: [
        { apiName: 'name', dataType: 'TEXT', required: true, unique: false },
        { apiName: 'email', dataType: 'EMAIL', required: false, unique: true },
        { apiName: 'phone', dataType: 'PHONE', required: false, unique: false },
      ]
    };

    const queryBuilder = new DynamicQueryBuilder(tenantId, objectDefinition);
    const query = await queryBuilder.buildInsertQuery(data);
    const result = await query;

    return reply.status(201).send(result[0]);
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.get('/api/v1/:tenantId/:objectName', async (request, reply) => {
  try {
    const { tenantId, objectName } = request.params as { tenantId: string; objectName: string };
    const query = request.query as any;

    // TODO: Fetch object definition from metadata service
    const objectDefinition = {
      apiName: objectName,
      fields: [
        { apiName: 'name', dataType: 'TEXT', required: true, unique: false },
        { apiName: 'email', dataType: 'EMAIL', required: false, unique: true },
        { apiName: 'phone', dataType: 'PHONE', required: false, unique: false },
      ]
    };

    const queryBuilder = new DynamicQueryBuilder(tenantId, objectDefinition);
    const builtQuery = await queryBuilder.buildSelectQuery(query);
    const records = await builtQuery;

    // Get total count for pagination
    const countQuery = await queryBuilder.buildCountQuery(query.filters || {});
    const countResult = await countQuery;
    const total = parseInt(countResult[0].total);

    return reply.send({
      records,
      pagination: {
        page: parseInt(query.page) || 1,
        limit: parseInt(query.limit) || 20,
        total,
        totalPages: Math.ceil(total / (parseInt(query.limit) || 20))
      }
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.get('/api/v1/:tenantId/:objectName/:id', async (request, reply) => {
  try {
    const { tenantId, objectName, id } = request.params as { 
      tenantId: string; 
      objectName: string; 
      id: string 
    };

    // TODO: Fetch object definition from metadata service
    const objectDefinition = {
      apiName: objectName,
      fields: [
        { apiName: 'name', dataType: 'TEXT', required: true, unique: false },
        { apiName: 'email', dataType: 'EMAIL', required: false, unique: true },
        { apiName: 'phone', dataType: 'PHONE', required: false, unique: false },
      ]
    };

    const queryBuilder = new DynamicQueryBuilder(tenantId, objectDefinition);
    
    const record = await queryBuilder.buildSelectQuery({ filters: { id } }).then(q => q.first());

    if (!record) {
      return reply.status(404).send({ error: 'Record not found' });
    }

    return reply.send(record);
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.patch('/api/v1/:tenantId/:objectName/:id', async (request, reply) => {
  try {
    const { tenantId, objectName, id } = request.params as { 
      tenantId: string; 
      objectName: string; 
      id: string 
    };
    const data = request.body as Record<string, any>;
    const queryParams = request.query as any;
    const version = (queryParams.version as string) || undefined;

    // TODO: Fetch object definition from metadata service
    const objectDefinition = {
      apiName: objectName,
      fields: [
        { apiName: 'name', dataType: 'TEXT', required: true, unique: false },
        { apiName: 'email', dataType: 'EMAIL', required: false, unique: true },
        { apiName: 'phone', dataType: 'PHONE', required: false, unique: false },
      ]
    };

    const queryBuilder = new DynamicQueryBuilder(tenantId, objectDefinition);
    const query = await queryBuilder.buildUpdateQuery(id, data, version ? parseInt(version) : undefined);
    const result = await query;

    if (result.length === 0) {
      return reply.status(404).send({ error: 'Record not found or version mismatch' });
    }

    return reply.send(result[0]);
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.delete('/api/v1/:tenantId/:objectName/:id', async (request, reply) => {
  try {
    const { tenantId, objectName, id } = request.params as { 
      tenantId: string; 
      objectName: string; 
      id: string 
    };
    const queryParams = request.query as any;
    const soft = queryParams.soft !== 'false';

    // TODO: Fetch object definition from metadata service
    const objectDefinition = {
      apiName: objectName,
      fields: [
        { apiName: 'name', dataType: 'TEXT', required: true, unique: false },
        { apiName: 'email', dataType: 'EMAIL', required: false, unique: true },
        { apiName: 'phone', dataType: 'PHONE', required: false, unique: false },
      ]
    };

    const queryBuilder = new DynamicQueryBuilder(tenantId, objectDefinition);
    await queryBuilder.buildDeleteQuery(id, soft);

    return reply.status(204).send();
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Table management endpoints
server.post('/admin/tables', async (request, reply) => {
  try {
    const options = request.body as {
      tenantId: string;
      objectApiName: string;
      fields: any[];
    };

    await tenantTableService.createTenantTable(options);

    return reply.status(201).send({ message: 'Table created successfully' });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.post('/admin/tables/:tenantId/:objectName/columns', async (request, reply) => {
  try {
    const { tenantId, objectName } = request.params as { tenantId: string; objectName: string };
    const field = request.body as any;

    await tenantTableService.addColumn(tenantId, objectName, field);

    return reply.status(201).send({ message: 'Column added successfully' });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

const start = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    const port = parseInt(process.env.PORT || '3003');
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    server.log.info(`Data Access Layer listening on http://${host}:${port}`);
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
