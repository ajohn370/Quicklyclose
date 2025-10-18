import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth'
import { getAuthenticatedAdmin, AdminRole } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Use service role client to bypass RLS when checking if any admins exist
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )
    
    // Check if any admins exist
    const { count: adminCount, error: countError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (countError) {
      console.error('Error checking admin count:', countError)
      return NextResponse.json({
        success: false,
        message: 'Failed to check admin users',
        error: countError.message
      }, { status: 500 })
    }

    const adminExists = (adminCount || 0) > 0

    // If no admins exist, allow anyone to see this (for initial setup)
    if (!adminExists) {
      return NextResponse.json({
        success: true,
        data: {
          adminExists: false,
          admins: [],
          canCreateAdmin: true
        }
      })
    }

    // If admins exist, require admin authentication
    const admin = await getAuthenticatedAdmin(request)
    
    // Debug logging
    console.log('Admin check result:', {
      adminExists,
      adminCount,
      hasAdmin: !!admin,
      adminId: admin?.adminProfile?.id
    })
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Admin authentication required',
        data: {
          adminExists: true,
          canCreateAdmin: false
        }
      }, { status: 403 })
    }

    // Get all admin users for authorized admin  
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select(`
        id,
        user_id,
        full_name,
        role,
        department,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (adminError) {
      console.error('Error fetching admins:', adminError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch admin users',
        error: adminError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        adminExists: true,
        admins: admins || [],
        canCreateAdmin: admin.adminProfile.role === 'super_admin'
      }
    })

  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, role = 'admin', department = 'Administration' } = body

    if (!email || !fullName) {
      return NextResponse.json({
        success: false,
        message: 'Email and full name are required'
      }, { status: 400 })
    }

    // Use service role client to bypass RLS when checking if any admins exist
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )
    
    // Check if any admins exist
    const { count: adminCount, error: countError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (countError) {
      console.error('Error checking admin count:', countError)
      return NextResponse.json({
        success: false,
        message: 'Failed to check admin users',
        error: countError.message
      }, { status: 500 })
    }

    const adminExists = (adminCount || 0) > 0

    // If admins exist, require authentication and proper role
    if (adminExists) {
      const admin = await getAuthenticatedAdmin(request)
      if (!admin) {
        return NextResponse.json({
          success: false,
          message: 'Admin authentication required'
        }, { status: 403 })
      }

      // Only super_admin can create other admins
      if (admin.adminProfile.role !== 'super_admin') {
        return NextResponse.json({
          success: false,
          message: 'Only super administrators can create admin users'
        }, { status: 403 })
      }
    }

    // First check if user already exists
    const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (searchError) {
      console.error('Error searching for user:', searchError)
      return NextResponse.json({
        success: false,
        message: 'Failed to check existing users',
        error: searchError.message
      }, { status: 500 })
    }

    let userId: string
    let isExistingUser = false
    
    // Find if user already exists
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    
    if (existingUser) {
      // User already exists - update their metadata to include admin role
      isExistingUser = true
      userId = existingUser.id
      
      // Check if they already have an admin profile
      const { data: existingAdmin } = await supabaseAdmin
        .from('admin_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      if (existingAdmin) {
        return NextResponse.json({
          success: false,
          message: 'This user is already an administrator'
        }, { status: 400 })
      }
      
      // Update user metadata to include admin role
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          role: 'admin',
          full_name: fullName || existingUser.user_metadata?.full_name
        }
      })
      
      if (updateError) {
        console.error('Error updating user metadata:', updateError)
        return NextResponse.json({
          success: false,
          message: 'Failed to update user role',
          error: updateError.message
        }, { status: 400 })
      }
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12), // Temporary password
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          role: 'admin'
        }
      })

      if (userError) {
        console.error('Error creating user:', userError)
        return NextResponse.json({
          success: false,
          message: 'Failed to create user account',
          error: userError.message
        }, { status: 400 })
      }

      if (!newUser.user) {
        return NextResponse.json({
          success: false,
          message: 'User creation failed - no user returned'
        }, { status: 500 })
      }
      
      userId = newUser.user.id
    }

    // Create admin profile
    const adminRole = role as AdminRole
    const permissions = {
      can_manage_users: adminRole === 'super_admin',
      can_manage_pricing: ['super_admin', 'admin'].includes(adminRole),
      can_view_all_data: ['super_admin', 'admin', 'analyst'].includes(adminRole),
      can_export_data: ['super_admin', 'admin'].includes(adminRole),
      can_manage_settings: adminRole === 'super_admin'
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        user_id: userId,
        full_name: fullName,
        role: adminRole,
        department,
        permissions,
        is_active: true
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating admin profile:', profileError)
      // Only try to clean up if we created a new user
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      
      return NextResponse.json({
        success: false,
        message: 'Failed to create admin profile',
        error: profileError.message
      }, { status: 500 })
    }

    // Send password reset email so they can set their password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/setup`
      }
    })

    if (resetError) {
      console.warn('Could not send setup email:', resetError.message)
    }

    // If this is the first admin, make them super_admin
    if (!adminExists && adminProfile) {
      await supabaseAdmin
        .from('admin_profiles')
        .update({ role: 'super_admin' })
        .eq('id', adminProfile.id)
    }

    const successMessage = isExistingUser 
      ? `User upgraded to admin successfully. ${resetError ? 'Manual setup required.' : 'Setup email sent.'}`
      : `Admin user created successfully. ${resetError ? 'Manual setup required.' : 'Setup email sent.'}`
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        adminProfile: {
          id: adminProfile.id,
          full_name: adminProfile.full_name,
          role: !adminExists ? 'super_admin' : adminProfile.role,
          email: email,
          department: adminProfile.department,
          created_at: adminProfile.created_at,
          was_existing_user: isExistingUser
        }
      }
    })

  } catch (error) {
    console.error('Create admin user error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}