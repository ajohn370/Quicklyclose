import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from './auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminRole = 'super_admin' | 'admin' | 'analyst' | 'support'

export interface AdminProfile {
  id: string
  user_id: string
  full_name: string
  role: AdminRole
  permissions: Record<string, any>
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthenticatedAdmin {
  user: any
  adminProfile: AdminProfile
}

export async function getAuthenticatedAdmin(request: NextRequest): Promise<AuthenticatedAdmin | null> {
  try {
    const user = await getAuthenticatedUser(request)
    console.log('getAuthenticatedAdmin - user:', user?.id, user?.email)
    if (!user) return null
    
    // Use service role client to bypass RLS infinite recursion on admin_profiles
    const adminSupabase = createAdminClient()
    const { data: adminProfile, error } = await adminSupabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    console.log('getAuthenticatedAdmin - profile query result:', {
      hasProfile: !!adminProfile,
      error: error?.message,
      userId: user.id,
      profileId: adminProfile?.id
    })
    
    if (error || !adminProfile) {
      return null
    }
    
    return { user, adminProfile }
  } catch (error) {
    console.error('Admin auth error:', error)
    return null
  }
}

export function createAdminAuthErrorResponse(message: string = 'Admin authentication required') {
  return NextResponse.json({
    success: false,
    message,
    error: 'ADMIN_UNAUTHORIZED'
  }, { status: 403 })
}

export function requireAdminRole(allowedRoles: AdminRole[]) {
  return async (request: NextRequest): Promise<AuthenticatedAdmin> => {
    const admin = await getAuthenticatedAdmin(request)
    
    if (!admin) {
      throw new Error('Admin authentication required')
    }
    
    if (!allowedRoles.includes(admin.adminProfile.role)) {
      throw new Error(`Insufficient admin privileges. Required: ${allowedRoles.join(', ')}`)
    }
    
    return admin
  }
}

// Specific role checkers
export const requireSuperAdmin = requireAdminRole(['super_admin'])
export const requireAdminOrAbove = requireAdminRole(['super_admin', 'admin'])
export const requireAnyAdmin = requireAdminRole(['super_admin', 'admin', 'analyst', 'support'])

// Permission checker
export async function checkAdminPermission(request: NextRequest, permission: string): Promise<boolean> {
  const admin = await getAuthenticatedAdmin(request)
  if (!admin) return false
  
  // Super admin has all permissions
  if (admin.adminProfile.role === 'super_admin') return true
  
  // Check specific permissions
  return admin.adminProfile.permissions[permission] === true
}

// Activity logger
export async function logAdminActivity(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>,
  ipAddress?: string
) {
  try {
    const supabase = await createClient()
    
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        ip_address: ipAddress
      })
  } catch (error) {
    console.error('Failed to log admin activity:', error)
  }
}

// Get client IP for logging
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') ||
         'unknown'
}

// Admin session management
export async function createAdminSession(adminProfile: AdminProfile) {
  // Use admin client for updating admin_profiles to bypass RLS
  const adminSupabase = createAdminClient()
  
  // Update last login
  await adminSupabase
    .from('admin_profiles')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', adminProfile.id)
  
  // Log login activity
  await logAdminActivity(
    adminProfile.id,
    'LOGIN',
    'session',
    adminProfile.id,
    { role: adminProfile.role, department: adminProfile.department }
  )
}

// Check if user has admin privileges (for middleware)
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    // Use admin client to bypass RLS infinite recursion on admin_profiles
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    return !error && !!data
  } catch {
    return false
  }
}

// Get admin role hierarchy level (for permissions)
export function getAdminRoleLevel(role: AdminRole): number {
  const roleLevels = {
    'support': 1,
    'analyst': 2,
    'admin': 3,
    'super_admin': 4
  }
  return roleLevels[role] || 0
}

// Check if admin can perform action on target admin
export function canManageAdmin(actorRole: AdminRole, targetRole: AdminRole): boolean {
  return getAdminRoleLevel(actorRole) > getAdminRoleLevel(targetRole)
}
