'use client'

import { useState, useEffect } from 'react'
import { SellerAuthManager } from '@/lib/seller-auth'
import { PropertyStateMachine } from '@/lib/property-state-machine'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Home, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  FileText,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Info,
  ArrowRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  BarChart3
} from 'lucide-react'

interface SellerProperty {
  id: string
  address: string
  property_type: string
  listing_price: number
  current_state: string
  estimated_value?: number
  recommended_offer?: number
  confidence_score?: number
  has_pending_pricing: boolean
  submitted_at: string
  last_updated: string
  analysis_data?: {
    comparables?: any[]
    market_trends?: any
    condition_score?: number
  }
  pricing_history?: Array<{
    id: string
    previous_offer: number
    new_offer: number
    created_at: string
    approval_status: string
  }>
}

interface SellerSession {
  seller_id: string
  email: string
  name: string
  phone?: string
  properties: SellerProperty[]
  access_token: string
}

interface SellerDashboardProps {
  session: SellerSession
  onPropertySelect: (propertyId: string) => void
  onFeedbackRequest: (propertyId: string, type: string) => void
}

export function SellerDashboard({ session, onPropertySelect, onFeedbackRequest }: SellerDashboardProps) {
  const [selectedProperty, setSelectedProperty] = useState<SellerProperty | null>(null)
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<SellerProperty[]>(session.properties)

  useEffect(() => {
    loadPropertyDetails()
  }, [])

  const loadPropertyDetails = async () => {
    setLoading(true)
    try {
      // Load detailed property information
      const updatedProperties = await Promise.all(
        session.properties.map(async (property) => {
          const response = await fetch(`/api/seller/properties/${property.id}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            return data.data
          }
          return property
        })
      )
      
      setProperties(updatedProperties)
      if (updatedProperties.length > 0) {
        setSelectedProperty(updatedProperties[0])
      }
    } catch (error) {
      console.error('Error loading property details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStateColor = (state: string) => {
    const stateColors = {
      'submitted': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'analysis_completed': 'bg-green-100 text-green-800',
      'pricing_review': 'bg-purple-100 text-purple-800',
      'seller_review': 'bg-orange-100 text-orange-800',
      'seller_approved': 'bg-emerald-100 text-emerald-800',
      'seller_rejected': 'bg-red-100 text-red-800',
      'bidding_active': 'bg-green-200 text-green-900',
      'completed': 'bg-gray-100 text-gray-800'
    }
    return stateColors[state] || 'bg-gray-100 text-gray-800'
  }

  const getStateDescription = (state: string) => {
    const descriptions = {
      'submitted': 'Your property has been submitted and is being reviewed by our team.',
      'under_review': 'Our analysts are currently reviewing your property details.',
      'analysis_completed': 'Property analysis is complete. We\'re preparing your pricing.',
      'pricing_review': 'Our pricing team is reviewing the recommended offer.',
      'seller_review': 'Ready for your review! Please check our offer and let us know your decision.',
      'seller_approved': 'Thank you for approving our offer. We\'re preparing for the next steps.',
      'seller_rejected': 'We understand you\'ve declined our offer. We\'re here if you\'d like to discuss alternatives.',
      'bidding_active': 'Your property is receiving bids from qualified investors.',
      'completed': 'Congratulations! Your property transaction has been completed.'
    }
    return descriptions[state] || 'We\'re working on your property.'
  }

  const getProgressPercentage = (state: string) => {
    const progressMap = {
      'submitted': 10,
      'under_review': 25,
      'analysis_completed': 40,
      'pricing_review': 55,
      'seller_review': 70,
      'seller_approved': 85,
      'bidding_active': 90,
      'completed': 100
    }
    return progressMap[state] || 0
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

  const canTakeAction = (property: SellerProperty) => {
    return ['seller_review'].includes(property.current_state)
  }

  const hasRecentUpdate = (property: SellerProperty) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(property.last_updated).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceUpdate <= 2
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome, {session.name}</h1>
              <p className="text-gray-600">Track your property and review our offers</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right text-sm text-gray-500">
                <div>Secure Access</div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Property Selection */}
        {properties.length > 1 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Your Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <Card 
                  key={property.id} 
                  className={`cursor-pointer transition-all ${
                    selectedProperty?.id === property.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedProperty(property)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{property.address}</h3>
                      {hasRecentUpdate(property) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <Badge className={getStateColor(property.current_state)}>
                      {property.current_state.replace(/_/g, ' ')}
                    </Badge>
                    {canTakeAction(property) && (
                      <div className="mt-2 text-sm text-orange-600 font-medium">
                        Action Required
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Property Dashboard */}
        {selectedProperty && (
          <div className="space-y-6">
            {/* Property Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      {selectedProperty.address}
                    </CardTitle>
                    <CardDescription>
                      {selectedProperty.property_type} • Submitted {formatDate(selectedProperty.submitted_at)}
                    </CardDescription>
                  </div>
                  
                  <Badge className={getStateColor(selectedProperty.current_state)}>
                    {selectedProperty.current_state.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{getProgressPercentage(selectedProperty.current_state)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(selectedProperty.current_state)} className="h-2" />
                  </div>

                  {/* Status Description */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {getStateDescription(selectedProperty.current_state)}
                    </AlertDescription>
                  </Alert>

                  {/* Action Required */}
                  {canTakeAction(selectedProperty) && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Action Required:</strong> We have an offer ready for your review. 
                        Please check the pricing details below and let us know your decision.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Details Tabs */}
            <Tabs defaultValue="pricing" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="communication">Messages</TabsTrigger>
              </TabsList>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Pricing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Current Offer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProperty.recommended_offer ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {formatCurrency(selectedProperty.recommended_offer)}
                            </div>
                            <p className="text-sm text-gray-500">Our cash offer</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Your Listed Price</span>
                              <span>{formatCurrency(selectedProperty.listing_price)}</span>
                            </div>
                            {selectedProperty.estimated_value && (
                              <div className="flex justify-between text-sm">
                                <span>Estimated Market Value</span>
                                <span>{formatCurrency(selectedProperty.estimated_value)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-medium">
                              <span>Our Offer</span>
                              <span className="text-green-600">
                                {formatCurrency(selectedProperty.recommended_offer)}
                              </span>
                            </div>
                          </div>

                          {canTakeAction(selectedProperty) && (
                            <div className="flex gap-2 pt-4">
                              <Button 
                                className="flex-1"
                                onClick={() => onPropertySelect(selectedProperty.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Review Offer
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Pricing analysis in progress</p>
                          <p className="text-sm">We&apos;ll notify you when it&apos;s ready</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pricing History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Pricing History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProperty.pricing_history && selectedProperty.pricing_history.length > 0 ? (
                        <div className="space-y-3">
                          {selectedProperty.pricing_history.slice(0, 3).map((revision) => (
                            <div key={revision.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">
                                  {formatCurrency(revision.new_offer)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(revision.created_at)}
                                </div>
                              </div>
                              <Badge className={getStateColor(revision.approval_status)}>
                                {revision.approval_status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No pricing history yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Property Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProperty.analysis_data ? (
                        <div className="space-y-4">
                          {selectedProperty.confidence_score && (
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Analysis Confidence</span>
                                <span className="font-medium">{selectedProperty.confidence_score}%</span>
                              </div>
                              <Progress value={selectedProperty.confidence_score} className="h-2" />
                            </div>
                          )}

                          {selectedProperty.analysis_data.condition_score && (
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Property Condition</span>
                                <span className="font-medium">{selectedProperty.analysis_data.condition_score}/100</span>
                              </div>
                              <Progress value={selectedProperty.analysis_data.condition_score} className="h-2" />
                            </div>
                          )}

                          {selectedProperty.analysis_data.market_trends && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="font-medium text-blue-900">Market Trends</div>
                              <div className="text-sm text-blue-700">
                                {selectedProperty.analysis_data.market_trends.trend === 'up' && 'Market is trending upward'}
                                {selectedProperty.analysis_data.market_trends.trend === 'down' && 'Market is cooling down'}
                                {selectedProperty.analysis_data.market_trends.trend === 'stable' && 'Market is stable'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Analysis in progress</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Market Comparables */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Similar Properties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProperty.analysis_data?.comparables ? (
                        <div className="space-y-3">
                          {selectedProperty.analysis_data.comparables.slice(0, 3).map((comp, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start">
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Comparables loading...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Property Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium">Property Submitted</div>
                          <div className="text-sm text-gray-500">{formatDate(selectedProperty.submitted_at)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium">Analysis Completed</div>
                          <div className="text-sm text-gray-500">Property analysis and valuation completed</div>
                        </div>
                      </div>

                      {selectedProperty.recommended_offer && (
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                          <div>
                            <div className="font-medium">Offer Ready</div>
                            <div className="text-sm text-gray-500">
                              Cash offer of {formatCurrency(selectedProperty.recommended_offer)} prepared
                            </div>
                          </div>
                        </div>
                      )}

                      {canTakeAction(selectedProperty) && (
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 animate-pulse"></div>
                          <div>
                            <div className="font-medium">Awaiting Your Decision</div>
                            <div className="text-sm text-gray-500">Please review and respond to our offer</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Communication Tab */}
              <TabsContent value="communication" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Communication Center
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">We&apos;ll keep you updated on your property</p>
                      </div>

                      <div className="border-t pt-4">
                        <h3 className="font-medium mb-3">Contact Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{session.email}</span>
                          </div>
                          {session.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{session.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onFeedbackRequest(selectedProperty.id, 'general')}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onFeedbackRequest(selectedProperty.id, 'service')}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Provide Feedback
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* No Properties */}
        {properties.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-500">
                We couldn&apos;t find any properties associated with your account.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}