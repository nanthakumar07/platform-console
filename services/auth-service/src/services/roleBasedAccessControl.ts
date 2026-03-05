import { Role, Permission, User } from '../entities';

export interface RoleHierarchy {
  [roleName: string]: string[]; // role -> inherited roles
}

export interface DynamicPermission {
  name: string;
  resource: string;
  action: string;
  description: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'tenant' | 'ownership' | 'custom' | 'time' | 'location';
  evaluate: (context: PermissionContext) => boolean;
}

export interface PermissionContext {
  user: User;
  resource?: any;
  action?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export class RoleBasedAccessControl {
  private static roleHierarchy: RoleHierarchy = {
    'super_admin': [], // Top level - inherits from nothing
    'admin': ['developer'], // Admin inherits all developer permissions
    'developer': ['analyst'], // Developer inherits all analyst permissions
    'analyst': ['user'], // Analyst inherits all user permissions
    'user': [], // Base level
  };

  private static dynamicPermissions: DynamicPermission[] = [
    {
      name: 'data:own',
      resource: 'data',
      action: 'own',
      description: 'Access own data records only',
      conditions: [
        {
          type: 'ownership',
          evaluate: (context) => {
            if (!context.resource || !context.resource.createdBy) return false;
            return context.resource.createdBy === context.user.id;
          }
        }
      ]
    },
    {
      name: 'collaboration:team',
      resource: 'collaboration',
      action: 'team',
      description: 'Access team collaboration features',
      conditions: [
        {
          type: 'tenant',
          evaluate: (context) => {
            return context.user.tenantId === context.tenantId;
          }
        }
      ]
    },
    {
      name: 'analytics:team',
      resource: 'analytics',
      action: 'team',
      description: 'Access team analytics only',
      conditions: [
        {
          type: 'tenant',
          evaluate: (context) => {
            return context.user.tenantId === context.tenantId;
          }
        }
      ]
    }
  ];

  private static staticRolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    admin: [
      'users:read', 'users:write', 'users:delete',
      'roles:read', 'roles:write', 'roles:delete',
      'permissions:read', 'permissions:write', 'permissions:delete',
      'tenants:read', 'tenants:write', 'tenants:delete',
      'metadata:read', 'metadata:write', 'metadata:delete',
      'data:read', 'data:write', 'data:delete'
    ],
    developer: ['metadata:read', 'metadata:write', 'data:read', 'data:write'],
    analyst: ['data:read'],
    user: ['data:read']
  };

  /**
   * Get all permissions for a role including inherited permissions
   */
  static getRolePermissions(role: Role): Permission[] {
    const allPermissions = new Set<Permission>();
    
    // Add direct permissions
    role.permissions.forEach(permission => {
      if (typeof permission === 'string') {
        // Handle case where permissions are stored as strings
        allPermissions.add({ name: permission, resource: '', action: '', description: '' } as Permission);
      } else {
        allPermissions.add(permission);
      }
    });
    
    // Add inherited permissions
    const inheritedRoles = this.getInheritedRoles(role.name);
    // Note: In a real implementation, you would fetch inherited roles from database
    // For now, we'll assume the inherited permissions are already loaded in the role object
    
    return Array.from(allPermissions);
  }

  /**
   * Get all inherited roles for a given role
   */
  static getInheritedRoles(roleName: string): string[] {
    const inherited = new Set<string>();
    const directInherited = this.roleHierarchy[roleName] || [];
    
    directInherited.forEach(inheritedRole => {
      inherited.add(inheritedRole);
      // Recursively get inherited roles of inherited roles
      const nestedInherited = this.getInheritedRoles(inheritedRole);
      nestedInherited.forEach(role => inherited.add(role));
    });
    
    return Array.from(inherited);
  }

  /**
   * Check if user has a specific permission (static + dynamic)
   */
  static async hasPermission(
    user: User,
    permissionName: string,
    context?: PermissionContext
  ): Promise<boolean> {
    // Check static permissions first
    const hasStaticPermission = await this.hasStaticPermission(user, permissionName);
    if (hasStaticPermission) return true;

    // Check dynamic permissions
    if (context) {
      const hasDynamicPermission = await this.hasDynamicPermission(user, permissionName, context);
      if (hasDynamicPermission) return true;
    }

    return false;
  }

  /**
   * Check static permission from user roles
   */
  private static async hasStaticPermission(user: User, permissionName: string): Promise<boolean> {
    for (const roleName of user.roles) {
      const rolePermissions = this.getRolePermissionNames(roleName);
      if (rolePermissions.includes('*') || rolePermissions.includes(permissionName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check dynamic permission based on conditions
   */
  private static async hasDynamicPermission(
    user: User,
    permissionName: string,
    context: PermissionContext
  ): Promise<boolean> {
    const dynamicPermission = this.dynamicPermissions.find(
      permission => permission.name === permissionName
    );
    
    if (!dynamicPermission || !dynamicPermission.conditions) {
      return false;
    }
    
    // Evaluate all conditions
    for (const condition of dynamicPermission.conditions) {
      if (!condition.evaluate(context)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get all effective permissions for a user (static + dynamic)
   */
  static async getEffectivePermissions(user: User, context?: PermissionContext): Promise<string[]> {
    const permissions = new Set<string>();
    
    // Add static permissions
    for (const roleName of user.roles) {
      const rolePermissions = this.getRolePermissionNames(roleName);
      rolePermissions.forEach(permission => permissions.add(permission));
    }
    
    // Add dynamic permissions that pass conditions
    if (context) {
      for (const dynamicPermission of this.dynamicPermissions) {
        const hasPermission = await this.hasDynamicPermission(user, dynamicPermission.name, context);
        if (hasPermission) {
          permissions.add(dynamicPermission.name);
        }
      }
    }
    
    return Array.from(permissions);
  }

  /**
   * Add a new dynamic permission
   */
  static addDynamicPermission(permission: DynamicPermission): void {
    this.dynamicPermissions.push(permission);
  }

  private static getRolePermissionNames(roleName: string): string[] {
    const permissions = new Set<string>(this.staticRolePermissions[roleName] || []);
    const inheritedRoles = this.getInheritedRoles(roleName);
    inheritedRoles.forEach((inheritedRole) => {
      (this.staticRolePermissions[inheritedRole] || []).forEach((permission) => permissions.add(permission));
    });
    return Array.from(permissions);
  }

  /**
   * Check if role can inherit from another role
   */
  static canInherit(fromRoleName: string, toRoleName: string): boolean {
    // Prevent circular inheritance
    const visited = new Set<string>();
    
    const checkCircular = (role: string): boolean => {
      if (visited.has(role)) return false;
      visited.add(role);
      
      const inherited = this.roleHierarchy[role] || [];
      if (inherited.includes(toRoleName)) return true;
      
      for (const inheritedRole of inherited) {
        if (checkCircular(inheritedRole)) return true;
      }
      
      return false;
    };
    
    return !checkCircular(fromRoleName);
  }

  /**
   * Add role inheritance
   */
  static addRoleInheritance(parentRoleName: string, childRoleName: string): boolean {
    if (!this.canInherit(parentRoleName, childRoleName)) {
      return false; // Would create circular inheritance
    }
    
    if (!this.roleHierarchy[parentRoleName]) {
      this.roleHierarchy[parentRoleName] = [];
    }
    
    if (!this.roleHierarchy[parentRoleName].includes(childRoleName)) {
      this.roleHierarchy[parentRoleName].push(childRoleName);
    }
    
    return true;
  }

  /**
   * Get role hierarchy tree
   */
  static getRoleHierarchyTree(): Record<string, string[]> {
    return { ...this.roleHierarchy };
  }

  /**
   * Evaluate complex permission scenarios
   */
  static async evaluatePermissionScenario(
    user: User,
    scenarios: PermissionScenario[]
  ): Promise<PermissionScenarioResult[]> {
    const results: PermissionScenarioResult[] = [];
    
    for (const scenario of scenarios) {
      const hasPermission = await this.hasPermission(
        user,
        scenario.permission,
        scenario.context
      );
      
      results.push({
        scenario: scenario.name,
        permission: scenario.permission,
        granted: hasPermission,
        reason: hasPermission ? 'Permission granted' : 'Permission denied',
        evaluatedAt: new Date()
      });
    }
    
    return results;
  }
}

export interface PermissionScenario {
  name: string;
  permission: string;
  context: PermissionContext;
}

export interface PermissionScenarioResult {
  scenario: string;
  permission: string;
  granted: boolean;
  reason: string;
  evaluatedAt: Date;
}

export default RoleBasedAccessControl;
