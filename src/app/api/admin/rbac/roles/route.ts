import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { RBACManager, PERMISSIONS } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * RBAC Roles Management API
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user has permission to view roles
    const hasPermission = await RBACManager.hasPermission(
      user.id,
      PERMISSIONS.VIEW_USERS
    )

    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to view roles'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (userId) {
      // Get specific user's roles
      const userRoles = await RBACManager.getUserRoles(userId)
      return NextResponse.json({
        success: true,
        data: userRoles
      })
    }

    // Get all roles
    const roles = await RBACManager.getAllRoles()

    return NextResponse.json({
      success: true,
      data: {
        roles,
        totalCount: roles.length
      }
    })

  } catch (error) {
    console.error('RBAC roles API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process roles request'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user has permission to manage roles
    const hasPermission = await RBACManager.hasPermission(
      user.id,
      PERMISSIONS.ASSIGN_ROLES
    )

    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions to manage roles'
      }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, roleId, expiresAt, name, displayName, description, hierarchyLevel, permissionIds } = body

    switch (action) {
      case 'assign-role':
        if (!userId || !roleId) {
          return NextResponse.json({
            success: false,
            message: 'User ID and role ID are required'
          }, { status: 400 })
        }

        const assignResult = await RBACManager.assignRole(
          userId,
          roleId,
          user.id,
          expiresAt
        )

        if (!assignResult.success) {
          return NextResponse.json({
            success: false,
            message: assignResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Role assigned successfully'
        })

      case 'remove-role':
        if (!userId || !roleId) {
          return NextResponse.json({
            success: false,
            message: 'User ID and role ID are required'
          }, { status: 400 })
        }

        const removeResult = await RBACManager.removeRole(userId, roleId)

        if (!removeResult.success) {
          return NextResponse.json({
            success: false,
            message: removeResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Role removed successfully'
        })

      case 'create-role':
        if (!name || !displayName || !description || hierarchyLevel === undefined || !permissionIds) {
          return NextResponse.json({
            success: false,
            message: 'Name, display name, description, hierarchy level, and permissions are required'
          }, { status: 400 })
        }

        const createResult = await RBACManager.createRole(
          name,
          displayName,
          description,
          hierarchyLevel,
          permissionIds
        )

        if (!createResult.success) {
          return NextResponse.json({
            success: false,
            message: createResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          data: { roleId: createResult.roleId },
          message: 'Role created successfully'
        })

      case 'update-role-permissions':
        if (!roleId || !permissionIds) {
          return NextResponse.json({
            success: false,
            message: 'Role ID and permission IDs are required'
          }, { status: 400 })
        }

        const updateResult = await RBACManager.updateRolePermissions(roleId, permissionIds)

        if (!updateResult.success) {
          return NextResponse.json({
            success: false,
            message: updateResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Role permissions updated successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('RBAC roles management error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to manage roles'
    }, { status: 500 })
  }
}