import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { getAuthenticatedAdmin, createAdminAuthErrorResponse } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required to view analyses')
    }

    const { searchParams } = new URL(request.url)
    const adminView = searchParams.get('admin') === 'true'
    const status = searchParams.get('status') || 'completed'
    
    // Check if user is admin for admin view
    const admin = await getAuthenticatedAdmin(request)
    const isAdmin = !!admin
    
    let query = supabase
      .from('comp_vision_analyses')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    // If not admin view, only show approved analyses
    if (!adminView || !isAdmin) {
      query = query.eq('admin_approved', true)
    }

    // If admin view, show all analyses
    if (adminView && isAdmin) {
      query = query.order('admin_approved', { ascending: true })
    }

    const { data: analyses, error } = await query

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch analyses'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: analyses || [],
      message: 'Analyses retrieved successfully'
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch analyses'
    }, { status: 500 })
  }
}

// PUT endpoint for admin to approve/update analyses
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user is admin via admin profiles
    const admin = await getAuthenticatedAdmin(request)
    if (!admin) {
      return createAdminAuthErrorResponse('Admin access required')
    }

    const { analysisId, admin_approved, admin_notes, seller_visible_notes } = await request.json()

    if (!analysisId) {
      return NextResponse.json({
        success: false,
        message: 'Missing analysis ID'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('comp_vision_analyses')
      .update({
        admin_approved: admin_approved,
        admin_notes: admin_notes,
        seller_visible_notes: seller_visible_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .select()
      .single()

    if (error) {
      console.error('Error updating analysis:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to update analysis'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Analysis updated successfully'
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to update analysis'
    }, { status: 500 })
  }
}
