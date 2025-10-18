'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Home, 
  MapPin, 
  Calendar, 
  DollarSign, 
  User,
  Phone,
  Mail,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  SortDesc,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Star,
  AlertCircle,
  MessageCircle,
  Activity,
  ThumbsUp,
  Users,
  TrendingUp
} from 'lucide-react'

interface SellerProfile {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  member_since: string
  last_updated: string
  communication_count: number
  last_communication?: string
  interaction_count: number
  last_interaction?: string
  feedback_count: number
  avg_rating?: number
  has_responded: boolean
}

interface PropertySubmission {
  id: string
  property_id?: string
  seller_id: string
  seller_profile: SellerProfile
  property_address: string
  city?: string
  state?: string
  zip_code?: string
  property_type: string
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  asking_price?: number
  estimated_value?: number
  description?: string
  images: string[]
  status: 'new' | 'reviewing' | 'pending_approval' | 'approved' | 'rejected' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  submission_source: 'website' | 'referral' | 'advertisement' | 'direct' | 'portal'
  created_at: string
  updated_at: string
  assigned_to?: string
  notes?: string
  valuation_requested: boolean
  ai_analysis_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_confidence_score?: number
}

interface SubmissionStats {
  total: number
  new: number
  reviewing: number
  approved: number
  rejected: number
  avgProcessingTime: number
  conversionRate: number
}

export function SubmissionsSection() {
  const [submissions, setSubmissions] = useState<PropertySubmission[]>([])
  const [stats, setStats] = useState<SubmissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<PropertySubmission | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'value'>('date')
  const [activeTab, setActiveTab] = useState('list')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  useEffect(() => {
    // Recalculate stats whenever submissions change
    loadStats()
  }, [submissions])

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowActionsMenu(null)
    }
    
    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionsMenu])

  const loadSubmissions = async () => {
    try {
      console.log('Loading submissions from API...')
      // Fetch from actual API
      const response = await fetch('/api/admin/properties/submissions', {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('API Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('API Result:', result)
        
        if (result.success && result.data) {
          console.log('Found', result.data.length, 'submissions')
          // Transform the API data to match our interface
          const apiSubmissions: PropertySubmission[] = result.data.map((item: any) => ({
            id: item.id,
            property_id: item.id,
            seller_id: item.seller_id,
            seller_profile: {
              id: item.seller_profile?.id || '',
              name: item.seller_profile?.name || 'Unknown Seller',
              email: item.seller_profile?.email || '',
              phone: item.seller_profile?.phone || '',
              address: item.seller_profile?.address || '',
              member_since: item.seller_profile?.member_since || '',
              last_updated: item.seller_profile?.last_updated || '',
              communication_count: item.seller_profile?.communication_count || 0,
              last_communication: item.seller_profile?.last_communication,
              interaction_count: item.seller_profile?.interaction_count || 0,
              last_interaction: item.seller_profile?.last_interaction,
              feedback_count: item.seller_profile?.feedback_count || 0,
              avg_rating: item.seller_profile?.avg_rating,
              has_responded: item.seller_profile?.has_responded || false
            },
            property_address: item.address || 'Address not available',
            city: item.city || 'N/A',
            state: item.state || 'N/A',  
            zip_code: item.zip_code || 'N/A',
            property_type: item.property_type || 'unknown',
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            square_feet: item.square_feet,
            asking_price: item.listing_price,
            estimated_value: item.comp_vision_analyses?.[0]?.estimated_value,
            description: 'Property submitted for evaluation',
            images: [], // No images in current API
            status: item.current_state === 'submitted' ? 'new' : 
                   item.current_state === 'under_review' ? 'reviewing' :
                   item.current_state === 'analysis_completed' ? 'approved' : 'new',
            priority: item.confidence_score >= 90 ? 'high' : 
                     item.confidence_score >= 70 ? 'medium' : 'low',
            submission_source: 'portal',
            created_at: item.submitted_at,
            updated_at: item.updated_at,
            valuation_requested: true,
            ai_analysis_status: item.analysis_status || 'pending',
            ai_confidence_score: item.confidence_score
          }))
          
          setSubmissions(apiSubmissions)
          return
        }
      } else {
        console.error('API failed with status:', response.status)
        const errorData = await response.text()
        console.error('Error response:', errorData)
      }
      
      // If API call fails, show error to user
      console.error('Failed to load submissions from API')
      // Don't use mock data in production - show empty state instead
      setSubmissions([])
      
      // For debugging only - remove in production
      /*const mockSubmissions: PropertySubmission[] = [
        {
          id: 'mock-1',
          property_id: 'prop-1',
          seller_id: 'seller-1',
          seller_profile: {
            id: 'seller-1',
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '(555) 123-4567',
            address: '123 Main St, Dallas, TX',
            member_since: '2024-01-15',
            last_updated: '2024-01-20',
            communication_count: 3,
            last_communication: '2024-01-19',
            interaction_count: 2,
            last_interaction: '2024-01-18',
            feedback_count: 1,
            avg_rating: 4.5,
            has_responded: true
          },
          property_address: '456 Oak Street',
          city: 'Dallas',
          state: 'TX',
          zip_code: '75201',
          property_type: 'Single Family',
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1850,
          asking_price: 285000,
          estimated_value: 295000,
          description: 'Beautiful single family home in quiet neighborhood',
          images: [],
          status: 'new',
          priority: 'high',
          submission_source: 'portal',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          valuation_requested: true,
          ai_analysis_status: 'pending',
          ai_confidence_score: 85
        },
        {
          id: 'mock-2',
          property_id: 'prop-2',
          seller_id: 'seller-2',
          seller_profile: {
            id: 'seller-2',
            name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            phone: '(555) 987-6543',
            address: '789 Elm Dr, Houston, TX',
            member_since: '2024-01-10',
            last_updated: '2024-01-22',
            communication_count: 5,
            last_communication: '2024-01-21',
            interaction_count: 3,
            last_interaction: '2024-01-20',
            feedback_count: 2,
            avg_rating: 5.0,
            has_responded: true
          },
          property_address: '789 Pine Avenue',
          city: 'Houston',
          state: 'TX',
          zip_code: '77001',
          property_type: 'Condo',
          bedrooms: 2,
          bathrooms: 2,
          square_feet: 1200,
          asking_price: 195000,
          estimated_value: 205000,
          description: 'Modern condo with great amenities',
          images: [],
          status: 'reviewing',
          priority: 'medium',
          submission_source: 'website',
          created_at: '2024-01-10T14:30:00Z',
          updated_at: '2024-01-22T09:00:00Z',
          valuation_requested: true,
          ai_analysis_status: 'processing',
          ai_confidence_score: 78
        },
        {
          id: 'mock-3',
          property_id: 'prop-3',
          seller_id: 'seller-3',
          seller_profile: {
            id: 'seller-3',
            name: 'Michael Davis',
            email: 'mdavis@email.com',
            phone: '(555) 456-7890',
            address: '321 Maple Blvd, Austin, TX',
            member_since: '2024-01-05',
            last_updated: '2024-01-18',
            communication_count: 4,
            last_communication: '2024-01-17',
            interaction_count: 4,
            last_interaction: '2024-01-16',
            feedback_count: 3,
            avg_rating: 4.8,
            has_responded: true
          },
          property_address: '321 Maple Boulevard',
          city: 'Austin',
          state: 'TX',
          zip_code: '78701',
          property_type: 'Townhouse',
          bedrooms: 3,
          bathrooms: 2.5,
          square_feet: 2100,
          asking_price: 425000,
          estimated_value: 440000,
          description: 'Spacious townhouse in prime location',
          images: [],
          status: 'approved',
          priority: 'high',
          submission_source: 'referral',
          created_at: '2024-01-05T11:15:00Z',
          updated_at: '2024-01-18T16:45:00Z',
          valuation_requested: true,
          ai_analysis_status: 'completed',
          ai_confidence_score: 92
        }
      ]
      setSubmissions(mockSubmissions)*/
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Calculate stats from current submissions data
      if (submissions.length > 0) {
        const stats: SubmissionStats = {
          total: submissions.length,
          new: submissions.filter(s => s.status === 'new').length,
          reviewing: submissions.filter(s => s.status === 'reviewing').length,
          approved: submissions.filter(s => s.status === 'approved').length,
          rejected: submissions.filter(s => s.status === 'rejected').length,
          avgProcessingTime: 0, // Would need to calculate from state transitions
          conversionRate: submissions.length > 0 ? 
            (submissions.filter(s => s.status === 'approved').length / submissions.length) * 100 : 0
        }
        setStats(stats)
      } else {
        // If no submissions, set all stats to 0
        setStats({
          total: 0,
          new: 0,
          reviewing: 0,
          approved: 0,
          rejected: 0,
          avgProcessingTime: 0,
          conversionRate: 0
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      case 'reviewing': 
      case 'pending_approval': return <Clock className="h-4 w-4 text-blue-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      pending_approval: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.new}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge variant="secondary" className={variants[priority as keyof typeof variants]}>
        {priority}
      </Badge>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleReviewSubmission = (submission: PropertySubmission) => {
    setSelectedSubmission(submission)
    setShowReviewModal(true)
    setReviewAction(null)
    setReviewNotes('')
  }

  const handleApproveSubmission = async () => {
    if (!selectedSubmission) return
    
    try {
      const response = await fetch(`/api/admin/properties/${selectedSubmission.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes: reviewNotes
        })
      })

      if (response.ok) {
        // Update the submission status locally
        setSubmissions(prev => prev.map(sub => 
          sub.id === selectedSubmission.id 
            ? { ...sub, status: 'approved' as const }
            : sub
        ))
        setShowReviewModal(false)
        setSelectedSubmission(null)
      }
    } catch (error) {
      console.error('Error approving submission:', error)
    }
  }

  const handleRejectSubmission = async () => {
    if (!selectedSubmission) return
    
    try {
      const response = await fetch(`/api/admin/properties/${selectedSubmission.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes: reviewNotes
        })
      })

      if (response.ok) {
        // Update the submission status locally
        setSubmissions(prev => prev.map(sub => 
          sub.id === selectedSubmission.id 
            ? { ...sub, status: 'rejected' as const }
            : sub
        ))
        setShowReviewModal(false)
        setSelectedSubmission(null)
      }
    } catch (error) {
      console.error('Error rejecting submission:', error)
    }
  }

  const handleViewDetails = (submission: PropertySubmission) => {
    setSelectedSubmission(submission)
    setShowDetailsModal(true)
  }

  const handleEditSubmission = (submission: PropertySubmission) => {
    setSelectedSubmission(submission)
    setShowEditModal(true)
  }

  const handleToggleActionsMenu = (submissionId: string) => {
    setShowActionsMenu(showActionsMenu === submissionId ? null : submissionId)
  }

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return
    
    try {
      const response = await fetch(`/api/admin/properties/${submissionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSubmissions(prev => prev.filter(sub => sub.id !== submissionId))
        setShowActionsMenu(null)
      }
    } catch (error) {
      console.error('Error deleting submission:', error)
    }
  }

  const handleAnalyzeProperty = async (submission: PropertySubmission) => {
    if (!submission.property_id) {
      alert('Property ID is required for analysis')
      return
    }

    try {
      // Update UI to show analysis in progress
      setSubmissions(prev => prev.map(sub => 
        sub.id === submission.id 
          ? { ...sub, ai_analysis_status: 'processing' as const }
          : sub
      ))

      // Call comp vision analysis API
      const response = await fetch(`/api/admin/comp-vision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: submission.property_id,
          image_urls: submission.images.length > 0 ? submission.images : ['/placeholder-house.jpg'],
          priority: submission.priority === 'urgent' ? 10 : submission.priority === 'high' ? 8 : 5
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update submission with analysis results
        setSubmissions(prev => prev.map(sub => 
          sub.id === submission.id 
            ? { 
                ...sub, 
                ai_analysis_status: 'completed' as const,
                ai_confidence_score: result.confidence || 85,
                estimated_value: result.estimated_value
              }
            : sub
        ))
        
        alert('Property analysis completed successfully!')
      } else {
        setSubmissions(prev => prev.map(sub => 
          sub.id === submission.id 
            ? { ...sub, ai_analysis_status: 'failed' as const }
            : sub
        ))
        alert('Analysis failed: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error analyzing property:', error)
      setSubmissions(prev => prev.map(sub => 
        sub.id === submission.id 
          ? { ...sub, ai_analysis_status: 'failed' as const }
          : sub
      ))
      alert('Failed to analyze property')
    }
  }

  const filteredSubmissions = submissions
    .filter(sub => {
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || sub.priority === priorityFilter
      const matchesSearch = searchTerm === '' || 
        sub.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.seller_profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.seller_profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.city && sub.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sub.state && sub.state.toLowerCase().includes(searchTerm.toLowerCase()))
      
      return matchesStatus && matchesPriority && matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
        case 'value':
          return (b.asking_price || 0) - (a.asking_price || 0)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Submissions</h2>
          <p className="text-sm text-gray-500">Manage incoming property submissions from client portal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Filter className="h-4 w-4" />
            Advanced Filter
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
              <div className="text-xs text-muted-foreground">New</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.reviewing}</div>
              <div className="text-xs text-muted-foreground">Reviewing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.avgProcessingTime}d</div>
              <div className="text-xs text-muted-foreground">Avg Processing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <div className="text-xs text-muted-foreground">Conversion</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Submissions List</TabsTrigger>
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="sellers">Seller Details</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'value')}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="value">Sort by Value</option>
              </select>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Home className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-semibold text-lg">{submission.property_address}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {submission.city}, {submission.state} {submission.zip_code}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <div className="font-medium capitalize">{submission.property_type.replace('_', ' ')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Beds/Baths:</span>
                          <div className="font-medium">{submission.bedrooms || 'N/A'}/{submission.bathrooms || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sq Ft:</span>
                          <div className="font-medium">{submission.square_feet?.toLocaleString() || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Asking Price:</span>
                          <div className="font-medium">{submission.asking_price ? formatCurrency(submission.asking_price) : 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div className="lg:w-80">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {submission.seller_profile.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{submission.seller_profile.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{submission.seller_profile.email}</div>
                          {submission.seller_profile.phone && (
                            <div className="text-xs text-muted-foreground">{submission.seller_profile.phone}</div>
                          )}
                        </div>
                        {submission.seller_profile.has_responded && (
                          <div className="flex items-center" title="Seller has responded">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Seller Activity Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3 text-blue-500" />
                          <span>{submission.seller_profile.communication_count} messages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-green-500" />
                          <span>{submission.seller_profile.interaction_count} interactions</span>
                        </div>
                        {submission.seller_profile.feedback_count > 0 && (
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3 text-yellow-500" />
                            <span>{submission.seller_profile.feedback_count} feedback</span>
                          </div>
                        )}
                        {submission.seller_profile.avg_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span>{submission.seller_profile.avg_rating.toFixed(1)} rating</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Timeline Info */}
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Submitted {formatDate(submission.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>Member since {formatDate(submission.seller_profile.member_since)}</span>
                        </div>
                        {submission.seller_profile.last_communication && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            <span>Last contact {formatDate(submission.seller_profile.last_communication)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          <span>{submission.images.length} images</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="lg:w-48 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(submission.status)}
                        {getPriorityBadge(submission.priority)}
                      </div>
                      
                      {submission.ai_analysis_status === 'completed' && submission.ai_confidence_score && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 text-yellow-500" />
                          AI Confidence: {submission.ai_confidence_score}%
                        </div>
                      )}

                      <div className="flex gap-1 relative">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(submission)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditSubmission(submission)}
                          title="Edit submission"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleToggleActionsMenu(submission.id)}
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        
                        {/* Actions Dropdown Menu */}
                        {showActionsMenu === submission.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[140px]">
                            <button
                              onClick={() => {
                                handleAnalyzeProperty(submission)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2"
                              disabled={submission.ai_analysis_status === 'processing'}
                            >
                              <TrendingUp className="h-3 w-3" />
                              {submission.ai_analysis_status === 'processing' ? 'Analyzing...' : 'Analyze Property'}
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(submission.id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => handleReviewSubmission(submission)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                            >
                              Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {submission.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1">Admin Notes:</div>
                      <div className="text-sm">{submission.notes}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredSubmissions.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No submissions found matching your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
              <CardDescription>Submissions awaiting admin review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSubmissions
                  .filter(sub => sub.status === 'reviewing' || sub.status === 'new')
                  .map(submission => (
                    <div key={`queue-${submission.id}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium">{submission.property_address}</div>
                        <div className="text-sm text-gray-600">
                          {submission.seller_profile.name} • {formatDate(submission.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(submission.status)}
                        {getPriorityBadge(submission.priority)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReviewSubmission(submission)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                {filteredSubmissions.filter(sub => sub.status === 'reviewing' || sub.status === 'new').length === 0 && (
                  <p className="text-center text-gray-500 py-8">No submissions in review queue</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Submissions</CardTitle>
              <CardDescription>Successfully approved property submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSubmissions
                  .filter(sub => sub.status === 'approved')
                  .map(submission => (
                    <div key={`approved-${submission.id}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium">{submission.property_address}</div>
                        <div className="text-sm text-gray-600">
                          {submission.seller_profile.name} • Approved on {formatDate(submission.updated_at)}
                        </div>
                        {submission.estimated_value && (
                          <div className="text-sm mt-1">
                            <span className="text-gray-600">Estimated Value: </span>
                            <span className="font-medium text-green-600">{formatCurrency(submission.estimated_value)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(submission.status)}
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  ))}
                {filteredSubmissions.filter(sub => sub.status === 'approved').length === 0 && (
                  <p className="text-center text-gray-500 py-8">No approved submissions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="space-y-4">
          {/* Seller Details View */}
          <div className="grid gap-4">
            {filteredSubmissions.map((submission) => (
              <Card key={`seller-${submission.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Seller Profile Section */}
                    <div className="lg:w-1/3">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                            {submission.seller_profile.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{submission.seller_profile.name}</h3>
                          <p className="text-sm text-muted-foreground">{submission.seller_profile.email}</p>
                          {submission.seller_profile.phone && (
                            <p className="text-sm text-muted-foreground">{submission.seller_profile.phone}</p>
                          )}
                        </div>
                      </div>
                      
                      {submission.seller_profile.address && (
                        <div className="mb-4">
                          <h4 className="font-medium text-sm mb-1">Address</h4>
                          <p className="text-sm text-muted-foreground">{submission.seller_profile.address}</p>
                        </div>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Member since:</span>
                          <span>{formatDate(submission.seller_profile.member_since)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last updated:</span>
                          <span>{formatDate(submission.seller_profile.last_updated)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Activity & Engagement Stats */}
                    <div className="lg:w-1/3">
                      <h4 className="font-medium mb-3">Activity & Engagement</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Communications</span>
                          </div>
                          <span className="font-medium">{submission.seller_profile.communication_count}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Interactions</span>
                          </div>
                          <span className="font-medium">{submission.seller_profile.interaction_count}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">Feedback</span>
                          </div>
                          <span className="font-medium">{submission.seller_profile.feedback_count}</span>
                        </div>
                        
                        {submission.seller_profile.avg_rating && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">Avg. Rating</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{submission.seller_profile.avg_rating.toFixed(1)}</span>
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Responsive</span>
                          </div>
                          <Badge variant={submission.seller_profile.has_responded ? "default" : "secondary"}>
                            {submission.seller_profile.has_responded ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Property & Submission Info */}
                    <div className="lg:w-1/3">
                      <h4 className="font-medium mb-3">Current Submission</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm">{submission.property_address}</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {submission.city && submission.state ? `${submission.city}, ${submission.state}` : 'Location details pending'}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 ml-6">
                          {getStatusBadge(submission.status)}
                          {getPriorityBadge(submission.priority)}
                        </div>
                        
                        <div className="ml-6 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="capitalize">{submission.property_type.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Asking Price:</span>
                            <span>{submission.asking_price ? formatCurrency(submission.asking_price) : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Submitted:</span>
                            <span>{formatDate(submission.created_at)}</span>
                          </div>
                        </div>
                        
                        {submission.seller_profile.last_communication && (
                          <div className="ml-6 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Last Contact: {formatDate(submission.seller_profile.last_communication)}
                            </div>
                          </div>
                        )}
                        
                        <div className="ml-6 pt-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <MessageCircle className="h-4 w-4" />
                              Contact
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredSubmissions.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No seller information found matching your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Property Submission</DialogTitle>
            <DialogDescription>
              Review and make a decision on this property submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Address</label>
                      <p className="text-sm">{selectedSubmission.property_address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">City, State</label>
                      <p className="text-sm">{selectedSubmission.city}, {selectedSubmission.state}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Property Type</label>
                      <p className="text-sm capitalize">{selectedSubmission.property_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Asking Price</label>
                      <p className="text-sm font-medium text-green-600">
                        {selectedSubmission.asking_price ? formatCurrency(selectedSubmission.asking_price) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bedrooms/Bathrooms</label>
                      <p className="text-sm">{selectedSubmission.bedrooms || 'N/A'} / {selectedSubmission.bathrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Square Feet</label>
                      <p className="text-sm">{selectedSubmission.square_feet?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seller Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Seller Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-sm">{selectedSubmission.seller_profile.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-sm">{selectedSubmission.seller_profile.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-sm">{selectedSubmission.seller_profile.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Submitted</label>
                      <p className="text-sm">{formatDate(selectedSubmission.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add notes about your review decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleApproveSubmission}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  ✓ Approve Submission
                </Button>
                <Button
                  onClick={handleRejectSubmission}
                  variant="destructive"
                  className="flex-1"
                >
                  ✗ Reject Submission
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Submission Details</DialogTitle>
            <DialogDescription>
              Complete details for this property submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Comprehensive Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Full Address</label>
                      <p className="text-sm">{selectedSubmission.property_address}</p>
                      <p className="text-sm text-gray-500">{selectedSubmission.city}, {selectedSubmission.state} {selectedSubmission.zip_code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Property Type</label>
                      <p className="text-sm capitalize">{selectedSubmission.property_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Asking Price</label>
                      <p className="text-sm font-medium text-green-600">
                        {selectedSubmission.asking_price ? formatCurrency(selectedSubmission.asking_price) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bedrooms</label>
                      <p className="text-sm">{selectedSubmission.bedrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bathrooms</label>
                      <p className="text-sm">{selectedSubmission.bathrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Square Feet</label>
                      <p className="text-sm">{selectedSubmission.square_feet?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p className="text-sm">{selectedSubmission.description || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div>{getStatusBadge(selectedSubmission.status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seller Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-sm">{selectedSubmission.seller_profile.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-sm">{selectedSubmission.seller_profile.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-sm">{selectedSubmission.seller_profile.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Submission Date</label>
                      <p className="text-sm">{formatDate(selectedSubmission.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Information */}
              {selectedSubmission.ai_analysis_status && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Computer Vision Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Analysis Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedSubmission.ai_analysis_status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {selectedSubmission.ai_analysis_status === 'processing' && <Clock className="h-4 w-4 text-blue-500" />}
                          {selectedSubmission.ai_analysis_status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          <p className="text-sm capitalize">{selectedSubmission.ai_analysis_status}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Confidence Score</label>
                        <p className="text-sm font-medium text-blue-600">{selectedSubmission.ai_confidence_score}%</p>
                      </div>
                      {selectedSubmission.estimated_value && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Estimated Value</label>
                          <p className="text-sm font-medium text-green-600">{formatCurrency(selectedSubmission.estimated_value)}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">Priority</label>
                        <div className="mt-1">{getPriorityBadge(selectedSubmission.priority)}</div>
                      </div>
                    </div>

                    {selectedSubmission.ai_analysis_status === 'completed' && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">Analysis Results</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                              <span className="text-sm">Property Condition</span>
                              <Badge className="bg-green-100 text-green-800">Good</Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                              <span className="text-sm">Market Position</span>
                              <Badge className="bg-blue-100 text-blue-800">Competitive</Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                              <span className="text-sm">Investment Potential</span>
                              <Badge className="bg-purple-100 text-purple-800">High</Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-600">Identified Features</h5>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">Updated Kitchen</Badge>
                              <Badge variant="outline" className="text-xs">Hardwood Floors</Badge>
                              <Badge variant="outline" className="text-xs">Good Condition</Badge>
                              <Badge variant="outline" className="text-xs">Modern Fixtures</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedSubmission.ai_analysis_status === 'processing' && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-sm">Analysis in progress...</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">This may take up to 2 minutes to complete</p>
                      </div>
                    )}

                    {selectedSubmission.ai_analysis_status === 'failed' && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Analysis Failed</span>
                        </div>
                        <p className="text-xs text-gray-500">Please try running the analysis again or contact support if the issue persists.</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => handleAnalyzeProperty(selectedSubmission)}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Retry Analysis
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Property Submission</DialogTitle>
            <DialogDescription>
              Update property information and details
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Editing: {selectedSubmission.property_address}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select className="w-full mt-1 p-2 border rounded-md">
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select className="w-full mt-1 p-2 border rounded-md">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea 
                  placeholder="Add internal notes about this submission..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEditModal(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}