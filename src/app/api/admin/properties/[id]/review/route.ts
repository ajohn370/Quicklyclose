import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Property Review API
 * Handles admin review decisions for property submissions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated admin
    const admin = await getAuthenticatedAdmin(request)
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 })
    }

    const { action, notes } = await request.json()
    const { id: propertyId } = await params

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      }, { status: 400 })
    }

    // Update property status based on action
    const newStatus = action === 'approve' ? 'analysis_completed' : 'rejected'
    
    const { data: property, error: updateError } = await supabase
      .from('properties')
      .update({
        current_state: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating property status:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to update property status'
      }, { status: 500 })
    }

    // Log the state transition
    const { error: transitionError } = await supabase
      .from('state_transitions')
      .insert({
        property_id: propertyId,
        previous_state: 'submitted', // Assuming submitted was the previous state
        new_state: newStatus,
        triggered_by: admin.adminProfile.id,
        reason: `Admin ${action} - ${notes || 'No notes provided'}`,
        created_at: new Date().toISOString()
      })

    if (transitionError) {
      console.error('Error logging state transition:', transitionError)
      // Don't fail the request for logging errors
    }

    // Log admin activity
    const { error: activityError } = await supabase
      .from('admin_activities')
      .insert({
        admin_id: admin.adminProfile.id,
        action: `property_${action}`,
        resource_type: 'property',
        resource_id: propertyId,
        details: {
          property_address: property.address,
          notes: notes,
          action: action
        },
        created_at: new Date().toISOString()
      })

    if (activityError) {
      console.error('Error logging admin activity:', activityError)
      // Don't fail the request for logging errors
    }

    return NextResponse.json({
      success: true,
      data: {
        propertyId,
        newStatus,
        action,
        notes
      },
      message: `Property ${action}d successfully`
    })

  } catch (error) {
    console.error('Property review API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process review request'
    }, { status: 500 })
  }
}