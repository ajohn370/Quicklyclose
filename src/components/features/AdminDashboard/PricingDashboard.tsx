'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  Target,
  Percent,
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { PricingAnalysisInterface } from './PricingAnalysisInterface'

interface PricingStats {
  total_revisions: number
  pending_approvals: number
  auto_approved: number
  manually_approved: number
  rejected: number
  escalated: number
  avg_approval_time_hours: number
  avg_margin_change: number
  avg_risk_score: number
}

interface PendingApproval {
  id: string
  property_id: string
  previous_offer: number
  new_offer: number
  reason: string
  approval_level_required: string
  risk_score: number
  created_at: string
  created_by: string
  properties: {
    address: string
    property_type: string
    listing_price: number
  }
  created_by_profile: {
    name: string
    email: string
  }
}

interface RevisionHistory {
  id: string
  property_id: string
  previous_offer: number
  new_offer: number
  reason: string
  approval_status: string
  risk_score: number
  created_at: string
  approved_at?: string
  properties: {
    address: string
    property_type: string
  }
}

export function PricingDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PricingStats | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [revisionHistory, setRevisionHistory] = useState<RevisionHistory[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    loadPricingData()
  }, [timeframe])

  const loadPricingData = async () => {
    try {
      // Fetch real data from API endpoints
      const [statsResponse, approvalsResponse, historyResponse] = await Promise.all([
        fetch(`/api/admin/pricing/statistics?timeframe=${timeframe}`, {
          cache: 'no-store'
        }),
        fetch('/api/admin/pricing/pending-approvals', {
          cache: 'no-store'
        }),
        fetch('/api/admin/pricing/revision-history', {
          cache: 'no-store'
        })
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.data.statistics)
        }
      }

      if (approvalsResponse.ok) {
        const approvalsData = await approvalsResponse.json()
        if (approvalsData.success) {
          setPendingApprovals(approvalsData.data)
        }
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        if (historyData.success) {
          setRevisionHistory(historyData.data)
        }
      }

    } catch (error) {
      console.error('Error loading pricing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRevision = async (revisionId: string) => {
    try {
      const response = await fetch(`/api/admin/pricing/revisions/${revisionId}/approve`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          notes: 'Approved via admin dashboard'
        })
      })

      if (response.ok) {
        // Refresh data from server
        await loadPricingData()
      } else {
        console.error('Failed to approve revision')
      }
    } catch (error) {
      console.error('Error approving revision:', error)
    }
  }

  const handleRejectRevision = async (revisionId: string) => {
    try {
      const response = await fetch(`/api/admin/pricing/revisions/${revisionId}/reject`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          notes: 'Rejected via admin dashboard'
        })
      })

      if (response.ok) {
        // Refresh data from server
        await loadPricingData()
      } else {
        console.error('Failed to reject revision')
      }
    } catch (error) {
      console.error('Error rejecting revision:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatTimeframe = (timeframe: string) => {
    switch (timeframe) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 90 days'
      default: return 'Last 30 days'
    }
  }

  const getApprovalLevelColor = (level: string) => {
    switch (level) {
      case 'analyst': return 'bg-blue-100 text-blue-800'
      case 'senior_analyst': return 'bg-purple-100 text-purple-800'
      case 'pricing_manager': return 'bg-orange-100 text-orange-800'
      case 'director': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score <= 3) return 'text-green-600 bg-green-50'
    if (score <= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getRiskScoreIcon = (score: number) => {
    if (score <= 3) return <CheckCircle className="h-4 w-4" />
    if (score <= 6) return <AlertTriangle className="h-4 w-4" />
    return <XCircle className="h-4 w-4" />
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'escalated': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div>Loading pricing dashboard...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pricing Management</h2>
          <p className="text-gray-600">Review and approve property offer pricing changes, monitor pricing analytics, and manage approval workflows</p>
          <div className="mt-2 text-sm text-blue-600">
            💡 This dashboard helps administrators review pricing adjustments suggested by analysts before they&apos;re applied to properties
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as typeof timeframe)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>  
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revisions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_revisions}</div>
              <p className="text-xs text-muted-foreground">{formatTimeframe(timeframe)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_approvals}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.total_revisions > 0 
                  ? Math.round(((stats.auto_approved + stats.manually_approved) / stats.total_revisions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.auto_approved} auto, {stats.manually_approved} manual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Approval Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avg_approval_time_hours > 0 
                  ? `${stats.avg_approval_time_hours.toFixed(1)}h`
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground">Time to approval</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvals">
            Pending Approvals ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Revision History
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Property offer price changes submitted by analysts that need administrative approval before being sent to sellers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending approvals</p>
                  <p className="text-sm">All pricing revisions are up to date</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Price Change</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{approval.properties.address}</div>
                            <div className="text-sm text-gray-500">
                              {approval.properties.property_type} • Listed at {formatCurrency(approval.properties.listing_price)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChangeIcon(approval.new_offer - approval.previous_offer)}
                            <div>
                              <div className="font-medium">
                                {formatCurrency(approval.previous_offer)} → {formatCurrency(approval.new_offer)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {((approval.new_offer - approval.previous_offer) / approval.previous_offer * 100).toFixed(1)}% change
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-sm ${getRiskScoreColor(approval.risk_score)}`}>
                            {getRiskScoreIcon(approval.risk_score)}
                            <span>{approval.risk_score}/10</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getApprovalLevelColor(approval.approval_level_required)}>
                            {approval.approval_level_required.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(approval.created_at).toLocaleDateString()}
                          <br />
                          by {approval.created_by}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveRevision(approval.id)}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectRevision(approval.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revision History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revision History</CardTitle>
                  <CardDescription>
                    Recent pricing revisions and their outcomes
                  </CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Price Change</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisionHistory
                    .filter(revision => statusFilter === 'all' || revision.approval_status === statusFilter)
                    .slice(0, 10)
                    .map((revision) => (
                    <TableRow key={revision.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{revision.properties.address}</div>
                          <div className="text-sm text-gray-500">{revision.properties.property_type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChangeIcon(revision.new_offer - revision.previous_offer)}
                          <div>
                            <div className="font-medium">
                              {formatCurrency(revision.previous_offer)} → {formatCurrency(revision.new_offer)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {((revision.new_offer - revision.previous_offer) / revision.previous_offer * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(revision.approval_status)}>
                          {revision.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 text-sm ${getRiskScoreColor(revision.risk_score)}`}>
                          {getRiskScoreIcon(revision.risk_score)}
                          <span>{revision.risk_score}/10</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>Created: {new Date(revision.created_at).toLocaleDateString()}</div>
                        {revision.approved_at && (
                          <div className="text-gray-500">
                            Approved: {new Date(revision.approved_at).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedProperty(revision.property_id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Distribution</CardTitle>
                <CardDescription>Distribution of risk scores across revisions</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Risk Score</span>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${getRiskScoreColor(stats.avg_risk_score)}`}>
                        {stats.avg_risk_score.toFixed(1)}/10
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Low Risk (1-3)</span>
                        <span className="text-green-600">~40%</span>
                      </div>
                      <Progress value={40} className="h-2 bg-green-100" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Medium Risk (4-6)</span>
                        <span className="text-yellow-600">~35%</span>
                      </div>
                      <Progress value={35} className="h-2 bg-yellow-100" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>High Risk (7-10)</span>
                        <span className="text-red-600">~25%</span>
                      </div>
                      <Progress value={25} className="h-2 bg-red-100" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Performance</CardTitle>
                <CardDescription>Efficiency metrics for the approval process</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-Approval Rate</span>
                      <span className="font-medium text-green-600">
                        {stats.total_revisions > 0 
                          ? Math.round((stats.auto_approved / stats.total_revisions) * 100)
                          : 0}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rejection Rate</span>
                      <span className="font-medium text-red-600">
                        {stats.total_revisions > 0 
                          ? Math.round((stats.rejected / stats.total_revisions) * 100)
                          : 0}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Escalation Rate</span>
                      <span className="font-medium text-purple-600">
                        {stats.total_revisions > 0 
                          ? Math.round((stats.escalated / stats.total_revisions) * 100)
                          : 0}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Price Change</span>
                      <span className="font-medium">
                        {stats.avg_margin_change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Trends & Insights</CardTitle>
              <CardDescription>Key trends in pricing decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">+5.2%</div>
                  <p className="text-sm text-blue-600">Avg margin improvement</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">-2.1h</div>
                  <p className="text-sm text-green-600">Faster approval times</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-600">92%</div>
                  <p className="text-sm text-purple-600">Accuracy rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pricing Analysis Dialog */}
      {selectedProperty && (
        <PricingAnalysisInterface 
          propertyId={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onPricingUpdated={() => {
            setSelectedProperty(null)
            loadPricingData()
          }}
        />
      )}
    </div>
  )
}