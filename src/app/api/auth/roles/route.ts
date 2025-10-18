import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserWithRole, createAuthErrorResponse, Role } from '@/lib/auth-enhanced'

// GET /api/auth/roles - Get user's roles
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserWithRole(request)
    
    if (!user) {
      return createAuthErrorResponse()
    }

    return NextResponse.json({
      success: true,
      data: {
        activeRole: user.activeRole,
        availableRoles: user.availableRoles,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Get roles error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get user roles',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// POST /api/auth/roles - Add a new role
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserWithRole(request)
    
    if (!user) {
      return createAuthErrorResponse()
    }

    const body = await request.json()
    const { role, roleData } = body

    if (!role || !['seller', 'investor', 'admin'].includes(role)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid role specified',
        error: 'INVALID_ROLE'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Add the role
    const { error: roleError } = await supabase.rpc('add_user_role', {
      p_user_id: user.id,
      p_role: role
    })

    if (roleError) {
      console.error('Add role error:', roleError)
      return NextResponse.json({
        success: false,
        message: 'Failed to add role',
        error: 'DATABASE_ERROR'
      }, { status: 500 })
    }

    // Save role-specific data if provided
    if (roleData) {
      let dataError = null
      
      switch (role) {
        case 'seller':
          const { error: sellerError } = await supabase
            .from('seller_data')
            .upsert({
              user_id: user.id,
              company_name: roleData.companyName,
              license_number: roleData.licenseNumber,
              preferred_regions: roleData.preferredRegions ? 
                JSON.parse(roleData.preferredRegions) : []
            })
          dataError = sellerError
          break

        case 'investor':
          const { error: investorError } = await supabase
            .from('investor_data')
            .upsert({
              user_id: user.id,
              investment_range: {
                min: roleData.minInvestment,
                max: roleData.maxInvestment
              },
              property_preferences: roleData.propertyTypes ? 
                JSON.parse(roleData.propertyTypes) : {},
              accreditation_status: roleData.accreditationStatus
            })
          dataError = investorError
          break

        case 'admin':
          // Admin role requires approval, so we just store the request
          const { error: adminError } = await supabase
            .from('admin_data')
            .upsert({
              user_id: user.id,
              department: roleData.department,
              admin_level: 'support', // Default to lowest level
              permissions: {
                pending_approval: true,
                requested_at: new Date().toISOString(),
                reason: roleData.reason
              }
            })
          dataError = adminError
          break
      }

      if (dataError) {
        console.error('Role data error:', dataError)
        // Role was added but data save failed - not critical
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${role} role`,
      data: { role }
    })
  } catch (error) {
    console.error('Add role error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to add role',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// PUT /api/auth/roles - Switch active role
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserWithRole(request)
    
    if (!user) {
      return createAuthErrorResponse()
    }

    const body = await request.json()
    const { role } = body

    if (!role || !user.availableRoles.includes(role as Role)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or unavailable role',
        error: 'INVALID_ROLE'
      }, { status: 400 })
    }

    // Create new session context
    const supabase = await createClient()
    const sessionToken = crypto.randomUUID()
    
    const portalMap = {
      seller: 'seller_portal',
      investor: 'investor_portal',
      admin: 'admin_portal'
    }

    const expiryMinutes = role === 'seller' ? 120 : role === 'investor' ? 60 : 30
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        active_role: role,
        portal_context: portalMap[role],
        expires_at: expiresAt.toISOString()
      })

    if (error) {
      console.error('Session context error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to switch role',
        error: 'SESSION_ERROR'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Switched to ${role} role`,
      data: {
        role,
        sessionToken,
        expiresAt
      }
    })
  } catch (error) {
    console.error('Switch role error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to switch role',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// DELETE /api/auth/roles - Remove a role
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserWithRole(request)
    
    if (!user) {
      return createAuthErrorResponse()
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as Role

    if (!role || !user.availableRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or unavailable role',
        error: 'INVALID_ROLE'
      }, { status: 400 })
    }

    // Prevent removing last role
    if (user.availableRoles.length === 1) {
      return NextResponse.json({
        success: false,
        message: 'Cannot remove last role',
        error: 'LAST_ROLE'
      }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('role', role)

    if (error) {
      console.error('Remove role error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to remove role',
        error: 'DATABASE_ERROR'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${role} role`,
      data: { role }
    })
  } catch (error) {
    console.error('Remove role error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to remove role',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}