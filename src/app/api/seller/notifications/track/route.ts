/**
 * API Route: Track Seller Notification Engagement
 * Handles tracking when sellers open/click notification links
 */

import { NextRequest, NextResponse } from 'next/server'
import { SellerNotificationService } from '@/lib/seller-notification-service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      notification_id,
      event_type,
      metadata = {}
    } = body

    // Validate required fields
    if (!notification_id || !event_type) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: notification_id, event_type' 
        },
        { status: 400 }
      )
    }

    // Validate event type
    if (!['opened', 'clicked'].includes(event_type)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid event type. Must be "opened" or "clicked"' 
        },
        { status: 400 }
      )
    }

    // Extract client information from request
    const clientInfo = {
      ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      referer: request.headers.get('referer'),
      timestamp: new Date().toISOString(),
      ...metadata
    }

    // Track the engagement
    await SellerNotificationService.trackEngagement(
      notification_id,
      event_type,
      clientInfo
    )

    return NextResponse.json({
      success: true,
      data: {
        message: 'Engagement tracked successfully',
        event_type,
        timestamp: clientInfo.timestamp
      }
    })

  } catch (error) {
    console.error('Error tracking notification engagement:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required parameters: start_date, end_date' 
        },
        { status: 400 }
      )
    }

    // Get delivery analytics
    const analytics = await SellerNotificationService.getDeliveryAnalytics(
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        period: {
          start_date: startDate,
          end_date: endDate
        }
      }
    })

  } catch (error) {
    console.error('Error fetching notification analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}