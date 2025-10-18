/**
 * API Route: Seller Property Feedback
 * Handles feedback submission from sellers
 */

import { NextRequest, NextResponse } from 'next/server'
import { SellerAuthManager } from '@/lib/seller-auth'
import { DataGovernanceManager } from '@/lib/data-governance'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{
    propertyId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')
    const body = await request.json()

    // Validate seller session
    const sessionResult = await SellerAuthManager.validateSellerSession(sessionToken)
    if (!sessionResult.success || !sessionResult.sellerId) {
      return NextResponse.json(
        { success: false, message: sessionResult.error || 'Invalid session' },
        { status: 401 }
      )
    }

    // Check seller access for feedback
    const accessCheck = await SellerAuthManager.checkSellerAccess(
      sessionResult.sellerId,
      propertyId,
      'provide_feedback'
    )

    if (!accessCheck.can_provide_feedback) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Cannot provide feedback at this time',
          restrictions: accessCheck.restrictions
        },
        { status: 403 }
      )
    }

    const {
      feedback_type,
      subject,
      content,
      rating,
      context_data = {},
      requested_response = false,
      category,
      tags = []
    } = body

    // Validate required fields
    if (!feedback_type || !content) {
      return NextResponse.json(
        { success: false, message: 'feedback_type and content are required' },
        { status: 400 }
      )
    }

    // Validate feedback type
    const validTypes = ['pricing_feedback', 'service_feedback', 'process_feedback', 'general_feedback']
    if (!validTypes.includes(feedback_type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Get property information
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, seller_id')
      .eq('id', propertyId)
      .eq('seller_id', sessionResult.sellerId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      )
    }

    // Analyze sentiment (basic implementation)
    const sentiment_score = analyzeSentiment(content)

    // Determine category if not provided
    const determined_category = category || categorizeFeedback(feedback_type, content, tags)

    // Create feedback record
    const { data: feedback, error: feedbackError } = await supabase
      .from('seller_feedback')
      .insert({
        seller_id: sessionResult.sellerId,
        property_id: propertyId,
        feedback_type,
        subject,
        content,
        rating,
        context_data,
        requested_response,
        category: determined_category,
        tags,
        sentiment_score,
        requires_follow_up: requested_response || rating <= 2 || sentiment_score < -0.3
      })
      .select()
      .single()

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { success: false, message: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    // Create property interaction record
    await supabase
      .from('seller_property_interactions')
      .insert({
        seller_id: sessionResult.sellerId,
        property_id: propertyId,
        interaction_type: 'feedback_provided',
        interaction_data: {
          feedback_id: feedback.id,
          feedback_type,
          rating,
          sentiment_score,
          tags
        },
        requires_follow_up: feedback.requires_follow_up,
        follow_up_type: requested_response ? 'response_requested' : 'none'
      })

    // Notify admin team if high priority
    if (feedback.requires_follow_up || rating <= 2) {
      await notifyAdminTeam(feedback.id, property.address, feedback_type, {
        seller_id: sessionResult.sellerId,
        rating,
        sentiment_score,
        requested_response
      })
    }

    // Log the activity
    await DataGovernanceManager.logActivity({
      userId: sessionResult.sellerId,
      action: 'seller_feedback_submitted',
      tableName: 'seller_feedback',
      recordId: feedback.id,
      details: JSON.stringify({
        property_id: propertyId,
        feedback_type,
        rating,
        sentiment_score,
        requires_follow_up: feedback.requires_follow_up
      })
    })

    // Prepare response
    let responseMessage = 'Thank you for your feedback!'
    let nextSteps: string[] = []

    if (requested_response) {
      responseMessage += ' We\'ll respond within 24 hours.'
      nextSteps.push('Our team will review your feedback')
      nextSteps.push('You\'ll receive a response within 24 hours')
    }

    if (rating && rating <= 2) {
      nextSteps.push('Our management team will be notified')
      nextSteps.push('We may contact you to discuss your experience')
    }

    if (feedback_type === 'pricing_feedback') {
      nextSteps.push('Your pricing feedback will be reviewed by our analysts')
    }

    if (nextSteps.length === 0) {
      nextSteps.push('Your feedback helps us improve our service')
      nextSteps.push('Thank you for taking the time to share your thoughts')
    }

    return NextResponse.json({
      success: true,
      data: {
        feedback_id: feedback.id,
        message: responseMessage,
        next_steps: nextSteps,
        requires_follow_up: feedback.requires_follow_up,
        sentiment_analysis: {
          score: sentiment_score,
          classification: sentiment_score > 0.1 ? 'positive' : sentiment_score < -0.1 ? 'negative' : 'neutral'
        }
      }
    })

  } catch (error) {
    console.error('Error submitting seller feedback:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')

    // Validate seller session
    const sessionResult = await SellerAuthManager.validateSellerSession(sessionToken)
    if (!sessionResult.success || !sessionResult.sellerId) {
      return NextResponse.json(
        { success: false, message: sessionResult.error || 'Invalid session' },
        { status: 401 }
      )
    }

    // Get seller's feedback for this property
    const { data: feedback, error: feedbackError } = await supabase
      .from('seller_feedback')
      .select(`
        id,
        feedback_type,
        subject,
        content,
        rating,
        category,
        tags,
        sentiment_score,
        requested_response,
        response_provided,
        response_provided_at,
        created_at
      `)
      .eq('seller_id', sessionResult.sellerId)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (feedbackError) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: feedback || []
    })

  } catch (error) {
    console.error('Error fetching seller feedback:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * Basic sentiment analysis
 */
function analyzeSentiment(text: string): number {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'fantastic', 'wonderful', 'perfect', 'satisfied', 
    'happy', 'pleased', 'impressed', 'professional', 'helpful', 'quick', 'fast', 'fair', 'reasonable'
  ]
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrated', 'angry', 'upset',
    'slow', 'unprofessional', 'unhelpful', 'confusing', 'complicated', 'unfair', 'unreasonable', 'low'
  ]

  const words = text.toLowerCase().split(/\W+/)
  let score = 0

  words.forEach(word => {
    if (positiveWords.includes(word)) score += 0.1
    if (negativeWords.includes(word)) score -= 0.1
  })

  // Normalize score between -1 and 1
  return Math.max(-1, Math.min(1, score))
}

/**
 * Categorize feedback based on type and content
 */
function categorizeFeedback(type: string, content: string, tags: string[]): string {
  const lowerContent = content.toLowerCase()

  if (type === 'pricing_feedback') {
    if (lowerContent.includes('too low') || lowerContent.includes('low offer') || tags.includes('offer_too_low')) {
      return 'low_offer_concern'
    }
    if (lowerContent.includes('too high') || tags.includes('offer_too_high')) {
      return 'high_offer_surprise'
    }
    if (lowerContent.includes('fair') || lowerContent.includes('reasonable') || tags.includes('offer_fair')) {
      return 'offer_acceptance'
    }
    return 'pricing_inquiry'
  }

  if (type === 'service_feedback') {
    if (lowerContent.includes('excellent') || lowerContent.includes('great') || tags.includes('excellent_service')) {
      return 'positive_service'
    }
    if (lowerContent.includes('slow') || lowerContent.includes('delayed') || tags.includes('needs_improvement')) {
      return 'service_improvement'
    }
    return 'service_general'
  }

  if (type === 'process_feedback') {
    if (lowerContent.includes('confusing') || lowerContent.includes('complicated') || tags.includes('confusing')) {
      return 'process_confusion'
    }
    if (lowerContent.includes('easy') || lowerContent.includes('simple') || tags.includes('easy_to_use')) {
      return 'process_positive'
    }
    return 'process_general'
  }

  return 'general'
}

/**
 * Notify admin team of important feedback
 */
async function notifyAdminTeam(
  feedbackId: string,
  propertyAddress: string,
  feedbackType: string,
  context: any
): Promise<void> {
  try {
    // Get admin users who should be notified
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        auth.users!inner (
          email
        ),
        roles!inner (
          name
        )
      `)
      .in('roles.name', ['admin', 'support', 'customer_success'])
      .eq('is_active', true)

    if (!adminUsers || adminUsers.length === 0) return

    // Log notification (in a real system, you'd send actual notifications)
    console.log(`Admin team notified of ${feedbackType} for ${propertyAddress}`, {
      feedback_id: feedbackId,
      context
    })

  } catch (error) {
    console.error('Error notifying admin team:', error)
  }
}