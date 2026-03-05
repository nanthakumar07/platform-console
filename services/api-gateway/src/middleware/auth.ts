import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { JWTPayload, TenantInfo, RequestContext } from '../types';

export class AuthMiddleware {
  private jwtSecret: string;
  private authServiceUrl: string;

  constructor(jwtSecret: string, authServiceUrl: string) {
    this.jwtSecret = jwtSecret;
    this.authServiceUrl = authServiceUrl;
  }

  async verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
    try {
      // TODO: Call auth service to get tenant info
      // For now, return mock data
      return {
        id: tenantId,
        name: 'Demo Tenant',
        domain: 'demo.platform.io',
        tier: 'pro',
        isActive: true,
        settings: {
          maxApiCallsPerMinute: 1000,
          allowedOrigins: ['http://localhost:3000', 'https://demo.platform.io'],
        }
      };
    } catch (error) {
      return null;
    }
  }

  async extractTenantFromRequest(request: FastifyRequest): Promise<string | null> {
    // Extract from subdomain first
    const host = request.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }

    // Fallback to header
    return (request.headers['x-tenant-id'] as string) || null;
  }

  createAuthMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health, explicitly public endpoints, and auth endpoints.
    if (request.url === '/health' || 
        request.url?.startsWith('/public/') ||
        request.url?.startsWith('/webhooks/') ||
        request.url?.startsWith('/auth/')) {
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
    const user = await this.verifyJWT(token);
    
    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Extract tenant ID
    const tenantId = user.tenantId || await this.extractTenantFromRequest(request);
    
    if (!tenantId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tenant ID not found'
      });
    }

    // Get tenant info
    const tenant = await this.getTenantInfo(tenantId);
    
    if (!tenant) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Tenant not found'
      });
    }

    if (!tenant.isActive) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tenant is suspended'
      });
    }

    // Attach context to request (using a different approach for Fastify)
    Object.defineProperty(request, 'context', {
      value: {
        user,
        tenant,
        requestId: request.id,
        startTime: Date.now()
      } as RequestContext,
      writable: false,
      enumerable: true,
      configurable: true
    });

    // Add tenant info to headers for downstream services
    request.headers['x-tenant-id'] = tenantId;
    request.headers['x-user-id'] = user.sub;
  };

  createPermissionMiddleware = (requiredPermission: { object: string; action: string }) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = (request as any).context as RequestContext;
      
      if (!context) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      // TODO: Implement proper RBAC check
      // For now, allow all authenticated users
      const hasPermission = context.user.roles.includes('admin') || 
                         context.user.roles.includes('developer');

      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }
    };
  }
}
