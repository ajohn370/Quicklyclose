'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageCircle, 
  Send, 
  X, 
  Minimize2,
  Maximize2,
  User,
  Building2,
  Shield
} from 'lucide-react'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: string
  message: string
  created_at: string
  is_read: boolean
  sender?: {
    email: string
  }
}

interface Conversation {
  id: string
  otherParticipant: {
    id: string
    email: string
    role: string
  }
  property?: {
    id: string
    address: string
    city: string
    state: string
  }
  lastMessage: Message | null
  unreadCount: number
  lastMessageAt: string
}

export function ChatWidget() {
  const { user, userRole } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Load conversations when widget opens
  useEffect(() => {
    if (isOpen && user) {
      loadConversations()
    }
  }, [isOpen, user])

  // Calculate total unread
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    setTotalUnread(total)
  }, [conversations])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/chat/conversations')
      const result = await response.json()
      
      if (result.success) {
        setConversations(result.data || [])
      } else {
        setError('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`)
      const result = await response.json()
      
      if (result.success) {
        setMessages(result.data || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation)
    await loadMessages(conversation.id)
    
    // Update unread count locally
    setConversations(prev => prev.map(conv => 
      conv.id === conversation.id 
        ? { ...conv, unreadCount: 0 }
        : conv
    ))
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return

    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          recipientId: activeConversation.otherParticipant.id,
          message: newMessage.trim()
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessages(prev => [...prev, result.data])
        setNewMessage('')
        
        // Update last message in conversation list
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversation.id 
            ? { 
                ...conv, 
                lastMessage: result.data,
                lastMessageAt: result.data.created_at
              }
            : conv
        ))
      } else {
        setError('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const startNewConversation = async (recipientId: string, recipientRole: string, propertyId?: string) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          recipientRole,
          propertyId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        await loadConversations()
        const newConv = conversations.find(c => c.id === result.data.id)
        if (newConv) {
          selectConversation(newConv)
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      setError('Failed to start conversation')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'seller':
        return <User className="h-4 w-4" />
      case 'investor':
        return <Building2 className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'seller':
        return 'bg-blue-100 text-blue-800'
      case 'investor':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  if (!user) return null

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Card className={`fixed bottom-6 right-6 shadow-2xl z-50 transition-all ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
        }`}>
          {/* Header */}
          <CardHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Messages</CardTitle>
                {totalUnread > 0 && !isMinimized && (
                  <Badge variant="destructive" className="text-xs">
                    {totalUnread} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
              {!activeConversation ? (
                // Conversation List
                <ScrollArea className="flex-1 p-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No conversations yet</p>
                      {userRole !== 'admin' && (
                        <Button 
                          className="mt-4"
                          onClick={() => startNewConversation('admin-id', 'admin')}
                        >
                          Contact Admin
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getRoleIcon(conv.otherParticipant.role)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {conv.otherParticipant.email.split('@')[0]}
                                  </span>
                                  <Badge className={`text-xs ${getRoleBadgeColor(conv.otherParticipant.role)}`}>
                                    {conv.otherParticipant.role}
                                  </Badge>
                                </div>
                                {conv.property && (
                                  <p className="text-xs text-gray-500">
                                    {conv.property.address}
                                  </p>
                                )}
                                {conv.lastMessage && (
                                  <p className="text-sm text-gray-600 truncate mt-1">
                                    {conv.lastMessage.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {conv.lastMessage && (
                                <p className="text-xs text-gray-500">
                                  {formatTime(conv.lastMessage.created_at)}
                                </p>
                              )}
                              {conv.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {error && (
                    <div className="text-red-500 text-sm text-center mt-2">{error}</div>
                  )}
                </ScrollArea>
              ) : (
                // Message Thread
                <>
                  {/* Thread Header */}
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setActiveConversation(null)}
                        >
                          ←
                        </Button>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getRoleIcon(activeConversation.otherParticipant.role)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {activeConversation.otherParticipant.email.split('@')[0]}
                            </span>
                            <Badge className={`text-xs ${getRoleBadgeColor(activeConversation.otherParticipant.role)}`}>
                              {activeConversation.otherParticipant.role}
                            </Badge>
                          </div>
                          {activeConversation.property && (
                            <p className="text-xs text-gray-500">
                              {activeConversation.property.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading messages...</div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const isOwn = msg.sender_id === user.id
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[70%] ${
                                isOwn 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 text-gray-900'
                              } rounded-lg px-4 py-2`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <p className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {formatTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        disabled={sending}
                      />
                      <Button 
                        size="icon"
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {error && (
                      <p className="text-red-500 text-xs mt-2">{error}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </>
  )
}