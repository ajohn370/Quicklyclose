'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Info, 
  AlertTriangle,
  Calculator,
  Home,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  FileText,
  ArrowRight,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'

interface PropertyPricingData {
  property: {
    id: string
    address: string
    property_type: string
    listing_price: number
    estimated_value: number
    confidence_score: number
  }
  offer: {
    amount: number
    breakdown: {
      estimated_value: number
      profit_margin: number
      closing_costs: number
      repairs_allowance: number
      final_offer: number
    }
    terms: {
      cash_offer: boolean
      closing_timeline: string
      inspection_waived: boolean
      as_is_condition: boolean
    }
  }
  analysis: {
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
    condition_assessment: {
      overall_score: number
      major_repairs_needed: string[]
      estimated_repair_cost: number
    }
  }
  timeline: {
    offer_expires: string
    estimated_closing: string
    key_milestones: Array<{
      step: string
      timeline: string
      description: string
    }>
  }
}

interface SellerDecision {
  decision: 'approved' | 'rejected' | 'counter_offer'
  counter_offer_amount?: number
  feedback: string
  preferred_contact_method: 'email' | 'phone' | 'text'
  best_contact_time: string
  additional_terms?: string[]
}

interface SellerPricingApprovalProps {
  propertyId: string
  sessionToken: string
  onDecisionSubmitted: (decision: SellerDecision) => void
  onClose: () => void
}

export function SellerPricingApproval({ 
  propertyId, 
  sessionToken, 
  onDecisionSubmitted, 
  onClose 
}: SellerPricingApprovalProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pricingData, setPricingData] = useState<PropertyPricingData | null>(null)
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'counter_offer'>('approved')
  const [counterOfferAmount, setCounterOfferAmount] = useState<string>('')
  const [feedback, setFeedback] = useState('')
  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'text'>('email')
  const [contactTime, setContactTime] = useState('')
  const [additionalTerms, setAdditionalTerms] = useState<string[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    loadPricingData()
  }, [propertyId])

  const loadPricingData = async () => {
    try {
      const response = await fetch(`/api/seller/properties/${propertyId}/pricing`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPricingData(data.data)
      } else {
        console.error('Failed to load pricing data')
      }
    } catch (error) {
      console.error('Error loading pricing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitDecision = async () => {
    setSubmitting(true)
    try {
      const sellerDecision: SellerDecision = {
        decision,
        counter_offer_amount: decision === 'counter_offer' ? parseFloat(counterOfferAmount) : undefined,
        feedback: feedback.trim(),
        preferred_contact_method: contactMethod,
        best_contact_time: contactTime,
        additional_terms: additionalTerms
      }

      const response = await fetch(`/api/seller/properties/${propertyId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(sellerDecision)
      })

      if (response.ok) {
        onDecisionSubmitted(sellerDecision)
      } else {
        console.error('Failed to submit decision')
      }
    } catch (error) {
      console.error('Error submitting decision:', error)
    } finally {
      setSubmitting(false)
      setShowConfirmation(false)
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const isValidCounterOffer = () => {
    if (decision !== 'counter_offer') return true
    const amount = parseFloat(counterOfferAmount)
    return amount > 0 && amount !== pricingData?.offer.amount
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your pricing details...</p>
        </div>
      </div>
    )
  }

  if (!pricingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Unable to Load Pricing
            </CardTitle>
            <CardDescription>
              We couldn&apos;t load the pricing information for your property.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onClose} variant="outline" className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Your Offer</h1>
              <p className="text-gray-600">{pricingData.property.address}</p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(pricingData.offer.amount)}
              </div>
              <p className="text-sm text-gray-500">Cash Offer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Offer Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Offer Summary
            </CardTitle>
            <CardDescription>
              Our cash offer for your property based on current market analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Offer Breakdown */}
              <div className="space-y-4">
                <h3 className="font-medium">Offer Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Estimated Market Value</span>
                    <span>{formatCurrency(pricingData.offer.breakdown.estimated_value)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Profit Margin</span>
                    <span>-{formatCurrency(pricingData.offer.breakdown.profit_margin)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Estimated Closing Costs</span>
                    <span>-{formatCurrency(pricingData.offer.breakdown.closing_costs)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Repairs Allowance</span>
                    <span>-{formatCurrency(pricingData.offer.breakdown.repairs_allowance)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Your Cash Offer</span>
                    <span className="text-green-600">
                      {formatCurrency(pricingData.offer.breakdown.final_offer)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Offer Terms */}
              <div className="space-y-4">
                <h3 className="font-medium">Offer Terms</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>100% Cash Purchase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Close in {pricingData.offer.terms.closing_timeline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No Inspection Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Purchase As-Is Condition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No Real Estate Commissions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Analysis Confidence</span>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(pricingData.property.confidence_score)}`}>
                  {pricingData.property.confidence_score}% Confident
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Based on recent comparable sales and market analysis
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Market Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Market Trends */}
              <div>
                <h3 className="font-medium mb-3">Market Trends</h3>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900">
                    Market is {pricingData.analysis.market_trends.trend === 'up' ? 'Rising' : 
                              pricingData.analysis.market_trends.trend === 'down' ? 'Declining' : 'Stable'}
                  </div>
                  <div className="text-sm text-blue-700">
                    {Math.abs(pricingData.analysis.market_trends.percentage)}% over {pricingData.analysis.market_trends.timeframe}
                  </div>
                </div>
              </div>

              {/* Property Condition */}
              <div>
                <h3 className="font-medium mb-3">Property Assessment</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">
                    Condition Score: {pricingData.analysis.condition_assessment.overall_score}/100
                  </div>
                  {pricingData.analysis.condition_assessment.major_repairs_needed.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Major repairs: {pricingData.analysis.condition_assessment.major_repairs_needed.join(', ')}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Estimated repairs: {formatCurrency(pricingData.analysis.condition_assessment.estimated_repair_cost)}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparables */}
            <div className="mt-6">
              <h3 className="font-medium mb-3">Recent Comparable Sales</h3>
              <div className="space-y-3">
                {pricingData.analysis.comparables.slice(0, 3).map((comp, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{comp.address}</div>
                      <div className="text-xs text-gray-500">
                        {comp.sqft?.toLocaleString()} sq ft • {comp.distance?.toFixed(1)} mi away
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(comp.sale_price)}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(comp.sale_date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decision Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your Decision
            </CardTitle>
            <CardDescription>
              Please review our offer and let us know your decision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Options */}
            <div>
              <Label className="text-base font-medium">What would you like to do?</Label>
              <RadioGroup 
                value={decision} 
                onValueChange={(value) => setDecision(value as typeof decision)}
                className="mt-3"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50">
                  <RadioGroupItem value="approved" id="approved" />
                  <div className="flex-1">
                    <Label htmlFor="approved" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Accept Offer</span>
                      </div>
                      <p className="text-sm text-gray-500">I accept the cash offer of {formatCurrency(pricingData.offer.amount)}</p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-blue-50">
                  <RadioGroupItem value="counter_offer" id="counter_offer" />
                  <div className="flex-1">
                    <Label htmlFor="counter_offer" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Make Counter Offer</span>
                      </div>
                      <p className="text-sm text-gray-500">I&apos;d like to negotiate the price</p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-red-50">
                  <RadioGroupItem value="rejected" id="rejected" />
                  <div className="flex-1">
                    <Label htmlFor="rejected" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Decline Offer</span>
                      </div>
                      <p className="text-sm text-gray-500">I&apos;m not interested in this offer</p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Counter Offer Input */}
            {decision === 'counter_offer' && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                <div>
                  <Label htmlFor="counter_amount">Your Counter Offer Amount</Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <Input
                      id="counter_amount"
                      type="number"
                      value={counterOfferAmount}
                      onChange={(e) => setCounterOfferAmount(e.target.value)}
                      className="pl-7"
                      placeholder="Enter your desired price"
                    />
                  </div>
                  {counterOfferAmount && (
                    <p className="text-sm text-gray-500 mt-1">
                      Your counter offer: {formatCurrency(parseFloat(counterOfferAmount) || 0)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div>
              <Label htmlFor="feedback">Comments or Questions (Optional)</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share any thoughts, questions, or specific requirements..."
                className="mt-1"
                rows={4}
              />
            </div>

            {/* Contact Preferences */}
            <div className="space-y-4">
              <h3 className="font-medium">Contact Preferences</h3>
              
              <div>
                <Label>How would you prefer we contact you?</Label>
                <RadioGroup 
                  value={contactMethod} 
                  onValueChange={(value) => setContactMethod(value as typeof contactMethod)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phone" />
                    <Label htmlFor="phone" className="flex items-center gap-2 cursor-pointer">
                      <Phone className="h-4 w-4" />
                      Phone Call
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="text" />
                    <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare className="h-4 w-4" />
                      Text Message
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="contact_time">Best time to contact you</Label>
                <Input
                  id="contact_time"
                  value={contactTime}
                  onChange={(e) => setContactTime(e.target.value)}
                  placeholder="e.g., Weekdays 9am-5pm, Evenings after 6pm"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Offer Expiration Warning */}
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Offer expires:</strong> {formatDate(pricingData.timeline.offer_expires)}
                <br />
                Please respond by this date to secure this offer.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={onClose}>
            Save for Later
          </Button>
          <Button 
            onClick={() => setShowConfirmation(true)}
            disabled={!isValidCounterOffer() || (decision === 'counter_offer' && !counterOfferAmount)}
            className="min-w-32"
          >
            {decision === 'approved' && 'Accept Offer'}
            {decision === 'counter_offer' && 'Submit Counter Offer'}
            {decision === 'rejected' && 'Decline Offer'}
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Your Decision</DialogTitle>
              <DialogDescription>
                Please review your decision before submitting.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">
                  {decision === 'approved' && `Accept offer of ${formatCurrency(pricingData.offer.amount)}`}
                  {decision === 'counter_offer' && `Counter offer of ${formatCurrency(parseFloat(counterOfferAmount) || 0)}`}
                  {decision === 'rejected' && 'Decline the offer'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Property: {pricingData.property.address}
                </div>
              </div>

              {feedback && (
                <div>
                  <div className="font-medium text-sm">Your Comments:</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                    {feedback}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600">
                We&apos;ll contact you via {contactMethod} {contactTime && `(${contactTime})`} with next steps.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Go Back
              </Button>
              <Button onClick={handleSubmitDecision} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm Decision'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}