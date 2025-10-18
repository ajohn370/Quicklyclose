/**
 * API Route: Send Seller Notifications
 * Handles sending notifications to sellers with secure access links
 */

import { NextRequest, NextResponse } from 'next/server'
import { SellerNotificationService, NotificationType } from '@/lib/seller-notification-service'
import { RBACManager } from '@/lib/rbac'
import { DataGovernanceManager } from '@/lib/data-governance'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    // Check permission to send seller notifications
    const hasPermission = await RBACManager.hasPermission(
      session.user.id,
      'seller.notifications.send'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      seller_id,
      property_id,
      notification_type,
      context = {},
      options = {}
    } = body

    // Validate required fields
    if (!seller_id || !property_id || !notification_type) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: seller_id, property_id, notification_type' 
        },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes: NotificationType[] = [
      'pricing_ready',
      'feedback_requested', 
      'status_update',
      'document_available',
      'bidding_started',
      'offer_accepted',
      'contract_ready'
    ]

    if (!validTypes.includes(notification_type)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Verify seller and property exist
    const [sellerCheck, propertyCheck] = await Promise.all([
      supabase
        .from('seller_profiles')
        .select('id, email, name')
        .eq('id', seller_id)
        .single(),
      supabase
        .from('properties')
        .select('id, address, seller_id')
        .eq('id', property_id)
        .single()
    ])

    if (!sellerCheck.data) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      )
    }

    if (!propertyCheck.data) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      )
    }

    // Verify property belongs to seller
    if (propertyCheck.data.seller_id !== seller_id) {
      return NextResponse.json(
        { success: false, message: 'Property does not belong to seller' },
        { status: 400 }
      )
    }

    // Send notification
    const result = await SellerNotificationService.sendNotification(
      seller_id,
      property_id,
      notification_type,
      context,
      options
    )

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.error || 'Failed to send notification' 
        },
        { status: 500 }
      )
    }

    // Log the action
    await DataGovernanceManager.logActivity({
      userId: session.user.id,
      action: 'seller_notification_sent',
      tableName: 'seller_notifications',
      recordId: result.notification_id,
      details: JSON.stringify({
        seller_id,
        property_id,
        notification_type,
        sent_by: session.user.id
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        notification_id: result.notification_id,
        message: 'Notification sent successfully'
      }
    })

  } catch (error) {
    console.error('Error sending seller notification:', error)
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

    // Check permission to view notifications
    const hasPermission = await RBACManager.hasPermission(
      session.user.id,
      'seller.notifications.send'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const sellerId = url.searchParams.get('seller_id')
    const propertyId = url.searchParams.get('property_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('seller_notifications')
      .select(`
        id,
        notification_type,
        subject,
        delivery_status,
        created_at,
        delivered_at,
        opened_at,
        clicked_at,
        seller_profiles!inner (
          id,
          name,
          email
        ),
        properties!inner (
          id,
          address
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sellerId) {
      query = query.eq('seller_id', sellerId)
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        limit,
        offset,
        total: notifications?.length || 0
      }
    })

  } catch (error) {
    console.error('Error fetching seller notifications:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}