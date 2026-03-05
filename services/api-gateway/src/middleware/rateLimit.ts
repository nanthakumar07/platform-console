import { FastifyRequest } from 'fastify';
import Redis from 'ioredis';
import { TenantInfo, RequestContext } from '../types';

export class RateLimitMiddleware {
  private redis: Redis;
  private defaultLimits = {
    starter: { max: 100, windowMs: 60000 }, // 100 requests per minute
    pro: { max: 1000, windowMs: 60000 }, // 1000 requests per minute
    enterprise: { max: 10000, windowMs: 60000 }, // 10000 requests per minute
  };

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  private getKey(tenantId: string, identifier: string): string {
    return `rate_limit:${tenantId}:${identifier}`;
  }

  private async checkRateLimit(
    tenantId: string,
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(tenantId, identifier);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries and count current requests
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    if (currentCount >= maxRequests) {
      // Get the oldest request to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest?.[1] ? parseInt(oldest[1]) + windowMs : now + windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    
    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetTime: now + windowMs
    };
  }

  createRateLimitMiddleware = (customConfig?: { max?: number; windowMs?: number }) => {
    return async (request: any, reply: any) => {
      const context = request.context as RequestContext;
      
      if (!context?.tenant) {
        // Skip rate limiting for unauthenticated requests (they'll be caught by auth middleware)
        return;
      }

      const tenant = context.tenant;
      const limits = this.defaultLimits[tenant.tier];

      const maxRequests = customConfig?.max || limits.max;
      const windowMs = customConfig?.windowMs || limits.windowMs;

      // Use user ID for authenticated requests, IP for others
      const identifier = context.user?.sub || request.ip;
      
      const result = await this.checkRateLimit(
        tenant.id,
        identifier,
        maxRequests,
        windowMs
      );

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', maxRequests);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        reply.header('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
        
        return reply.status(429).send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
    };
  };

  // Webhook-specific rate limiting (more restrictive)
  createWebhookRateLimitMiddleware = () => {
    return this.createRateLimitMiddleware({
      max: 10, // 10 webhooks per minute
      windowMs: 60000
    });
  };

  // GraphQL-specific rate limiting (per query complexity)
  createGraphQLRateLimitMiddleware = () => {
    return async (request: any, reply: any, done: any) => {
      const context = request.context as RequestContext;
      
      if (!context?.tenant) {
        return done();
      }

      // TODO: Calculate query complexity and apply limits
      // For now, use standard rate limiting
      const middleware = this.createRateLimitMiddleware();
      await middleware(request, reply);
      
      done();
    };
  };

  async getTenantUsage(tenantId: string, timeRange: 'hour' | 'day' | 'month'): Promise<number> {
    const now = Date.now();
    let windowStart: number;

    switch (timeRange) {
      case 'hour':
        windowStart = now - (60 * 60 * 1000);
        break;
      case 'day':
        windowStart = now - (24 * 60 * 60 * 1000);
        break;
      case 'month':
        windowStart = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Count all requests for the tenant in the time range
    const keys = await this.redis.keys(`rate_limit:${tenantId}:*`);
    let totalCount = 0;

    if (keys.length > 0) {
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zcard(key);
      }

      const results = await pipeline.exec();
      
      // Sum up all the counts (every other result is a count)
      for (let i = 1; i < (results?.length || 0); i += 2) {
        totalCount += (results?.[i]?.[1] as number) || 0;
      }
    }

    return totalCount;
  }
}
