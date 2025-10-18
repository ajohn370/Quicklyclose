'use client'

import { useState, useEffect, useCallback } from 'react'
// Removed mock dependencies - using real API calls instead
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Archive,
  MessageSquare
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PropertySubmission {
  id: string
  seller_id: string
  address: string
  property_type: string
  listing_price: number
  current_state: string
  analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  confidence_score?: number
  submitted_at: string
  updated_at: string
  seller_profile: {
    name: string
    email: string
    phone?: string
  }
  comp_vision_analyses: Array<{
    id: string
    status: string
    confidence_score?: number
    estimated_value?: number
    created_at: string
  }>
}

interface StateTransitionDialog {
  isOpen: boolean
  property: PropertySubmission | null
  newState: string | null
  availableStates: string[]
}

interface BulkActionsDialog {
  isOpen: boolean
  selectedProperties: string[]
  action: 'approve' | 'reject' | 'analyze' | 'archive' | null
}

const STATE_COLORS = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  analysis_pending: 'bg-orange-100 text-orange-800',
  analysis_in_progress: 'bg-purple-100 text-purple-800',
  analysis_completed: 'bg-green-100 text-green-800',
  analysis_failed: 'bg-red-100 text-red-800',
  pricing_review: 'bg-indigo-100 text-indigo-800',
  pricing_approved: 'bg-emerald-100 text-emerald-800',
  pricing_revision_requested: 'bg-amber-100 text-amber-800',
  seller_review: 'bg-cyan-100 text-cyan-800',
  seller_approved: 'bg-lime-100 text-lime-800',
  seller_rejected: 'bg-rose-100 text-rose-800',
  bidding_preparation: 'bg-violet-100 text-violet-800',
  bidding_active: 'bg-green-200 text-green-900',
  bidding_extended: 'bg-yellow-200 text-yellow-900',
  bidding_closed: 'bg-gray-100 text-gray-800',
  winner_selected: 'bg-blue-200 text-blue-900',
  contract_pending: 'bg-indigo-200 text-indigo-900',
  contract_signed: 'bg-green-300 text-green-900',
  funds_transfer: 'bg-purple-200 text-purple-900',
  completed: 'bg-emerald-200 text-emerald-900',
  cancelled: 'bg-red-200 text-red-900',
  archived: 'bg-gray-200 text-gray-700'
} as const

export function PropertySubmissionQueue() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<PropertySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'submitted_at' | 'updated_at' | 'confidence_score'>('submitted_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'review' | 'pricing' | 'bidding'>('all')

  // Dialogs
  const [transitionDialog, setTransitionDialog] = useState<StateTransitionDialog>({
    isOpen: false,
    property: null,
    newState: null,
    availableStates: []
  })
  const [bulkActionsDialog, setBulkActionsDialog] = useState<BulkActionsDialog>({
    isOpen: false,
    selectedProperties: [],
    action: null
  })
  const [transitionReason, setTransitionReason] = useState('')
  const [processingTransition, setProcessingTransition] = useState(false)

  // Admin permissions - simplified for real implementation
  const [canManageProperties, setCanManageProperties] = useState(true) // Admin has all permissions
  const [canTransitionStates, setCanTransitionStates] = useState(true)
  const [canViewAnalytics, setCanViewAnalytics] = useState(true)

  useEffect(() => {
    loadProperties()
  }, [])

  useEffect(() => {
    const interval = setInterval(loadProperties, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadProperties = async () => {
    try {
      const response = await fetch('/api/admin/properties/submissions', {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setProperties(data.data)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = searchTerm === '' || 
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.seller_profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.seller_profile.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesState = stateFilter === 'all' || property.current_state === stateFilter

    const matchesTab = activeTab === 'all' || 
      (activeTab === 'pending' && ['submitted', 'under_review'].includes(property.current_state)) ||
      (activeTab === 'review' && ['analysis_pending', 'analysis_in_progress', 'analysis_completed'].includes(property.current_state)) ||
      (activeTab === 'pricing' && ['pricing_review', 'pricing_approved', 'pricing_revision_requested'].includes(property.current_state)) ||
      (activeTab === 'bidding' && ['bidding_preparation', 'bidding_active', 'bidding_extended', 'bidding_closed'].includes(property.current_state))

    return matchesSearch && matchesState && matchesTab
  })

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'submitted_at':
        comparison = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
        break
      case 'updated_at':
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        break
      case 'confidence_score':
        comparison = (a.confidence_score || 0) - (b.confidence_score || 0)
        break
    }

    return sortOrder === 'desc' ? -comparison : comparison
  })

  const handleStateTransition = async (property: PropertySubmission, newState: string) => {
    // Available states for admin transition
    const availableStates = ['analysis_pending', 'analysis_completed', 'pricing_review', 'bidding_active', 'completed', 'cancelled']
    setTransitionDialog({
      isOpen: true,
      property,
      newState,
      availableStates
    })
  }

  const executeStateTransition = async () => {
    if (!transitionDialog.property || !transitionDialog.newState || !user) return

    setProcessingTransition(true)
    try {
      // Make API call to transition property state
      const response = await fetch(`/api/admin/properties/${transitionDialog.property.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newState: transitionDialog.newState,
          reason: transitionReason,
          triggeredBy: user.id
        })
      })

      if (response.ok) {
        setTransitionDialog({ isOpen: false, property: null, newState: null, availableStates: [] })
        setTransitionReason('')
        loadProperties()
      } else {
        const error = await response.json()
        console.error('State transition failed:', error.message)
      }
    } catch (error) {
      console.error('Error executing state transition:', error)
    } finally {
      setProcessingTransition(false)
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject' | 'analyze' | 'archive') => {
    setBulkActionsDialog({
      isOpen: true,
      selectedProperties: Array.from(selectedProperties),
      action
    })
  }

  const executeBulkAction = async () => {
    if (!bulkActionsDialog.action || !user) return

    try {
      const response = await fetch('/api/admin/properties/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: bulkActionsDialog.action,
          propertyIds: bulkActionsDialog.selectedProperties,
          reason: transitionReason
        })
      })

      if (response.ok) {
        setBulkActionsDialog({ isOpen: false, selectedProperties: [], action: null })
        setSelectedProperties(new Set())
        setTransitionReason('')
        loadProperties()
      }
    } catch (error) {
      console.error('Error executing bulk action:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search properties, sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="analysis_pending">Analysis Pending</SelectItem>
              <SelectItem value="analysis_in_progress">Analysis In Progress</SelectItem>
              <SelectItem value="analysis_completed">Analysis Completed</SelectItem>
              <SelectItem value="pricing_review">Pricing Review</SelectItem>
              <SelectItem value="bidding_active">Bidding Active</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted_at">Submitted</SelectItem>
              <SelectItem value="updated_at">Updated</SelectItem>
              <SelectItem value="confidence_score">Confidence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProperties.size > 0 && canManageProperties && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedProperties.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('approve')}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('analyze')}
            >
              Analyze
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('reject')}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({properties.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({properties.filter(p => ['submitted', 'under_review'].includes(p.current_state)).length})
          </TabsTrigger>
          <TabsTrigger value="review">
            Review ({properties.filter(p => ['analysis_pending', 'analysis_in_progress', 'analysis_completed'].includes(p.current_state)).length})
          </TabsTrigger>
          <TabsTrigger value="pricing">
            Pricing ({properties.filter(p => ['pricing_review', 'pricing_approved', 'pricing_revision_requested'].includes(p.current_state)).length})
          </TabsTrigger>
          <TabsTrigger value="bidding">
            Bidding ({properties.filter(p => ['bidding_preparation', 'bidding_active', 'bidding_extended', 'bidding_closed'].includes(p.current_state)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProperties.size === sortedProperties.length && sortedProperties.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProperties(new Set(sortedProperties.map(p => p.id)))
                        } else {
                          setSelectedProperties(new Set())
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProperties.has(property.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedProperties)
                          if (checked) {
                            newSelected.add(property.id)
                          } else {
                            newSelected.delete(property.id)
                          }
                          setSelectedProperties(newSelected)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{property.address}</div>
                        <div className="text-sm text-gray-500">
                          {property.property_type} • {formatCurrency(property.listing_price)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{property.seller_profile.name}</div>
                        <div className="text-sm text-gray-500">{property.seller_profile.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATE_COLORS[property.current_state] || 'bg-gray-100 text-gray-800'}>
                        {property.current_state.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {property.confidence_score ? (
                        <div className={`text-sm font-medium ${
                          property.confidence_score >= 90 ? 'text-green-600' :
                          property.confidence_score >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {property.confidence_score}%
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(property.submitted_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canTransitionStates && (
                            <>
                              <DropdownMenuSeparator />
                              {['analysis_pending', 'analysis_completed', 'pricing_review', 'bidding_active', 'completed'].map((state) => (
                                <DropdownMenuItem
                                  key={state}
                                  onClick={() => handleStateTransition(property, state)}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Move to {state.replace(/_/g, ' ')}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {sortedProperties.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No properties found matching your criteria.
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* State Transition Dialog */}
      <Dialog open={transitionDialog.isOpen} onOpenChange={(open) => 
        setTransitionDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transition Property State</DialogTitle>
            <DialogDescription>
              Move &ldquo;{transitionDialog.property?.address}&rdquo; from {transitionDialog.property?.current_state.replace(/_/g, ' ')} 
              to {transitionDialog.newState?.replace(/_/g, ' ')}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Provide a reason for this state transition..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransitionDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={executeStateTransition}
              disabled={processingTransition}
            >
              {processingTransition ? 'Processing...' : 'Confirm Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={bulkActionsDialog.isOpen} onOpenChange={(open) =>
        setBulkActionsDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Action: {bulkActionsDialog.action?.replace(/_/g, ' ')}</DialogTitle>
            <DialogDescription>
              This action will affect {bulkActionsDialog.selectedProperties.length} properties.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Provide a reason for this bulk action..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkActionsDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button onClick={executeBulkAction}>
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
