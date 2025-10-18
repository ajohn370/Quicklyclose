'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { CompVisionResults } from './comp-vision-results'
import { mockCompVisionAnalyses } from '@/lib/mock-data'
import Image from 'next/image'

interface CompVisionAnalysis {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
  estimated_value: number
  confidence: number
  features: { name: string; confidence: number }[]
  flip_comps: {
    after_repair_value: number | null
    price_per_sqft: number | null
    days_on_market: number | null
    renovation_grade: string | null
  }
  rental_comps: {
    market_rent_estimate: number | null
    cap_rate: number | null
    rent_to_price_ratio: number | null
  }
  similar_properties: any[]
  image_url: string
  admin_approved: boolean
  created_at: string
}

export function InvestorPortal() {
  const { user, loading: authLoading } = useAuth()
  const [analyses, setAnalyses] = useState<CompVisionAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    priceRange: 'all',
    investmentType: 'all',
    location: 'all'
  })

  const fetchAnalyses = useCallback(async () => {
    // Check if user is authenticated before making API call
    if (!user) {
      console.error('User not authenticated')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/comp-vision/analyses', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This ensures authentication cookies are sent
      })
      
      const result = await response.json()
      if (result.success) {
        setAnalyses(result.data)
      } else {
        console.error('Failed to fetch analyses:', result.message)
        // Handle authentication errors specifically
        if (response.status === 401) {
          console.error('Authentication failed - user may need to log in again')
        }
      }
    } catch (error) {
      console.error('Error fetching analyses:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Only fetch when auth is fully loaded and user is confirmed
    if (!authLoading && user) {
      fetchAnalyses()
    } else if (!authLoading && !user) {
      // Auth is loaded but no user - don't fetch
      setLoading(false)
    }
  }, [authLoading, user, fetchAnalyses])

  // Use real analyses or mock data as fallback when no real data exists
  const displayAnalyses = analyses.length === 0 ? mockCompVisionAnalyses : analyses

  const filteredAnalyses = displayAnalyses.filter(analysis => {
    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number)
      if (max && (analysis.estimated_value < min || analysis.estimated_value > max)) return false
      if (!max && analysis.estimated_value < min) return false
    }
    
    if (filters.investmentType !== 'all') {
      if (filters.investmentType === 'flip' && !analysis.flip_comps?.after_repair_value) return false
      if (filters.investmentType === 'rental' && !analysis.rental_comps?.market_rent_estimate) return false
    }
    
    if (filters.location !== 'all' && analysis.city !== filters.location) return false
    return true
  })

  const getInvestmentBadge = (analysis: CompVisionAnalysis) => {
    const hasFlipData = analysis.flip_comps?.after_repair_value
    const hasRentalData = analysis.rental_comps?.market_rent_estimate
    
    if (hasFlipData && hasRentalData) return 'Both'
    if (hasFlipData) return 'Fix & Flip'
    if (hasRentalData) return 'Rental'
    return 'Analysis'
  }

  const getInvestmentColor = (analysis: CompVisionAnalysis) => {
    const hasFlipData = analysis.flip_comps?.after_repair_value
    const hasRentalData = analysis.rental_comps?.market_rent_estimate
    
    if (hasFlipData && hasRentalData) return 'default'
    if (hasFlipData) return 'secondary'
    if (hasRentalData) return 'outline'
    return 'outline'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading investment opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Investment Properties</h1>
          <p className="text-gray-600">Browse AI-analyzed properties with comprehensive investment metrics</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Price Range:</label>
              <select 
                className="border rounded px-3 py-1 text-sm"
                value={filters.priceRange}
                onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
              >
                <option value="all">All Prices</option>
                <option value="0-300000">Under $300K</option>
                <option value="300000-500000">$300K - $500K</option>
                <option value="500000-750000">$500K - $750K</option>
                <option value="750000">$750K+</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Investment Type:</label>
              <select 
                className="border rounded px-3 py-1 text-sm"
                value={filters.investmentType}
                onChange={(e) => setFilters({...filters, investmentType: e.target.value})}
              >
                <option value="all">All Types</option>
                <option value="flip">Fix & Flip</option>
                <option value="rental">Rental Property</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Location:</label>
              <select 
                className="border rounded px-3 py-1 text-sm"
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
              >
                <option value="all">All Cities</option>
                {Array.from(new Set(displayAnalyses.map(a => a.city))).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAnalyses.map((analysis) => (
          <Card key={analysis.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gray-200 relative">
              <Image 
                src={analysis.image_url} 
                alt={analysis.address}
                width={384}
                height={192}
                className="w-full h-full object-cover"
              />
              <Badge 
                className="absolute top-2 right-2" 
                variant={getInvestmentColor(analysis)}
              >
                {getInvestmentBadge(analysis)}
              </Badge>
              <Badge className="absolute top-2 left-2" variant="outline">
                {analysis.confidence}% Confidence
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">
                {analysis.address}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {analysis.city}, {analysis.state} {analysis.zip_code}
              </p>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">AI Estimated Value:</span>
                  <span className="font-semibold">${analysis.estimated_value?.toLocaleString()}</span>
                </div>
                
                {analysis.flip_comps?.after_repair_value && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ARV:</span>
                    <span className="font-semibold text-green-600">
                      ${analysis.flip_comps.after_repair_value.toLocaleString()}
                    </span>
                  </div>
                )}
                
                {analysis.rental_comps?.market_rent_estimate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Rent:</span>
                    <span className="font-semibold text-green-600">
                      ${analysis.rental_comps.market_rent_estimate.toLocaleString()}/mo
                    </span>
                  </div>
                )}
                
                {analysis.rental_comps?.cap_rate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cap Rate:</span>
                    <span className="font-semibold text-green-600">
                      {analysis.rental_comps.cap_rate}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {analysis.features?.slice(0, 3).map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature.name}
                    </Badge>
                  ))}
                  {analysis.features?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{analysis.features.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setSelectedAnalysis(analysis.id)}
                >
                  View Analysis
                </Button>
                <Button size="sm" variant="outline">
                  Contact
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Analyzed {new Date(analysis.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAnalyses.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No properties match your current filters.</p>
          <Button onClick={() => setFilters({ priceRange: 'all', investmentType: 'all', location: 'all' })}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Comp Vision Results Modal */}
      {selectedAnalysis && (
        <CompVisionResults 
          analysisId={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  )
}
