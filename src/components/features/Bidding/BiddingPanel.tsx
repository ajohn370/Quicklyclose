'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Home,
  MapPin,
  Calendar,
  User,
  Building2,
  Gavel
} from 'lucide-react'

interface Bid {
  id: string
  property_id: string
  investor_id: string
  bid_amount: number
  bid_type: 'cash' | 'financing' | 'mixed'
  financing_amount?: number
  bid_status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired'
  bid_message?: string
  counter_offer_amount?: number
  counter_offer_message?: string
  expires_at: string
  created_at: string
  property?: {
    id: string
    address: string
    city: string
    state: string
    listing_price: number
  }
}

interface BiddingPanelProps {
  propertyId: string
  propertyDetails: {
    address: string
    city: string
    state: string
    listingPrice: number
    bedrooms: number
    bathrooms: number
    sqft: number
    yearBuilt: number
  }
}

export function BiddingPanel({ propertyId, propertyDetails }: BiddingPanelProps) {
  const { user, userRole } = useAuth()
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Bid form state
  const [bidAmount, setBidAmount] = useState('')
  const [bidType, setBidType] = useState<'cash' | 'financing' | 'mixed'>('cash')
  const [financingAmount, setFinancingAmount] = useState('')
  const [bidMessage, setBidMessage] = useState('')

  // Load existing bids
  useEffect(() => {
    if (propertyId) {
      loadBids()
    }
  }, [propertyId])

  const loadBids = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/bids?propertyId=${propertyId}`)
      const result = await response.json()
      
      if (result.success) {
        setBids(result.data || [])
      } else {
        setError('Failed to load bids')
      }
    } catch (error) {
      console.error('Error loading bids:', error)
      setError('Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  const submitBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError('Please enter a valid bid amount')
      return
    }

    if (bidType !== 'cash' && (!financingAmount || parseFloat(financingAmount) <= 0)) {
      setError('Please enter a financing amount')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          bidAmount: parseFloat(bidAmount),
          bidType,
          financingAmount: bidType !== 'cash' ? parseFloat(financingAmount) : null,
          bidMessage: bidMessage.trim() || null
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess('Your bid has been submitted successfully!')
        setBidAmount('')
        setFinancingAmount('')
        setBidMessage('')
        await loadBids()
      } else {
        setError(result.message || 'Failed to submit bid')
      }
    } catch (error) {
      console.error('Error submitting bid:', error)
      setError('Failed to submit bid')
    } finally {
      setSubmitting(false)
    }
  }

  const withdrawBid = async (bidId: string) => {
    try {
      const response = await fetch('/api/bids', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId,
          action: 'withdraw'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess('Bid withdrawn successfully')
        await loadBids()
      } else {
        setError('Failed to withdraw bid')
      }
    } catch (error) {
      console.error('Error withdrawing bid:', error)
      setError('Failed to withdraw bid')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'countered':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'withdrawn':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      countered: 'bg-yellow-100 text-yellow-800',
      withdrawn: 'bg-gray-100 text-gray-800',
      expired: 'bg-gray-100 text-gray-800',
      pending: 'bg-blue-100 text-blue-800'
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status}
      </Badge>
    )
  }

  const calculateTimeLeft = (expiresAt: string) => {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
    return 'Less than 1 hour'
  }

  // Only show for investors
  if (userRole !== 'investor') {
    return null
  }

  const myBids = bids.filter(bid => bid.investor_id === user?.id)
  const hasActiveBid = myBids.some(bid => ['pending', 'countered'].includes(bid.bid_status))

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Place Your Bid</CardTitle>
            <CardDescription>Submit a competitive offer for this property</CardDescription>
          </div>
          <Gavel className="h-8 w-8 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="new-bid" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="new-bid">New Bid</TabsTrigger>
            <TabsTrigger value="my-bids">
              My Bids {myBids.length > 0 && `(${myBids.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-bid" className="space-y-4">
            {/* Property Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{propertyDetails.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{propertyDetails.city}, {propertyDetails.state}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  Asking: ${propertyDetails.listingPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {hasActiveBid ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You already have an active bid on this property. Please withdraw or wait for a response before placing a new bid.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Bid Amount */}
                <div>
                  <Label htmlFor="bidAmount">Bid Amount ($)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="bidAmount"
                      type="number"
                      placeholder="Enter your bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="pl-10"
                      min="0"
                      step="1000"
                    />
                  </div>
                  {bidAmount && (
                    <p className="text-sm text-gray-500 mt-1">
                      {parseFloat(bidAmount) < propertyDetails.listingPrice 
                        ? `${((parseFloat(bidAmount) / propertyDetails.listingPrice) * 100).toFixed(1)}% of asking price`
                        : `${((parseFloat(bidAmount) / propertyDetails.listingPrice) * 100 - 100).toFixed(1)}% above asking price`
                      }
                    </p>
                  )}
                </div>

                {/* Bid Type */}
                <div>
                  <Label htmlFor="bidType">Payment Type</Label>
                  <Select value={bidType} onValueChange={(value: any) => setBidType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Offer</SelectItem>
                      <SelectItem value="financing">Financing</SelectItem>
                      <SelectItem value="mixed">Mixed (Cash + Financing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Financing Amount */}
                {bidType !== 'cash' && (
                  <div>
                    <Label htmlFor="financingAmount">Financing Amount ($)</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="financingAmount"
                        type="number"
                        placeholder="Amount to be financed"
                        value={financingAmount}
                        onChange={(e) => setFinancingAmount(e.target.value)}
                        className="pl-10"
                        min="0"
                        step="1000"
                      />
                    </div>
                    {financingAmount && bidAmount && (
                      <p className="text-sm text-gray-500 mt-1">
                        Cash portion: ${(parseFloat(bidAmount) - parseFloat(financingAmount)).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Message */}
                <div>
                  <Label htmlFor="bidMessage">Message to Seller (Optional)</Label>
                  <Textarea
                    id="bidMessage"
                    placeholder="Add a personal message or special terms..."
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={submitBid}
                  disabled={submitting || !bidAmount}
                  className="w-full"
                >
                  {submitting ? 'Submitting...' : 'Submit Bid'}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="my-bids" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading bids...</div>
            ) : myBids.length === 0 ? (
              <div className="text-center py-8">
                <Gavel className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">You haven&apos;t placed any bids on this property</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myBids.map((bid) => (
                  <Card key={bid.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(bid.bid_status)}
                            {getStatusBadge(bid.bid_status)}
                            {bid.bid_status === 'pending' && (
                              <span className="text-sm text-gray-500">
                                • {calculateTimeLeft(bid.expires_at)}
                              </span>
                            )}
                          </div>
                          <div className="text-lg font-semibold">
                            ${bid.bid_amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {bid.bid_type === 'cash' ? 'Cash Offer' : 
                             bid.bid_type === 'financing' ? 'With Financing' : 'Mixed Payment'}
                          </div>
                          {bid.financing_amount && (
                            <div className="text-sm text-gray-500">
                              Financing: ${bid.financing_amount.toLocaleString()}
                            </div>
                          )}
                          {bid.counter_offer_amount && (
                            <div className="bg-yellow-50 p-2 rounded mt-2">
                              <p className="text-sm font-medium text-yellow-800">
                                Counter Offer: ${bid.counter_offer_amount.toLocaleString()}
                              </p>
                              {bid.counter_offer_message && (
                                <p className="text-sm text-yellow-700 mt-1">
                                  &quot;{bid.counter_offer_message}&quot;
                                </p>
                              )}
                            </div>
                          )}
                          {bid.bid_message && (
                            <p className="text-sm text-gray-600 italic">
                              &quot;{bid.bid_message}&quot;
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Submitted {new Date(bid.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {['pending', 'countered'].includes(bid.bid_status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => withdrawBid(bid.id)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}