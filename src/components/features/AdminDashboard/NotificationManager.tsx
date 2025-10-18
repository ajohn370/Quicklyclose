'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  MousePointer,
  BarChart3,
  Filter,
  Plus,
  Trash2,
  Edit
} from 'lucide-react'

interface NotificationRecord {
  id: string
  notification_type: string
  subject: string
  delivery_status: string
  created_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  seller_profiles: {
    id: string
    name: string
    email: string
  }
  properties: {
    id: string
    address: string
  }
}

interface NotificationAnalytics {
  total_sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  delivery_rate: number
  engagement_rate: number
}

interface SendNotificationData {
  seller_id: string
  property_id: string
  notification_type: string
  context?: Record<string, any>
  options?: {
    priority?: number
    scheduled_for?: Date
    delivery_channels?: ('email' | 'sms')[]
  }
}

export function NotificationManager() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [filters, setFilters] = useState({
    seller_id: '',
    property_id: '',
    status: '',
    type: ''
  })

  // Send notification form state
  const [sendForm, setSendForm] = useState<SendNotificationData>({
    seller_id: '',
    property_id: '',
    notification_type: 'pricing_ready',
    context: {},
    options: {
      priority: 3,
      delivery_channels: ['email']
    }
  })

  useEffect(() => {
    loadNotifications()
    loadAnalytics()
  }, [filters])

  const loadNotifications = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.seller_id) params.append('seller_id', filters.seller_id)
      if (filters.property_id) params.append('property_id', filters.property_id)
      params.append('limit', '50')

      const response = await fetch(`/api/seller/notifications/send?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })

      const response = await fetch(`/api/seller/notifications/track?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data.analytics)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const handleSendNotification = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/seller/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendForm)
      })

      if (response.ok) {
        const data = await response.json()
        setShowSendDialog(false)
        setSendForm({
          seller_id: '',
          property_id: '',
          notification_type: 'pricing_ready',
          context: {},
          options: {
            priority: 3,
            delivery_channels: ['email']
          }
        })
        loadNotifications()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'opened':
      case 'clicked':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'opened':
      case 'clicked':
        return <CheckCircle className="h-4 w-4" />
      case 'sent':
        return <Mail className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_sent}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.delivery_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{analytics.delivered} delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.engagement_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{analytics.opened} opened</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.delivered > 0 ? ((analytics.clicked / analytics.delivered) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{analytics.clicked} clicked</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <Button onClick={() => setShowSendDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </div>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="seller_filter">Seller ID</Label>
                  <Input
                    id="seller_filter"
                    value={filters.seller_id}
                    onChange={(e) => setFilters({...filters, seller_id: e.target.value})}
                    placeholder="Filter by seller ID"
                  />
                </div>
                <div>
                  <Label htmlFor="property_filter">Property ID</Label>
                  <Input
                    id="property_filter"
                    value={filters.property_id}
                    onChange={(e) => setFilters({...filters, property_id: e.target.value})}
                    placeholder="Filter by property ID"
                  />
                </div>
                <div>
                  <Label htmlFor="status_filter">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="opened">Opened</SelectItem>
                      <SelectItem value="clicked">Clicked</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type_filter">Type</Label>
                  <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="pricing_ready">Pricing Ready</SelectItem>
                      <SelectItem value="feedback_requested">Feedback Requested</SelectItem>
                      <SelectItem value="status_update">Status Update</SelectItem>
                      <SelectItem value="offer_accepted">Offer Accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                {notifications.length} notifications found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No notifications found
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(notification.delivery_status)}>
                            {getStatusIcon(notification.delivery_status)}
                            <span className="ml-1">{notification.delivery_status}</span>
                          </Badge>
                          <Badge variant="outline">
                            {notification.notification_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <h3 className="font-medium">{notification.subject}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          To: {notification.seller_profiles.name} ({notification.seller_profiles.email})
                        </div>
                        <div className="text-sm text-gray-600">
                          Property: {notification.properties.address}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>Sent: {formatDate(notification.created_at)}</div>
                        {notification.delivered_at && (
                          <div>Delivered: {formatDate(notification.delivered_at)}</div>
                        )}
                        {notification.opened_at && (
                          <div>Opened: {formatDate(notification.opened_at)}</div>
                        )}
                        {notification.clicked_at && (
                          <div>Clicked: {formatDate(notification.clicked_at)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>Manage email and SMS templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">Template management interface coming soon...</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Detailed Analytics
              </CardTitle>
              <CardDescription>Comprehensive notification performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">Advanced analytics dashboard coming soon...</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Notification Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to a seller with secure access link
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seller_id">Seller ID</Label>
                <Input
                  id="seller_id"
                  value={sendForm.seller_id}
                  onChange={(e) => setSendForm({...sendForm, seller_id: e.target.value})}
                  placeholder="Enter seller ID"
                />
              </div>
              <div>
                <Label htmlFor="property_id">Property ID</Label>
                <Input
                  id="property_id"
                  value={sendForm.property_id}
                  onChange={(e) => setSendForm({...sendForm, property_id: e.target.value})}
                  placeholder="Enter property ID"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notification_type">Notification Type</Label>
              <Select 
                value={sendForm.notification_type} 
                onValueChange={(value) => setSendForm({...sendForm, notification_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pricing_ready">Pricing Ready</SelectItem>
                  <SelectItem value="feedback_requested">Feedback Requested</SelectItem>
                  <SelectItem value="status_update">Status Update</SelectItem>
                  <SelectItem value="document_available">Document Available</SelectItem>
                  <SelectItem value="bidding_started">Bidding Started</SelectItem>
                  <SelectItem value="offer_accepted">Offer Accepted</SelectItem>
                  <SelectItem value="contract_ready">Contract Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={sendForm.options?.priority?.toString() || '3'} 
                  onValueChange={(value) => setSendForm({
                    ...sendForm, 
                    options: {...sendForm.options, priority: parseInt(value)}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Urgent</SelectItem>
                    <SelectItem value="2">High</SelectItem>
                    <SelectItem value="3">Medium</SelectItem>
                    <SelectItem value="4">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Channels</Label>
                <div className="flex gap-2 mt-1">
                  <Badge 
                    variant={sendForm.options?.delivery_channels?.includes('email') ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const channels = sendForm.options?.delivery_channels || []
                      const newChannels = channels.includes('email')
                        ? channels.filter(c => c !== 'email')
                        : [...channels, 'email' as const]
                      setSendForm({
                        ...sendForm,
                        options: {...sendForm.options, delivery_channels: newChannels}
                      })
                    }}
                  >
                    Email
                  </Badge>
                  <Badge 
                    variant={sendForm.options?.delivery_channels?.includes('sms') ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const channels = sendForm.options?.delivery_channels || []
                      const newChannels = channels.includes('sms')
                        ? channels.filter(c => c !== 'sms')
                        : [...channels, 'sms' as const]
                      setSendForm({
                        ...sendForm,
                        options: {...sendForm.options, delivery_channels: newChannels}
                      })
                    }}
                  >
                    SMS
                  </Badge>
                </div>
              </div>
            </div>

            {sendForm.notification_type === 'pricing_ready' && (
              <div>
                <Label htmlFor="offer_amount">Offer Amount (Optional)</Label>
                <Input
                  id="offer_amount"
                  type="number"
                  placeholder="Enter offer amount"
                  onChange={(e) => setSendForm({
                    ...sendForm,
                    context: {...sendForm.context, offer_amount: parseFloat(e.target.value)}
                  })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNotification} disabled={sending}>
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}