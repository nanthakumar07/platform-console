import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, AuthSession, AuthProvider } from '../entities';
import { AppDataSource } from '../config/database';
import { AuthRequest, AuthResponse, JWTPayload } from '../types';
import { JWTService } from './JWTService';
import { OAuth2Service } from './OAuth2Service';

export class AuthService {
  private userRepository: Repository<User>;
  private sessionRepository: Repository<AuthSession>;
  private providerRepository: Repository<AuthProvider>;
  private jwtService: JWTService;
  private oauth2Services: Map<string, OAuth2Service> = new Map();
  private oauthStateStore: Map<string, number> = new Map();

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.sessionRepository = AppDataSource.getRepository(AuthSession);
    this.providerRepository = AppDataSource.getRepository(AuthProvider);
    this.jwtService = new JWTService();
  }

  async initializeProviders(): Promise<void> {
    const providers = await this.providerRepository.find({
      where: { isActive: true }
    });

    for (const provider of providers) {
      if (provider.type === 'oauth2') {
        const oauth2Service = new OAuth2Service(provider.config as any);
        this.oauth2Services.set(provider.name, oauth2Service);
      }
    }
  }

  // async authenticateLocal(email: string, password: string, tenantId: string): Promise<AuthResponse> {
  //   try {
  //     const user = await this.userRepository.findOne({
  //       where: { email, tenantId, isActive: true }
  //     });

  //     if (!user) {
  //       return {
  //         success: false,
  //         error: 'Invalid credentials'
  //       };
  //     }

  //     // TODO: Implement password hashing and verification
  //     // const isPasswordValid = await bcrypt.compare(password, user.password);
  //     const isPasswordValid = true; // Placeholder

  //     if (!isPasswordValid) {
  //       return {
  //         success: false,
  //         error: 'Invalid credentials'
  //       };
  //     }

  //     // Update last login
  //     user.lastLoginAt = new Date();
  //     await this.userRepository.save(user);

  //     // Generate tokens
  //     const token = this.jwtService.generateToken(user);
  //     const refreshToken = this.jwtService.generateRefreshToken(user);

  //     // Create session
  //     const session = this.sessionRepository.create({
  //       userId: user.id,
  //       tenantId,
  //       token,
  //       refreshToken,
  //       expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  //       isActive: true,
  //       lastAccessAt: new Date(),
  //     });

  //     await this.sessionRepository.save(session);

  //     return {
  //       success: true,
  //       user,
  //       token,
  //       refreshToken,
  //       expiresAt: session.expiresAt,
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Authentication failed'
  //     };
  //   }
  // }

  async authenticateLocal(
  email: string,
  password: string,
  tenantId: string,
  totpToken?: string,
): Promise<AuthResponse> {
  try {
    // Must use queryBuilder to select password (it's select:false on the column)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email AND user.tenantId = :tenantId AND user.isActive = true', { email, tenantId })
      .getOne();

    if (!user) {
      // Constant-time rejection to prevent user enumeration timing attacks
      await bcrypt.compare(password, '$2b$12$placeholderHashToPreventTimingAttacks000000000000000');
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.password) {
      return { success: false, error: 'Account uses SSO login' };
    }

    // ✅ REAL password check — replaces the `const isPasswordValid = true` placeholder
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // MFA check if enabled
    if (user.mfaEnabled) {
      if (!totpToken) {
        return { success: false, error: 'MFA_REQUIRED', mfaRequired: true } as any;
      }
      const mfaValid = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: totpToken,
        window: 1,
      });
      if (!mfaValid) return { success: false, error: 'Invalid MFA token' };
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const token = this.jwtService.generateToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);

    const session = this.sessionRepository.create({
      userId: user.id, tenantId, token, refreshToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      isActive: true, lastAccessAt: new Date(),
    });
    await this.sessionRepository.save(session);

    return { success: true, user, token, refreshToken, expiresAt: session.expiresAt };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' };
  }
  }

  async hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 12);
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async setupMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const user = await this.userRepository.findOneOrFail({ where: { id: userId } });
    const secret = speakeasy.generateSecret({ name: `Platform (${user.email})`, issuer: 'Platform', length: 32 });
    const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());
    user.mfaSecret = secret.base32;
    user.mfaBackupCodes = backupCodes.map(c => bcrypt.hashSync(c, 10));
    await this.userRepository.save(user);
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCodeUrl, backupCodes };
  }

  async verifyAndEnableMfa(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepository.findOneOrFail({ where: { id: userId } });
    if (!user.mfaSecret) return false;
    const valid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 });
    if (valid) { 
      user.mfaEnabled = true; 
      await this.userRepository.save(user); 
    }
    return valid;
  }

  async authenticateOAuth2(providerName: string, code: string, state: string, tenantId: string): Promise<AuthResponse> {
    try {
      const oauth2Service = this.oauth2Services.get(providerName);
      if (!oauth2Service) {
        return {
          success: false,
          error: 'OAuth2 provider not found'
        };
      }

      // Verify state to prevent OAuth2 CSRF.
      if (!state || !this.consumeOAuthState(state)) {
        return {
          success: false,
          error: 'Invalid OAuth state'
        };
      }

      const user = await oauth2Service.authenticate(code, tenantId);

      // Check if user exists
      let existingUser = await this.userRepository.findOne({
        where: { email: user.email, tenantId }
      });

      if (!existingUser) {
        // Create new user
        existingUser = this.userRepository.create({
          ...user,
          tenantId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await this.userRepository.save(existingUser);
      } else {
        // Update existing user
        existingUser.lastLoginAt = new Date();
        existingUser.updatedAt = new Date();
        await this.userRepository.save(existingUser);
      }

      // Generate tokens
      const token = this.jwtService.generateToken(existingUser);
      const refreshToken = this.jwtService.generateRefreshToken(existingUser);

      // Create session
      const session = this.sessionRepository.create({
        userId: existingUser.id,
        tenantId,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        isActive: true,
        lastAccessAt: new Date(),
      });

      await this.sessionRepository.save(session);

      return {
        success: true,
        user: existingUser,
        token,
        refreshToken,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth2 authentication failed'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = this.jwtService.verifyRefreshToken(refreshToken);

      const session = await this.sessionRepository.findOne({
        where: {
          refreshToken,
          isActive: true,
          userId: decoded.userId,
        },
        relations: ['user'],
      });

      if (!session || session.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Invalid or expired refresh token'
        };
      }

      const user = session.user;
      const newToken = this.jwtService.generateToken(user);
      const newRefreshToken = this.jwtService.generateRefreshToken(user);

      // Update session
      session.token = newToken;
      session.refreshToken = newRefreshToken;
      session.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      session.lastAccessAt = new Date();
      await this.sessionRepository.save(session);

      return {
        success: true,
        user,
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.verifyToken(token);

      await this.sessionRepository.update(
        {
          userId: decoded.sub,
          isActive: true,
        },
        {
          isActive: false,
        }
      );
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.error('Logout error:', error);
    }
  }

  async validateToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = this.jwtService.verifyToken(token);

      const session = await this.sessionRepository.findOne({
        where: {
          token,
          isActive: true,
          userId: decoded.sub,
        },
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      // Update last access
      session.lastAccessAt = new Date();
      await this.sessionRepository.save(session);

      return decoded;
    } catch (error) {
      return null;
    }
  }

  getOAuth2AuthorizationUrl(providerName: string): string | null {
    const oauth2Service = this.oauth2Services.get(providerName);
    if (!oauth2Service) {
      return null;
    }

    const state = oauth2Service.generateState();
    this.storeOAuthState(state);
    
    return oauth2Service.getAuthorizationUrl(state);
  }

  private storeOAuthState(state: string): void {
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
    this.oauthStateStore.set(state, expiresAt);
    this.cleanupExpiredOAuthStates();
  }

  private consumeOAuthState(state: string): boolean {
    const expiresAt = this.oauthStateStore.get(state);
    if (!expiresAt) return false;
    this.oauthStateStore.delete(state);
    return expiresAt >= Date.now();
  }

  private cleanupExpiredOAuthStates(): void {
    const now = Date.now();
    for (const [state, expiresAt] of this.oauthStateStore.entries()) {
      if (expiresAt < now) {
        this.oauthStateStore.delete(state);
      }
    }
  }
}
