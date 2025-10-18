import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { RBACManager, PERMISSIONS } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * RBAC Permissions Management API
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user has permission to view permissions
    const hasPermission = await RBACManager.hasPermission(
      user.id,
      PERMISSIONS.MANAGE_USERS
    )

    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to view permissions'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    if (action === 'user-permissions' && userId) {
      // Get specific user's permissions
      const userPermissions = await RBACManager.getUserPermissions(userId)
      return NextResponse.json({
        success: true,
        data: userPermissions
      })
    }

    // Get all permissions
    const permissions = await RBACManager.getAllPermissions()
    
    // Group permissions by resource type
    const groupedPermissions = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource_type]) {
        acc[perm.resource_type] = []
      }
      acc[perm.resource_type].push(perm)
      return acc
    }, {} as Record<string, typeof permissions>)

    return NextResponse.json({
      success: true,
      data: {
        permissions,
        groupedPermissions,
        totalCount: permissions.length
      }
    })

  } catch (error) {
    console.error('RBAC permissions API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process permissions request'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user has permission to manage permissions
    const hasPermission = await RBACManager.hasPermission(
      user.id,
      PERMISSIONS.MANAGE_USERS
    )

    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to manage permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, permissionId, granted, reason, expiresAt, resourceType, resourceId, permissionName } = body

    switch (action) {
      case 'grant-permission':
        if (!userId || !permissionId) {
          return NextResponse.json({
            success: false,
            message: 'User ID and permission ID are required'
          }, { status: 400 })
        }

        const grantResult = await RBACManager.grantPermission(
          userId,
          permissionId,
          user.id,
          reason,
          expiresAt
        )

        if (!grantResult.success) {
          return NextResponse.json({
            success: false,
            message: grantResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Permission granted successfully'
        })

      case 'deny-permission':
        if (!userId || !permissionId) {
          return NextResponse.json({
            success: false,
            message: 'User ID and permission ID are required'
          }, { status: 400 })
        }

        const denyResult = await RBACManager.denyPermission(
          userId,
          permissionId,
          user.id,
          reason,
          expiresAt
        )

        if (!denyResult.success) {
          return NextResponse.json({
            success: false,
            message: denyResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Permission denied successfully'
        })

      case 'grant-resource-permission':
        if (!userId || !resourceType || !resourceId || !permissionName) {
          return NextResponse.json({
            success: false,
            message: 'User ID, resource type, resource ID, and permission name are required'
          }, { status: 400 })
        }

        const resourceResult = await RBACManager.grantResourcePermission(
          userId,
          resourceType,
          resourceId,
          permissionName,
          user.id,
          expiresAt
        )

        if (!resourceResult.success) {
          return NextResponse.json({
            success: false,
            message: resourceResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Resource permission granted successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('RBAC permissions management error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to manage permissions'
    }, { status: 500 })
  }
}