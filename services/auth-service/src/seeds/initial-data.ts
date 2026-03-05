import "reflect-metadata";
import { AppDataSource } from '../config/database';
import { User, Role, Permission, AuthProvider } from '../entities';
import bcrypt from 'bcrypt';

export const seedInitialData = async () => {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);
    const providerRepository = AppDataSource.getRepository(AuthProvider);

    console.log('🌱 Seeding initial data...');

    // Create permissions
    const permissions = [
      // User management
      { name: 'users:read', resource: 'users', action: 'read', description: 'Read user information' },
      { name: 'users:write', resource: 'users', action: 'write', description: 'Create and update users' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
      
      // Role management
      { name: 'roles:read', resource: 'roles', action: 'read', description: 'Read role information' },
      { name: 'roles:write', resource: 'roles', action: 'write', description: 'Create and update roles' },
      { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
      
      // Permission management
      { name: 'permissions:read', resource: 'permissions', action: 'read', description: 'Read permissions' },
      { name: 'permissions:write', resource: 'permissions', action: 'write', description: 'Create and update permissions' },
      { name: 'permissions:delete', resource: 'permissions', action: 'delete', description: 'Delete permissions' },
      
      // Tenant management
      { name: 'tenants:read', resource: 'tenants', action: 'read', description: 'Read tenant information' },
      { name: 'tenants:write', resource: 'tenants', action: 'write', description: 'Create and update tenants' },
      { name: 'tenants:delete', resource: 'tenants', action: 'delete', description: 'Delete tenants' },
      
      // Metadata management
      { name: 'metadata:read', resource: 'metadata', action: 'read', description: 'Read metadata objects and fields' },
      { name: 'metadata:write', resource: 'metadata', action: 'write', description: 'Create and update metadata' },
      { name: 'metadata:delete', resource: 'metadata', action: 'delete', description: 'Delete metadata' },
      
      // Data management
      { name: 'data:read', resource: 'data', action: 'read', description: 'Read data records' },
      { name: 'data:write', resource: 'data', action: 'write', description: 'Create and update data records' },
      { name: 'data:delete', resource: 'data', action: 'delete', description: 'Delete data records' },
      
      // API management
      { name: 'api:read', resource: 'api', action: 'read', description: 'Read API configurations' },
      { name: 'api:write', resource: 'api', action: 'write', description: 'Create and update API configurations' },
      { name: 'api:delete', resource: 'api', action: 'delete', description: 'Delete API configurations' },
      
      // Workflow management
      { name: 'workflows:read', resource: 'workflows', action: 'read', description: 'Read workflows' },
      { name: 'workflows:write', resource: 'workflows', action: 'write', description: 'Create and update workflows' },
      { name: 'workflows:delete', resource: 'workflows', action: 'delete', description: 'Delete workflows' },
      
      // Analytics and reporting
      { name: 'analytics:read', resource: 'analytics', action: 'read', description: 'Read analytics data' },
      { name: 'analytics:write', resource: 'analytics', action: 'write', description: 'Create analytics reports' },
      
      // Collaboration features
      { name: 'collaboration:read', resource: 'collaboration', action: 'read', description: 'Access collaboration features' },
      { name: 'collaboration:write', resource: 'collaboration', action: 'write', description: 'Create comments and activities' },
      { name: 'collaboration:share', resource: 'collaboration', action: 'share', description: 'Share dashboards' },
      { name: 'collaboration:admin', resource: 'collaboration', action: 'admin', description: 'Manage collaborators' },
    ];

    for (const permissionData of permissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { name: permissionData.name }
      });

      if (!existingPermission) {
        const permission = permissionRepository.create(permissionData);
        await permissionRepository.save(permission);
        console.log(`✅ Created permission: ${permissionData.name}`);
      }
    }

    // Create roles
    const roles = [
      {
        name: 'super_admin',
        description: 'Super administrator with full system access',
        permissions: permissions.map(p => p.name),
        isSystem: true,
      },
      {
        name: 'admin',
        description: 'Tenant administrator with full tenant access',
        permissions: [
          'users:read', 'users:write',
          'roles:read',
          'permissions:read',
          'tenants:read',
          'metadata:read', 'metadata:write', 'metadata:delete',
          'data:read', 'data:write', 'data:delete',
          'api:read', 'api:write',
          'workflows:read', 'workflows:write', 'workflows:delete',
          'analytics:read', 'analytics:write',
          'collaboration:read', 'collaboration:write', 'collaboration:share', 'collaboration:admin',
        ],
        isSystem: true,
      },
      {
        name: 'developer',
        description: 'Developer with access to metadata and data',
        permissions: [
          'users:read',
          'roles:read',
          'permissions:read',
          'metadata:read', 'metadata:write',
          'data:read', 'data:write',
          'api:read',
          'workflows:read', 'workflows:write',
          'analytics:read',
          'collaboration:read', 'collaboration:write', 'collaboration:share',
        ],
        isSystem: true,
      },
      {
        name: 'analyst',
        description: 'Data analyst with read-only access',
        permissions: [
          'users:read',
          'metadata:read',
          'data:read',
          'analytics:read',
          'collaboration:read',
        ],
        isSystem: true,
      },
      {
        name: 'user',
        description: 'Regular user with basic access',
        permissions: [
          'data:read',
        ],
        isSystem: true,
      },
    ];

    for (const roleData of roles) {
      const existingRole = await roleRepository.findOne({
        where: { name: roleData.name }
      });

      if (!existingRole) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`✅ Created role: ${roleData.name}`);
      }
    }

    // Create demo tenant users
    const demoUsers = [
      {
        email: 'admin@demo.com',
        firstName: 'Admin',
        lastName: 'User',
        tenantId: 'demo',
        roles: ['admin'],
        password: 'admin123',
      },
      {
        email: 'developer@demo.com',
        firstName: 'Developer',
        lastName: 'User',
        tenantId: 'demo',
        roles: ['developer'],
        password: 'dev123',
      },
      {
        email: 'analyst@demo.com',
        firstName: 'Analyst',
        lastName: 'User',
        tenantId: 'demo',
        roles: ['analyst'],
        password: 'analyst123',
      },
      {
        email: 'user@demo.com',
        firstName: 'Regular',
        lastName: 'User',
        tenantId: 'demo',
        roles: ['user'],
        password: 'user123',
      },
    ];

    for (const userData of demoUsers) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email, tenantId: userData.tenantId }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const user = userRepository.create({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          tenantId: userData.tenantId,
          roles: userData.roles,
          isActive: true,
          password: hashedPassword,
        });

        await userRepository.save(user);
        console.log(`✅ Created user: ${userData.email}`);
      }
    }

    // Create auth providers
    const providers = [
      {
        name: 'local',
        type: 'local' as const,
        config: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
          },
          sessionTimeout: 3600, // 1 hour
        },
        isActive: true,
      },
      {
        name: 'google',
        type: 'oauth2' as const,
        config: {
          clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          scopes: ['email', 'profile'],
          redirectUri: 'http://localhost:3000/auth/google/callback',
        },
        isActive: false, // Disabled until configured
      },
      {
        name: 'github',
        type: 'oauth2' as const,
        config: {
          clientId: process.env.GITHUB_CLIENT_ID || 'your-github-client-id',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret',
          authorizationUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          userInfoUrl: 'https://api.github.com/user',
          scopes: ['user:email'],
          redirectUri: 'http://localhost:3000/auth/github/callback',
        },
        isActive: false, // Disabled until configured
      },
    ];

    for (const providerData of providers) {
      const existingProvider = await providerRepository.findOne({
        where: { name: providerData.name }
      });

      if (!existingProvider) {
        const provider = providerRepository.create(providerData);
        await providerRepository.save(provider);
        console.log(`✅ Created auth provider: ${providerData.name}`);
      }
    }

    console.log('🎉 Initial data seeding completed successfully!');
    
    // Display demo credentials
    console.log('\n📋 Demo Credentials:');
    console.log('==================');
    console.log('Tenant: demo');
    console.log('');
    console.log('Admin User:');
    console.log('  Email: admin@demo.com');
    console.log('  Password: admin123');
    console.log('  Roles: admin');
    console.log('');
    console.log('Developer User:');
    console.log('  Email: developer@demo.com');
    console.log('  Password: dev123');
    console.log('  Roles: developer');
    console.log('');
    console.log('Analyst User:');
    console.log('  Email: analyst@demo.com');
    console.log('  Password: analyst123');
    console.log('  Roles: analyst');
    console.log('');
    console.log('Regular User:');
    console.log('  Email: user@demo.com');
    console.log('  Password: user123');
    console.log('  Roles: user');

  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

// Run if called directly
if (require.main === module) {
  seedInitialData().catch(console.error);
}
