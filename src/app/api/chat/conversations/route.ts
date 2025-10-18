import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET conversations for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const supabase = await createClient()
    
    // Get user's conversations
    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        participant_1:auth.users!participant_1_id(id, email),
        participant_2:auth.users!participant_2_id(id, email),
        property:properties(id, address, city, state),
        last_message:chat_messages(
          message,
          created_at,
          sender_id,
          is_read
        )
      `)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    // Get unread counts
    const conversationIds = conversations?.map((c: any) => c.id) || []
    const { data: unreadCounts } = await supabase
      .from('chat_messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    const unreadByConversation = unreadCounts?.reduce((acc, msg) => {
      acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Transform conversations
    const transformedConversations = conversations?.map((conv: any) => {
      const otherParticipant = conv.participant_1_id === user.id 
        ? conv.participant_2 
        : conv.participant_1
      
      const otherRole = conv.participant_1_id === user.id 
        ? conv.participant_2_role 
        : conv.participant_1_role

      return {
        id: conv.id,
        otherParticipant: {
          id: otherParticipant.id,
          email: otherParticipant.email,
          role: otherRole
        },
        property: conv.property,
        lastMessage: conv.last_message?.[0] || null,
        unreadCount: unreadByConversation[conv.id] || 0,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedConversations
    })

  } catch (error) {
    console.error('Error in conversations API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch conversations'
    }, { status: 500 })
  }
}

// POST create new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { recipientId, recipientRole, propertyId } = await request.json()
    
    if (!recipientId || !recipientRole) {
      return NextResponse.json({
        success: false,
        message: 'Recipient ID and role are required'
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get current user's role
    const userRole = user.user_metadata?.role || 'investor'

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from('chat_conversations')
      .select('id')
      .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${recipientId}),and(participant_1_id.eq.${recipientId},participant_2_id.eq.${user.id})`)
      .eq('property_id', propertyId || null)
      .single()

    if (existingConv) {
      return NextResponse.json({
        success: true,
        data: existingConv
      })
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('chat_conversations')
      .insert({
        participant_1_id: user.id,
        participant_1_role: userRole,
        participant_2_id: recipientId,
        participant_2_role: recipientRole,
        property_id: propertyId || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: newConv
    })

  } catch (error) {
    console.error('Error in create conversation API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create conversation'
    }, { status: 500 })
  }
}