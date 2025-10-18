/**
 * Mock RBAC implementation for admin dashboard
 * This provides basic role checking until the full RBAC system is properly set up
 */

export interface Permission {
  id: string
  name: string
  description: string
  resource_type: string
  action: string
  scope: string
  is_system_permission: boolean
}

export class MockRBACManager {
  /**
   * Check if user has specific permission - simplified for admin dashboard
   */
  static async hasPermission(
    userId: string,
    permissionName: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    // For now, just return true for basic admin permissions
    // In a real implementation, this would check the database
    const basicAdminPermissions = [
      'admin.dashboard.view',
      'properties.manage',
      'pricing.manage',
      'users.manage',
      'system.manage',
      'reports.view'
    ]
    
    return basicAdminPermissions.includes(permissionName)
  }

  /**
   * Get user's permissions (mock implementation)
   */
  static async getUserPermissions(userId: string): Promise<{
    rolePermissions: Permission[]
    userOverrides: any[]
    effectivePermissions: string[]
  }> {
    return {
      rolePermissions: [],
      userOverrides: [],
      effectivePermissions: [
        'admin.dashboard.view',
        'properties.manage',
        'pricing.manage',
        'users.manage',
        'system.manage',
        'reports.view'
      ]
    }
  }
}
