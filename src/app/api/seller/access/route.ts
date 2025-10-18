/**
 * API Route: Seller Portal Access
 * Handles secure token validation and session creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { SellerAuthManager } from '@/lib/seller-auth'
import { SellerNotificationService } from '@/lib/seller-notification-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token is required' },
        { status: 400 }
      )
    }

    // Extract client information
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Validate secure token and create session
    const result = await SellerAuthManager.validateSecureToken(
      token,
      ipAddress,
      userAgent
    )

    if (!result.success || !result.session) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.error || 'Invalid or expired access token' 
        },
        { status: 401 }
      )
    }

    // Track notification engagement if this is from a notification link
    const referer = request.headers.get('referer')
    if (referer && referer.includes('notification')) {
      // Extract notification ID from referer if available
      const notificationMatch = referer.match(/notification[_-]?id=([^&]+)/)
      if (notificationMatch) {
        await SellerNotificationService.trackEngagement(
          notificationMatch[1],
          'clicked',
          { ip_address: ipAddress, user_agent: userAgent }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        session: result.session,
        message: 'Access granted successfully'
      }
    })

  } catch (error) {
    console.error('Error validating seller access:', error)
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
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')

    if (!token) {
      return NextResponse.redirect(new URL('/seller/error?message=missing-token', request.url))
    }

    // Extract client information
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Validate secure token
    const result = await SellerAuthManager.validateSecureToken(
      token,
      ipAddress,
      userAgent
    )

    if (!result.success || !result.session) {
      return NextResponse.redirect(
        new URL(`/seller/error?message=${encodeURIComponent(result.error || 'invalid-token')}`, request.url)
      )
    }

    // Track notification opened if this is from an email link
    const referer = request.headers.get('referer')
    if (referer && referer.includes('email')) {
      // In a real implementation, you'd extract the notification ID
      // For now, we'll track it as a generic email open
      console.log('Email notification accessed')
    }

    // Redirect to appropriate seller portal page based on link type
    let redirectPath = '/seller/dashboard'
    
    switch (type) {
      case 'pricing_approval':
        redirectPath = '/seller/pricing'
        break
      case 'document_review':
        redirectPath = '/seller/documents'
        break
      case 'feedback_request':
        redirectPath = '/seller/feedback'
        break
      default:
        redirectPath = '/seller/dashboard'
    }

    // Create the redirect URL with session token
    const redirectUrl = new URL(redirectPath, request.url)
    redirectUrl.searchParams.set('session_token', result.session.access_token)
    
    if (result.session.properties.length === 1) {
      redirectUrl.searchParams.set('property_id', result.session.properties[0].id)
    }

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Error handling seller access:', error)
    return NextResponse.redirect(
      new URL('/seller/error?message=system-error', request.url)
    )
  }
}