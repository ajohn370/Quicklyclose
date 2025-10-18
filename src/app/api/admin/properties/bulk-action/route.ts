import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-rbac'
import { PropertyStateMachine } from '@/lib/property-state-machine'
import { JobQueueManager } from '@/lib/job-queue-mock'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Bulk Property Actions API
 * Handles bulk operations on multiple properties
 */
export async function POST(request: NextRequest) {
  try {
    const { user, hasPermission, error } = await requirePermission(request, 'properties.state.transition')
    
    if (!user || !hasPermission) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const body = await request.json()
    const { action, propertyIds, reason } = body

    if (!action || !propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Action and propertyIds array are required'
      }, { status: 400 })
    }

    // Validate property IDs and get current states
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, current_state, address')
      .in('id', propertyIds)

    if (fetchError || !properties) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch properties'
      }, { status: 400 })
    }

    if (properties.length !== propertyIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Some property IDs are invalid'
      }, { status: 400 })
    }

    const results = []
    const jobsToQueue = []

    // Process each property based on the action
    for (const property of properties) {
      try {
        let targetState: string | null = null
        let shouldQueue = false

        switch (action) {
          case 'approve':
            // Move from submitted to under_review, or from analysis_completed to pricing_review
            if (property.current_state === 'submitted') {
              targetState = 'under_review'
            } else if (property.current_state === 'analysis_completed') {
              targetState = 'pricing_review'
            } else if (property.current_state === 'pricing_review') {
              targetState = 'pricing_approved'
            }
            break

          case 'reject':
            // Move to cancelled state
            targetState = 'cancelled'
            break

          case 'analyze':
            // Move to analysis_pending and queue analysis job
            if (['submitted', 'under_review'].includes(property.current_state)) {
              targetState = 'analysis_pending'
              shouldQueue = true
            }
            break

          case 'archive':
            // Move to archived state
            targetState = 'archived'
            break

          default:
            results.push({
              propertyId: property.id,
              address: property.address,
              success: false,
              error: 'Unknown action'
            })
            continue
        }

        if (!targetState) {
          results.push({
            propertyId: property.id,
            address: property.address,
            success: false,
            error: `Cannot perform ${action} from current state: ${property.current_state}`
          })
          continue
        }

        // Validate transition is allowed
        const validStates = PropertyStateMachine.getValidNextStates(property.current_state, 'admin' as const)
        if (!validStates.includes(targetState as any)) {
          results.push({
            propertyId: property.id,
            address: property.address,
            success: false,
            error: `Transition to ${targetState} not allowed from ${property.current_state}`
          })
          continue
        }

        // Execute state transition
        const transitionResult = await PropertyStateMachine.transitionState(
          property.id,
          targetState as any,
          {
            triggeredBy: 'admin' as const,
            reason: reason || `Bulk action: ${action}`,
            data: {
              bulk_action: true,
              action_type: action,
              admin_id: user.id
            }
          }
        )

        if (transitionResult.success) {
          results.push({
            propertyId: property.id,
            address: property.address,
            success: true,
            newState: targetState
          })

          // Queue analysis job if needed
          if (shouldQueue) {
            jobsToQueue.push({
              propertyId: property.id,
              priority: 'normal'
            })
          }
        } else {
          results.push({
            propertyId: property.id,
            address: property.address,
            success: false,
            error: transitionResult.error || 'State transition failed'
          })
        }

      } catch (error) {
        results.push({
          propertyId: property.id,
          address: property.address,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Queue analysis jobs if any
    for (const job of jobsToQueue) {
      try {
        await JobQueueManager.addJob('analysis', 'analyze_property', {
          propertyId: job.propertyId,
          sellerId: '', // TODO: Get from property data
          imageUrl: '', // TODO: Get from property data  
          address: {
            street: '',
            city: '',
            state: '',
            zip: ''
          },
          userId: user.id,
          requestId: `bulk_analysis_${Date.now()}`
        })
      } catch (error) {
        console.error(`Failed to queue analysis job for property ${job.propertyId}:`, error)
      }
    }

    // Log bulk action
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: user.id,
          action: 'BULK_PROPERTY_ACTION',
          resource_type: 'property',
          resource_id: propertyIds.join(','),
          metadata: {
            action,
            reason,
            property_count: propertyIds.length,
            success_count: results.filter(r => r.success).length,
            results: results.map(r => ({
              propertyId: r.propertyId,
              success: r.success,
              error: r.error
            }))
          }
        })
    } catch (error) {
      console.error('Failed to log bulk action:', error)
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: failureCount === 0,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          action
        }
      },
      message: `Bulk ${action} completed: ${successCount} successful, ${failureCount} failed`
    })

  } catch (error) {
    console.error('Bulk property action error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to execute bulk action'
    }, { status: 500 })
  }
}
