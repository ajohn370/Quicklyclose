/**
 * Enhanced Authentication with RBAC Integration
 * Combines authentication with role-based access control
 */

import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { RBACManager, PERMISSIONS } from '@/lib/rbac'

export interface AuthenticatedUserWithRBAC {
  id: string
  email: string
  user_metadata: any
  permissions: string[]
  roles: string[]
  roleLevel: number
}

/**
 * Get authenticated user with RBAC information
 */
export async function getAuthenticatedUserWithRBAC(
  request: NextRequest
): Promise<AuthenticatedUserWithRBAC | null> {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return null

    // Get user's effective permissions
    const userPermissions = await RBACManager.getUserPermissions(user.id)
    const userRoles = await RBACManager.getUserRoles(user.id)
    const roleLevel = await RBACManager.getUserRoleLevel(user.id)

    return {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata || {},
      permissions: userPermissions.effectivePermissions,
      roles: userRoles.map(r => r.role?.name || '').filter(Boolean),
      roleLevel
    }
  } catch (error) {
    console.error('Error getting authenticated user with RBAC:', error)
    return null
  }
}

/**
 * Check if user has required permission
 */
export async function requirePermission(
  request: NextRequest,
  permission: string,
  resourceType?: string,
  resourceId?: string
): Promise<{ user: AuthenticatedUserWithRBAC | null; hasPermission: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUserWithRBAC(request)
    
    if (!user) {
      return { user: null, hasPermission: false, error: 'Authentication required' }
    }

    const hasPermission = await RBACManager.hasPermission(
      user.id,
      permission,
      resourceType,
      resourceId
    )

    return { user, hasPermission, error: hasPermission ? undefined : 'Insufficient permissions' }
  } catch (error) {
    return { 
      user: null, 
      hasPermission: false, 
      error: error instanceof Error ? error.message : 'Permission check failed' 
    }
  }
}

/**
 * Check if user has required role level
 */
export async function requireRoleLevel(
  request: NextRequest,
  minimumLevel: number
): Promise<{ user: AuthenticatedUserWithRBAC | null; hasAccess: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUserWithRBAC(request)
    
    if (!user) {
      return { user: null, hasAccess: false, error: 'Authentication required' }
    }

    const hasAccess = user.roleLevel >= minimumLevel

    return { 
      user, 
      hasAccess, 
      error: hasAccess ? undefined : `Minimum role level ${minimumLevel} required` 
    }
  } catch (error) {
    return { 
      user: null, 
      hasAccess: false, 
      error: error instanceof Error ? error.message : 'Role level check failed' 
    }
  }
}

/**
 * Middleware factory for API routes with RBAC
 */
export function withRBACAuth(permission: string, resourceType?: string) {
  return async function(
    request: NextRequest,
    handler: (user: AuthenticatedUserWithRBAC, ...args: any[]) => Promise<Response>,
    ...args: any[]
  ): Promise<Response> {
    const { user, hasPermission, error } = await requirePermission(
      request,
      permission,
      resourceType,
      // Extract resource ID from URL params if needed
      resourceType ? extractResourceId(request) : undefined
    )

    if (!user || !hasPermission) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error || 'Access denied'
        }),
        {
          status: user ? 403 : 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return handler(user, ...args)
  }
}

/**
 * Admin-only authentication check
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AuthenticatedUserWithRBAC | null; isAdmin: boolean; error?: string }> {
  const { user, hasPermission, error } = await requirePermission(
    request,
    PERMISSIONS.ACCESS_ADMIN_PANEL
  )

  return {
    user,
    isAdmin: hasPermission,
    error
  }
}

/**
 * Super admin authentication check
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ user: AuthenticatedUserWithRBAC | null; isSuperAdmin: boolean; error?: string }> {
  const { user, hasAccess, error } = await requireRoleLevel(request, 100)

  if (!user || !hasAccess) {
    return { user, isSuperAdmin: false, error }
  }

  // Double-check with permission
  const hasManageConfig = await RBACManager.hasPermission(
    user.id,
    PERMISSIONS.MANAGE_CONFIGURATION
  )

  return {
    user,
    isSuperAdmin: hasManageConfig,
    error: hasManageConfig ? undefined : 'Super admin access required'
  }
}

/**
 * Check if user can access specific property
 */
export async function canAccessProperty(
  userId: string,
  propertyId: string,
  action: 'read' | 'update' | 'delete' | 'approve' = 'read'
): Promise<boolean> {
  try {
    // Check general property permissions first
    const permissionMap = {
      read: PERMISSIONS.VIEW_LISTINGS,
      update: PERMISSIONS.MANAGE_PROPERTIES,
      delete: PERMISSIONS.MANAGE_PROPERTIES,
      approve: PERMISSIONS.APPROVE_PROPERTIES
    }

    const hasGeneralPermission = await RBACManager.hasPermission(
      userId,
      permissionMap[action]
    )

    if (hasGeneralPermission) {
      return true
    }

    // Check if user is the property owner (seller)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: property } = await supabase
      .from('properties')
      .select(`
        seller_profiles!inner(user_id)
      `)
      .eq('id', propertyId)
      .eq('seller_profiles.user_id', userId)
      .single()

    if (property) {
      // User owns this property, check owner permissions
      const ownerPermissionMap = {
        read: PERMISSIONS.VIEW_OWN_PROPERTIES,
        update: PERMISSIONS.VIEW_OWN_PROPERTIES,
        delete: PERMISSIONS.VIEW_OWN_PROPERTIES,
        approve: PERMISSIONS.APPROVE_PRICING
      }

      return await RBACManager.hasPermission(userId, ownerPermissionMap[action])
    }

    // Check resource-specific permissions
    return await RBACManager.hasPermission(
      userId,
      permissionMap[action],
      'property',
      propertyId
    )
  } catch (error) {
    console.error('Property access check error:', error)
    return false
  }
}

/**
 * Check if user can access specific analysis
 */
export async function canAccessAnalysis(
  userId: string,
  analysisId: string,
  action: 'read' | 'update' = 'read'
): Promise<boolean> {
  try {
    const permissionMap = {
      read: PERMISSIONS.VIEW_ANALYSIS,
      update: PERMISSIONS.OVERRIDE_ANALYSIS
    }

    return await RBACManager.hasPermission(
      userId,
      permissionMap[action],
      'analysis',
      analysisId
    )
  } catch (error) {
    console.error('Analysis access check error:', error)
    return false
  }
}

/**
 * Extract resource ID from URL parameters
 */
function extractResourceId(request: NextRequest): string | undefined {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  
  // Look for UUID pattern in path segments
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  for (const segment of pathSegments) {
    if (uuidPattern.test(segment)) {
      return segment
    }
  }
  
  return undefined
}

/**
 * Create RBAC error response
 */
export function createRBACErrorResponse(message: string, statusCode: number = 403) {
  return new Response(
    JSON.stringify({
      success: false,
      message,
      code: 'RBAC_ACCESS_DENIED'
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Permission checking decorators for TypeScript classes
 */
export function RequirePermission(permission: string, resourceType?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const userId = args[0]?.userId || this.userId
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
    }

    return descriptor
  }
}

/**
 * Role level checking decorator
 */
export function RequireRoleLevel(minimumLevel: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const userId = args[0]?.userId || this.userId

      if (!userId) {
        throw new Error('User ID required for role level check')
      }

      const userLevel = await RBACManager.getUserRoleLevel(userId)

      if (userLevel < minimumLevel) {
        throw new Error(`Access denied: minimum role level ${minimumLevel} required`)
      }

      return method.apply(this, args)
    }

    return descriptor
  }
}