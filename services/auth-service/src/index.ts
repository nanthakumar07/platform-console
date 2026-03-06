import "reflect-metadata";
import "dotenv/config";
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { initializeDatabase } from './config/database';
import { AuthService } from './services/AuthService';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3101', 'http://localhost:5178', 'http://localhost:5179'];

server.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

server.register(helmet, {
  contentSecurityPolicy: false,
});

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Initialize services
const authService = new AuthService();

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Authentication endpoints
server.post('/auth/login', async (request, reply) => {
  try {
    const { email, password, tenantId } = request.body as any;
    
    if (!email || !password || !tenantId) {
      return reply.status(400).send({
        error: 'Missing required fields: email, password, tenantId'
      });
    }

    const result = await authService.authenticateLocal(email, password, tenantId);
    
    if (!result.success) {
      return reply.status(401).send(result);
    }

    return reply.send(result);
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/auth/refresh', async (request, reply) => {
  try {
    const { refreshToken } = request.body as any;
    
    if (!refreshToken) {
      return reply.status(400).send({
        error: 'Missing required field: refreshToken'
      });
    }

    const result = await authService.refreshToken(refreshToken);
    
    if (!result.success) {
      return reply.status(401).send(result);
    }

    return reply.send(result);
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/auth/logout', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    await authService.logout(token);

    return reply.send({ message: 'Logged out successfully' });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.get('/auth/verify', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    const payload = await authService.validateToken(token);
    
    if (!payload) {
      return reply.status(401).send({
        error: 'Invalid or expired token'
      });
    }

    return reply.send({ valid: true, payload });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// OAuth2 endpoints
server.get('/auth/oauth2/:provider', async (request, reply) => {
  try {
    const { provider } = request.params as { provider: string };
    const authUrl = authService.getOAuth2AuthorizationUrl(provider);
    
    if (!authUrl) {
      return reply.status(404).send({
        error: 'OAuth2 provider not found'
      });
    }

    return reply.send({ authorizationUrl: authUrl });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.post('/auth/oauth2/:provider/callback', async (request, reply) => {
  try {
    const { provider } = request.params as { provider: string };
    const { code, state, tenantId } = request.body as any;
    
    if (!code || !tenantId) {
      return reply.status(400).send({
        error: 'Missing required fields: code, tenantId'
      });
    }

    const result = await authService.authenticateOAuth2(provider, code, state || '', tenantId);
    
    if (!result.success) {
      return reply.status(401).send(result);
    }

    return reply.send(result);
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// User management endpoints
server.get('/users/me', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    const payload = await authService.validateToken(token);
    
    if (!payload) {
      return reply.status(401).send({
        error: 'Invalid or expired token'
      });
    }

    // TODO: Fetch user from database using payload.sub
    return reply.send({
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const start = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Initialize auth providers
    await authService.initializeProviders();

    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`Auth Service listening on http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await server.close();
  process.exit(0);
});

start();
