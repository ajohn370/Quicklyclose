/**
 * Role-Based Access Control (RBAC) System
 * Provides granular permission management and authorization
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Permission {
  id: string
  name: string
  description: string
  resource_type: string
  action: string
  scope: string
  is_system_permission: boolean
}

export interface Role {
  id: string
  name: string
  display_name: string
  description: string
  hierarchy_level: number
  is_system_role: boolean
  is_active: boolean
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string
  assigned_at: string
  expires_at?: string
  is_active: boolean
  role?: Role
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  granted: boolean
  reason?: string
  granted_by: string
  granted_at: string
  expires_at?: string
  permission?: Permission
}

export class RBACManager {
  /**
   * Check if user has specific permission
   */
  static async hasPermission(
    userId: string,
    permissionName: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_permission', {
        user_id: userId,
        permission_name: permissionName,
        resource_type: resourceType,
        resource_id: resourceId
      })

      if (error) {
        console.error('Permission check error:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('Permission check failed:', error)
      return false
    }
  }

  /**
   * Get user's role hierarchy level
   */
  static async getUserRoleLevel(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_user_role_level', {
        user_id: userId
      })

      if (error) {
        console.error('Role level check error:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Role level check failed:', error)
      return 0
    }
  }

  /**
   * Get user's roles
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        role:roles(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')

    if (error) {
      console.error('Get user roles error:', error)
      return []
    }

    return data || []
  }

  /**
   * Get user's permissions (including role-based and overrides)
   */
  static async getUserPermissions(userId: string): Promise<{
    rolePermissions: Permission[]
    userOverrides: UserPermission[]
    effectivePermissions: string[]
  }> {
    // Get role-based permissions
    const { data: rolePerms, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        role:roles!inner(
          role_permissions!inner(
            permission:permissions(*)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (roleError) {
      console.error('Get role permissions error:', roleError)
    }

    // Get user permission overrides
    const { data: userPerms, error: userError } = await supabase
      .from('user_permissions')
      .select(`
        *,
        permission:permissions(*)
      `)
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.now()')

    if (userError) {
      console.error('Get user permissions error:', userError)
    }

    // Process role permissions
    const rolePermissions: Permission[] = []
    if (rolePerms) {
      for (const userRole of rolePerms) {
        const role = userRole.role as any
        if (role?.role_permissions && Array.isArray(role.role_permissions)) {
          for (const rolePerm of role.role_permissions) {
            if (rolePerm.permission) {
              rolePermissions.push(rolePerm.permission)
            }
          }
        }
      }
    }

    const userOverrides = userPerms || []

    // Calculate effective permissions
    const effectivePermissions = new Set<string>()
    
    // Add role permissions
    rolePermissions.forEach(perm => effectivePermissions.add(perm.name))
    
    // Apply user overrides
    userOverrides.forEach(override => {
      if (override.permission) {
        if (override.granted) {
          effectivePermissions.add(override.permission.name)
        } else {
          effectivePermissions.delete(override.permission.name)
        }
      }
    })

    return {
      rolePermissions,
      userOverrides,
      effectivePermissions: Array.from(effectivePermissions)
    }
  }

  /**
   * Assign role to user
   */
  static async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: assignedBy,
          expires_at: expiresAt
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Remove role from user
   */
  static async removeRole(
    userId: string,
    roleId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Grant specific permission to user
   */
  static async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    reason?: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted: true,
          reason,
          granted_by: grantedBy,
          expires_at: expiresAt
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Deny specific permission to user (override role permissions)
   */
  static async denyPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    reason?: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted: false,
          reason,
          granted_by: grantedBy,
          expires_at: expiresAt
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Grant resource-specific permission
   */
  static async grantResourcePermission(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissionName: string,
    grantedBy: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('resource_permissions')
        .upsert({
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId,
          permission_name: permissionName,
          granted: true,
          granted_by: grantedBy,
          expires_at: expiresAt
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get all roles
   */
  static async getAllRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('hierarchy_level', { ascending: false })

    if (error) {
      console.error('Get all roles error:', error)
      return []
    }

    return data || []
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource_type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Get all permissions error:', error)
      return []
    }

    return data || []
  }

  /**
   * Create new role
   */
  static async createRole(
    name: string,
    displayName: string,
    description: string,
    hierarchyLevel: number,
    permissionIds: string[]
  ): Promise<{ success: boolean; roleId?: string; error?: string }> {
    try {
      // Create role
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .insert({
          name,
          display_name: displayName,
          description,
          hierarchy_level: hierarchyLevel,
          is_system_role: false
        })
        .select()
        .single()

      if (roleError || !role) {
        return { success: false, error: roleError?.message || 'Failed to create role' }
      }

      // Assign permissions to role
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permId => ({
          role_id: role.id,
          permission_id: permId
        }))

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(rolePermissions)

        if (permError) {
          // Rollback role creation
          await supabase.from('roles').delete().eq('id', role.id)
          return { success: false, error: permError.message }
        }
      }

      return { success: true, roleId: role.id }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Update role permissions
   */
  static async updateRolePermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      // Add new permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permId => ({
          role_id: roleId,
          permission_id: permId
        }))

        const { error } = await supabase
          .from('role_permissions')
          .insert(rolePermissions)

        if (error) {
          return { success: false, error: error.message }
        }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

/**
 * Permission checking middleware for API routes
 */
export function requirePermission(permissionName: string, resourceType?: string) {
  return async (userId: string, resourceId?: string): Promise<boolean> => {
    return await RBACManager.hasPermission(userId, permissionName, resourceType, resourceId)
  }
}

/**
 * Higher-order function for role-based access control
 */
export function withRBAC(permission: string, resourceType?: string) {
  return function<T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const method = descriptor.value!

    descriptor.value = (async function(this: any, ...args: any[]) {
      // Extract user ID from arguments (assumes first arg contains userId)
      const userId = args[0]?.userId
      const resourceId = args[0]?.resourceId

      if (!userId) {
        throw new Error('User ID required for permission check')
      }

      const hasPermission = await RBACManager.hasPermission(
        userId,
        permission,
        resourceType,
        resourceId
      )

      if (!hasPermission) {
        throw new Error(`Access denied: missing permission '${permission}'`)
      }

      return method.apply(this, args)
    }) as any

    return descriptor
  }
}

/**
 * Permission constants for easy reference
 */
export const PERMISSIONS = {
  // Property permissions
  REVIEW_SUBMISSIONS: 'can_review_submissions',
  APPROVE_PROPERTIES: 'can_approve_properties',
  REJECT_PROPERTIES: 'can_reject_properties',
  REVISE_PRICING: 'can_revise_pricing',
  MANAGE_PROPERTIES: 'can_manage_properties',
  WITHDRAW_PROPERTIES: 'can_withdraw_properties',

  // Analysis permissions
  TRIGGER_ANALYSIS: 'can_trigger_analysis',
  VIEW_ANALYSIS: 'can_view_analysis',
  OVERRIDE_ANALYSIS: 'can_override_analysis',

  // Bidding permissions
  START_BIDDING: 'can_start_bidding',
  MANAGE_BIDDING: 'can_manage_bidding',
  VIEW_BIDS: 'can_view_bids',
  ACCEPT_BIDS: 'can_accept_bids',
  PLACE_BIDS: 'can_place_bids',

  // User management permissions
  MANAGE_USERS: 'can_manage_users',
  ASSIGN_ROLES: 'can_assign_roles',
  VIEW_USERS: 'can_view_users',

  // System permissions
  ACCESS_ADMIN_PANEL: 'can_access_admin_panel',
  MANAGE_CONFIGURATION: 'can_manage_configuration',
  VIEW_LOGS: 'can_view_logs',
  MANAGE_JOBS: 'can_manage_jobs',

  // Basic permissions
  VIEW_LISTINGS: 'can_view_listings',
  SUBMIT_PROPERTIES: 'can_submit_properties',
  APPROVE_PRICING: 'can_approve_pricing',
  VIEW_OWN_PROPERTIES: 'can_view_own_properties'
} as const