import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthUser, LoginRequest, AuthResponse } from '../services/auth';
import { teamActivityService } from '../services/teamActivityService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  getOAuth2Url: (provider: string) => Promise<{ authorizationUrl: string } | null>;
  handleOAuth2Callback: (provider: string, code: string, state: string, tenantId: string) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Verify token is still valid
          const tokenValid = await authService.verifyToken();
          if (tokenValid.valid) {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
          } else {
            // Token is invalid, clear auth state
            await authService.logout();
            setUser(null);
          }
        } else {
          // Development auto-login
          if (import.meta.env.DEV) {
            console.log('🚀 Development mode: Auto-logging in with demo credentials');
            const demoResponse = await authService.login({
              email: 'admin@demo.com',
              password: 'admin123',
              tenantId: 'demo'
            });
            if (demoResponse.success && demoResponse.user) {
              setUser(demoResponse.user);
              console.log('✅ Auto-login successful');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any ongoing auth processes
      setIsLoading(false);
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Cleanup team activity service before logging out
      teamActivityService.cleanup();
      
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Refresh user error:', error);
      setUser(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission);
  };

  const hasRole = (role: string): boolean => {
    return authService.hasRole(role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return authService.hasAnyRole(roles);
  };

  const hasAllRoles = (roles: string[]): boolean => {
    return authService.hasAllRoles(roles);
  };

  const getOAuth2Url = async (provider: string): Promise<{ authorizationUrl: string } | null> => {
    return await authService.getOAuth2Url(provider);
  };

  const handleOAuth2Callback = async (
    provider: string,
    code: string,
    state: string,
    tenantId: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.handleOAuth2Callback(provider, code, state, tenantId);
      
      if (response.success && response.user) {
        setUser(response.user);
      }
      
      return response;
    } catch (error) {
      console.error('OAuth2 callback error:', error);
      return {
        success: false,
        error: 'OAuth2 authentication failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    getOAuth2Url,
    handleOAuth2Callback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string[],
  requiredRoles?: string[]
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, isLoading, hasPermission, hasAnyRole } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      // Redirect to login or show login modal
      window.location.href = '/login';
      return null;
    }

    // Check permissions if required
    if (requiredPermissions && !requiredPermissions.every(permission => hasPermission(permission))) {
      return <div>Access denied: Insufficient permissions</div>;
    }

    // Check roles if required
    if (requiredRoles && !hasAnyRole(requiredRoles)) {
      return <div>Access denied: Insufficient role</div>;
    }

    return <Component {...props} />;
  };
};

// Hook for requiring specific permissions
export const useRequirePermissions = (permissions: string[]) => {
  const { hasPermission, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    throw new Error('User must be authenticated');
  }

  const hasAllPermissions = permissions.every(permission => hasPermission(permission));

  if (!hasAllPermissions) {
    throw new Error(`Required permissions missing: ${permissions.join(', ')}`);
  }
};

// Hook for requiring specific roles
export const useRequireRoles = (roles: string[]) => {
  const { hasAnyRole, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    throw new Error('User must be authenticated');
  }

  const hasRequiredRole = hasAnyRole(roles);

  if (!hasRequiredRole) {
    throw new Error(`Required role missing: ${roles.join(' or ')}`);
  }
};
