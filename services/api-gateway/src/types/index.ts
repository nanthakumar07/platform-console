export interface JWTPayload {
  sub: string; // user ID
  tenantId: string;
  roles: string[];
  exp: number;
  iat: number;
  jti: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  tier: 'starter' | 'pro' | 'enterprise';
  isActive: boolean;
  settings: {
    maxApiCallsPerMinute: number;
    allowedOrigins: string[];
    customDomain?: string;
  };
}

export interface RequestContext {
  user: JWTPayload;
  tenant: TenantInfo;
  requestId: string;
  startTime: number;
}

export interface RateLimitConfig {
  max: number;
  timeWindow: string;
  keyGenerator?: (request: any) => string;
  skipOnError?: boolean;
}

export interface ServiceConfig {
  metadataService: string;
  authService: string;
  dalService: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

export interface RouteMetadata {
  permission?: {
    object: string;
    action: 'read' | 'create' | 'edit' | 'delete';
  };
  rateLimit?: RateLimitConfig;
  auth?: boolean;
}

export interface GraphQLContext {
  user?: JWTPayload;
  tenant?: TenantInfo;
  requestId: string;
  dataLoaders: Map<string, any>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SortOptions {
  [key: string]: 'asc' | 'desc';
}

export interface QueryOptions extends PaginationOptions {
  filters?: FilterOptions;
  sort?: SortOptions;
  fields?: string[];
}
