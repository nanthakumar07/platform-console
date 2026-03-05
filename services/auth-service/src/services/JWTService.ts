import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload, User } from '../types';

export class JWTService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be set');
    }
    this.secret = process.env.JWT_SECRET;
    this.issuer = process.env.JWT_ISSUER || 'platform-auth-service';
    this.audience = process.env.JWT_AUDIENCE || 'platform-api';
  }

  generateToken(user: User, expiresIn: string = '1h'): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: this.getUserPermissions(user),
      iss: this.issuer,
      aud: this.audience,
    };

    return jwt.sign(payload, this.secret, {
      expiresIn,
    } as SignOptions);
  }

  generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
        iss: this.issuer,
        aud: this.audience,
      },
      this.secret,
      {
        expiresIn: '7d',
      } as SignOptions
    );
  }

  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  verifyRefreshToken(token: string): { userId: string; type: string } {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return {
        userId: decoded.sub,
        type: decoded.type,
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  private getUserPermissions(user: User): string[] {
    // TODO: Implement permission resolution based on user roles
    // For now, return basic permissions
    const permissions: string[] = [];

    if (user.roles.includes('admin')) {
      permissions.push(
        'users:read', 'users:write', 'users:delete',
        'roles:read', 'roles:write', 'roles:delete',
        'permissions:read', 'permissions:write', 'permissions:delete',
        'tenants:read', 'tenants:write', 'tenants:delete',
        'metadata:read', 'metadata:write', 'metadata:delete',
        'data:read', 'data:write', 'data:delete'
      );
    }

    if (user.roles.includes('developer')) {
      permissions.push(
        'metadata:read', 'metadata:write',
        'data:read', 'data:write'
      );
    }

    if (user.roles.includes('user')) {
      permissions.push(
        'data:read'
      );
    }

    return permissions;
  }
}
