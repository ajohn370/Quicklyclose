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
  Search,
  User,
  Building2,
  Shield,
  Mail,
  MessageSquare,
  Clock,
  Filter
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
  createdAt: string
}

export function AdminMessaging() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'seller' | 'investor'>('all')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // Filter conversations based on search and role filter
  useEffect(() => {
    let filtered = conversations

    if (searchTerm) {
      filtered = filtered.filter(conv => 
        conv.otherParticipant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.property?.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.lastMessage?.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(conv => conv.otherParticipant.role === roleFilter)
    }

    setFilteredConversations(filtered)
  }, [conversations, searchTerm, roleFilter])

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
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes < 1 ? 'now' : `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getStats = () => {
    const total = conversations.length
    const unread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    const sellers = conversations.filter(conv => conv.otherParticipant.role === 'seller').length
    const investors = conversations.filter(conv => conv.otherParticipant.role === 'investor').length

    return { total, unread, sellers, investors }
  }

  const stats = getStats()

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Messages</h2>
          <p className="text-gray-600">Communicate with sellers and investors</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
            <div className="text-sm text-gray-500">Unread</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.sellers}</div>
            <div className="text-sm text-gray-500">Sellers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.investors}</div>
            <div className="text-sm text-gray-500">Investors</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={loadConversations}
                disabled={loading}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {/* Search and Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('all')}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={roleFilter === 'seller' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('seller')}
                >
                  Sellers
                </Button>
                <Button
                  size="sm"
                  variant={roleFilter === 'investor' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('investor')}
                >
                  Investors
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || roleFilter !== 'all' ? 'No conversations found' : 'No conversations yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        activeConversation?.id === conv.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback>
                            {getRoleIcon(conv.otherParticipant.role)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {conv.otherParticipant.email.split('@')[0]}
                            </span>
                            <Badge className={`text-xs ${getRoleBadgeColor(conv.otherParticipant.role)}`}>
                              {conv.otherParticipant.role}
                            </Badge>
                            {conv.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conv.property && (
                            <p className="text-xs text-gray-500 truncate mb-1">
                              📍 {conv.property.address}
                            </p>
                          )}
                          {conv.lastMessage && (
                            <p className="text-sm text-gray-600 truncate">
                              {conv.lastMessage.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {conv.lastMessage ? formatTime(conv.lastMessage.created_at) : formatTime(conv.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {error && (
              <div className="p-4 text-red-500 text-sm text-center">{error}</div>
            )}
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2">
          {!activeConversation ? (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Thread Header */}
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getRoleIcon(activeConversation.otherParticipant.role)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {activeConversation.otherParticipant.email.split('@')[0]}
                      </h3>
                      <Badge className={`text-xs ${getRoleBadgeColor(activeConversation.otherParticipant.role)}`}>
                        {activeConversation.otherParticipant.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {activeConversation.otherParticipant.email}
                    </p>
                    {activeConversation.property && (
                      <p className="text-sm text-gray-600">
                        Property: {activeConversation.property.address}, {activeConversation.property.city}, {activeConversation.property.state}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="p-0 flex flex-col h-[500px]">
                <ScrollArea className="flex-1 p-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet. Start the conversation!</p>
                    </div>
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
                      placeholder="Type your message..."
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button 
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
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}