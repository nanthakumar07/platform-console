import axios from 'axios';
import crypto from 'crypto';
import { OAuth2Config, User } from '../types';

export class OAuth2Service {
  private config: OAuth2Config;

  constructor(config: OAuth2Config) {
    this.config = config;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  }> {
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }> {
    try {
      const response = await axios.get(this.config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch user information');
    }
  }

  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  verifyState(state: string, storedState: string): boolean {
    return state === storedState;
  }

  async authenticate(code: string, tenantId: string): Promise<User> {
    // Exchange code for access token
    const tokenData = await this.exchangeCodeForToken(code);
    
    // Get user information
    const userInfo = await this.getUserInfo(tokenData.access_token);

    // Create or update user in database
    // TODO: Implement user creation/update logic
    const user: User = {
      id: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.firstName || userInfo.name?.split(' ')[0] || '',
      lastName: userInfo.lastName || userInfo.name?.split(' ')[1] || '',
      tenantId,
      roles: ['user'], // Default role
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return user;
  }
}
