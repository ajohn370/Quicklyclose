'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { MockConfigurationManager as ConfigurationManager } from '@/lib/admin-config-mock'
import { PropertyStateMachine } from '@/lib/property-state-machine-mock'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Home,
  MapPin,
  User,
  Calendar,
  Target,
  Percent,
  Edit,
  Save,
  X
} from 'lucide-react'

interface PropertyAnalysis {
  id: string
  property_id: string
  address: string
  property_type: string
  listing_price: number
  estimated_value: number
  confidence_score: number
  current_state: string
  analysis_data: {
    comparables: Array<{
      address: string
      sale_price: number
      sale_date: string
      sqft: number
      distance: number
    }>
    market_trends: {
      trend: 'up' | 'down' | 'stable'
      percentage: number
      timeframe: string
    }
    condition_score: number
    location_score: number
    market_score: number
  }
  profit_margins: {
    base: number
    adjusted: number
    minimum: number
    maximum: number
    multipliers: Record<string, number>
  }
  recommended_offer: number
  revision_history: Array<{
    id: string
    previous_offer: number
    new_offer: number
    reason: string
    created_by: string
    created_at: string
  }>
  seller_profile: {
    name: string
    email: string
    phone?: string
  }
  created_at: string
  updated_at: string
}

interface PricingRevision {
  property_id: string
  previous_offer: number
  new_offer: number
  reason: string
  profit_margin_override?: number
  confidence_adjustment?: number
  market_adjustment?: number
}

interface PricingAnalysisInterfaceProps {
  propertyId: string
  onClose: () => void
  onPricingUpdated?: (propertyId: string, newOffer: number) => void
}

export function PricingAnalysisInterface({ propertyId, onClose, onPricingUpdated }: PricingAnalysisInterfaceProps) {
  const { user } = useAuth()
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingPrice, setEditingPrice] = useState(false)
  const [newOffer, setNewOffer] = useState<number>(0)
  const [revisionReason, setRevisionReason] = useState('')
  const [profitMarginOverride, setProfitMarginOverride] = useState<number[]>([])
  const [confidenceAdjustment, setConfidenceAdjustment] = useState<number[]>([0])
  const [marketAdjustment, setMarketAdjustment] = useState<number[]>([0])
  const [businessRules, setBusinessRules] = useState<any>({})
  const [calculatedOffer, setCalculatedOffer] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPropertyAnalysis()
    loadBusinessRules()
  }, [propertyId])

  useEffect(() => {
    if (analysis) {
      calculateRecommendedOffer()
    }
  }, [analysis, profitMarginOverride, confidenceAdjustment, marketAdjustment])

  const loadPropertyAnalysis = async () => {
    try {
      const response = await fetch(`/api/admin/pricing/analysis/${propertyId}`, {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.data)
        setNewOffer(data.data.recommended_offer)
        setProfitMarginOverride([data.data.profit_margins.adjusted])
      }
    } catch (error) {
      console.error('Error loading property analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBusinessRules = async () => {
    try {
      const rules = await ConfigurationManager.getBusinessRules('profit_margins')
      setBusinessRules(rules)
    } catch (error) {
      console.error('Error loading business rules:', error)
    }
  }

  const calculateRecommendedOffer = () => {
    if (!analysis) return

    const baseValue = analysis.estimated_value
    const profitMargin = profitMarginOverride[0] || analysis.profit_margins.adjusted
    const confidenceAdj = confidenceAdjustment[0] / 100
    const marketAdj = marketAdjustment[0] / 100

    // Apply confidence adjustment
    let adjustedValue = baseValue * (1 + confidenceAdj)

    // Apply market adjustment
    adjustedValue = adjustedValue * (1 + marketAdj)

    // Calculate offer with profit margin
    const calculatedOffer = adjustedValue * (1 - profitMargin)

    setCalculatedOffer(Math.round(calculatedOffer))
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4" />
    if (score >= 70) return <AlertTriangle className="h-4 w-4" />
    return <X className="h-4 w-4" />
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />
    }
  }

  const handlePriceEdit = () => {
    setEditingPrice(true)
    setNewOffer(calculatedOffer || analysis?.recommended_offer || 0)
  }

  const handlePriceSave = async () => {
    if (!analysis || !user) return

    setSaving(true)
    try {
      const revision: PricingRevision = {
        property_id: propertyId,
        previous_offer: analysis.recommended_offer,
        new_offer: newOffer,
        reason: revisionReason,
        profit_margin_override: profitMarginOverride[0],
        confidence_adjustment: confidenceAdjustment[0],
        market_adjustment: marketAdjustment[0]
      }

      const response = await fetch('/api/admin/pricing/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(revision)
      })

      if (response.ok) {
        setEditingPrice(false)
        setRevisionReason('')
        loadPropertyAnalysis()
        onPricingUpdated?.(propertyId, newOffer)

        // Transition to pricing_approved if needed
        if (analysis.current_state === 'pricing_review') {
          await PropertyStateMachine.transitionState(
            propertyId,
            'pricing_approved',
            {
              triggeredBy: 'admin' as const,
              triggeredByUser: user.id,
              reason: 'Pricing approved by admin',
              data: {
                approved_offer: newOffer,
                revision_applied: true
              }
            }
          )
        }
      }
    } catch (error) {
      console.error('Error saving pricing revision:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRejectPricing = async () => {
    if (!user) return

    try {
      await PropertyStateMachine.transitionState(
        propertyId,
        'pricing_revision_requested',
        {
          triggeredBy: 'admin' as const,
          triggeredByUser: user.id,
          reason: 'Pricing requires revision',
          data: {
            current_offer: analysis?.recommended_offer,
            action: 'revision_requested'
          }
        }
      )
      onClose()
    } catch (error) {
      console.error('Error rejecting pricing:', error)
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
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading pricing analysis...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!analysis) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analysis Not Found</DialogTitle>
            <DialogDescription>
              Unable to load pricing analysis for this property.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Analysis - {analysis.address}
          </DialogTitle>
          <DialogDescription>
            AI-powered property analysis with confidence scoring and profit margin calculations
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Property Details & Analysis */}
          <div className="space-y-4">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{analysis.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-500" />
                  <span>{analysis.property_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>Listed at {formatCurrency(analysis.listing_price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{analysis.seller_profile.name}</span>
                </div>
              </CardContent>
            </Card>

            {/* Confidence & Market Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analysis Confidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Confidence</span>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getConfidenceColor(analysis.confidence_score)}`}>
                    {getConfidenceIcon(analysis.confidence_score)}
                    <span className="font-medium">{analysis.confidence_score}%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Condition Score</span>
                    <span>{analysis.analysis_data.condition_score}/100</span>
                  </div>
                  <Progress value={analysis.analysis_data.condition_score} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Location Score</span>
                    <span>{analysis.analysis_data.location_score}/100</span>
                  </div>
                  <Progress value={analysis.analysis_data.location_score} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Market Score</span>
                    <span>{analysis.analysis_data.market_score}/100</span>
                  </div>
                  <Progress value={analysis.analysis_data.market_score} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Market Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon(analysis.analysis_data.market_trends.trend)}
                  Market Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span>Market Direction</span>
                  <Badge className={
                    analysis.analysis_data.market_trends.trend === 'up' ? 'bg-green-100 text-green-800' :
                    analysis.analysis_data.market_trends.trend === 'down' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {analysis.analysis_data.market_trends.trend.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {Math.abs(analysis.analysis_data.market_trends.percentage)}% 
                  {analysis.analysis_data.market_trends.trend === 'up' ? ' increase' : 
                   analysis.analysis_data.market_trends.trend === 'down' ? ' decrease' : ' stable'} 
                  over {analysis.analysis_data.market_trends.timeframe}
                </div>
              </CardContent>
            </Card>

            {/* Comparables */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Comparables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.analysis_data.comparables.slice(0, 3).map((comp, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{comp.address}</div>
                        <div className="text-xs text-gray-500">
                          {comp.sqft?.toLocaleString()} sq ft • {comp.distance?.toFixed(1)} mi
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(comp.sale_price)}</div>
                        <div className="text-xs text-gray-500">{formatDate(comp.sale_date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pricing Controls */}
          <div className="space-y-4">
            {/* Current Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Pricing Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(analysis.estimated_value)}
                    </div>
                    <div className="text-sm text-blue-600">Estimated Value</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(editingPrice ? calculatedOffer : analysis.recommended_offer)}
                    </div>
                    <div className="text-sm text-green-600">Recommended Offer</div>
                  </div>
                </div>

                <Separator />

                {/* Profit Margin Display */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className="text-sm">
                      {((profitMarginOverride[0] || analysis.profit_margins.adjusted) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Range: {(analysis.profit_margins.minimum * 100).toFixed(1)}% - {(analysis.profit_margins.maximum * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Pricing Adjustments
                  </span>
                  {!editingPrice && (
                    <Button size="sm" onClick={handlePriceEdit}>
                      Edit Pricing
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPrice ? (
                  <>
                    {/* Profit Margin Override */}
                    <div className="space-y-2">
                      <Label>Profit Margin Override (%)</Label>
                      <Slider
                        value={profitMarginOverride}
                        onValueChange={setProfitMarginOverride}
                        min={analysis.profit_margins.minimum * 100}
                        max={analysis.profit_margins.maximum * 100}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{(analysis.profit_margins.minimum * 100).toFixed(1)}%</span>
                        <span className="font-medium">{(profitMarginOverride[0] || 0).toFixed(1)}%</span>
                        <span>{(analysis.profit_margins.maximum * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Confidence Adjustment */}
                    <div className="space-y-2">
                      <Label>Confidence Adjustment (%)</Label>
                      <Slider
                        value={confidenceAdjustment}
                        onValueChange={setConfidenceAdjustment}
                        min={-20}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>-20%</span>
                        <span className="font-medium">{confidenceAdjustment[0] > 0 ? '+' : ''}{confidenceAdjustment[0]}%</span>
                        <span>+20%</span>
                      </div>
                    </div>

                    {/* Market Adjustment */}
                    <div className="space-y-2">
                      <Label>Market Adjustment (%)</Label>
                      <Slider
                        value={marketAdjustment}
                        onValueChange={setMarketAdjustment}
                        min={-15}
                        max={15}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>-15%</span>
                        <span className="font-medium">{marketAdjustment[0] > 0 ? '+' : ''}{marketAdjustment[0]}%</span>
                        <span>+15%</span>
                      </div>
                    </div>

                    {/* Manual Override */}
                    <div className="space-y-2">
                      <Label>Final Offer Amount</Label>
                      <Input
                        type="number"
                        value={newOffer}
                        onChange={(e) => setNewOffer(Number(e.target.value))}
                        placeholder="Enter offer amount"
                      />
                    </div>

                    {/* Revision Reason */}
                    <div className="space-y-2">
                      <Label>Revision Reason</Label>
                      <Textarea
                        value={revisionReason}
                        onChange={(e) => setRevisionReason(e.target.value)}
                        placeholder="Explain the reason for this pricing adjustment..."
                        rows={3}
                      />
                    </div>

                    {/* Calculated vs Manual Alert */}
                    {newOffer !== calculatedOffer && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Manual override: {formatCurrency(newOffer)} vs calculated {formatCurrency(calculatedOffer)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Click &ldquo;Edit Pricing&rdquo; to make adjustments
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revision History */}
            {analysis.revision_history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Revision History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.revision_history.slice(0, 3).map((revision) => (
                      <div key={revision.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium">
                            {formatCurrency(revision.previous_offer)} → {formatCurrency(revision.new_offer)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(revision.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{revision.reason}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {analysis.current_state === 'pricing_review' && (
            <Button variant="outline" onClick={handleRejectPricing}>
              Request Revision
            </Button>
          )}
          {editingPrice ? (
            <>
              <Button variant="outline" onClick={() => setEditingPrice(false)}>
                Cancel Edit
              </Button>
              <Button 
                onClick={handlePriceSave} 
                disabled={saving || !revisionReason.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Pricing'}
              </Button>
            </>
          ) : (
            <Button onClick={() => onClose()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Pricing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
