import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { searchParams } = request.nextUrl
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json({
        success: false,
        message: 'Conversation ID is required'
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verify user is part of conversation
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .single()

    if (!conversation) {
      return NextResponse.json({
        success: false,
        message: 'Conversation not found or access denied'
      }, { status: 403 })
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:auth.users!sender_id(id, email)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      throw error
    }

    // Mark messages as read
    await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      data: messages
    })

  } catch (error) {
    console.error('Error in messages API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch messages'
    }, { status: 500 })
  }
}

// POST send a message
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { conversationId, recipientId, message, propertyId } = await request.json()
    
    if (!conversationId || !recipientId || !message) {
      return NextResponse.json({
        success: false,
        message: 'Conversation ID, recipient ID, and message are required'
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verify user is part of conversation
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .single()

    if (!conversation) {
      return NextResponse.json({
        success: false,
        message: 'Conversation not found or access denied'
      }, { status: 403 })
    }

    // Get sender and recipient roles
    const senderRole = conversation.participant_1_id === user.id 
      ? conversation.participant_1_role 
      : conversation.participant_2_role
    
    const recipientRole = conversation.participant_1_id === user.id 
      ? conversation.participant_2_role 
      : conversation.participant_1_role

    // Insert message
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_role: senderRole,
        recipient_id: recipientId,
        recipient_role: recipientRole,
        message: message,
        property_id: propertyId || conversation.property_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }

    // Update conversation's last message time
    await supabase
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({
      success: true,
      data: newMessage
    })

  } catch (error) {
    console.error('Error in send message API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to send message'
    }, { status: 500 })
  }
}