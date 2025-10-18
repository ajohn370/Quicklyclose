"use client"

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { mockCompVisionAnalyses } from '@/lib/mock-data'
import { BiddingPanel } from '@/components/features/Bidding'
import Image from 'next/image'

interface FlipComps {
  after_repair_value: number | null
  price_per_sqft: number | null
  days_on_market: number | null
  sale_to_list_ratio: number | null
  renovation_grade: string | null
  recent_sales: any[]
  lot_size: number | null
  zoning_potential: string | null
  neighborhood_trends: string | null
  property_type_match: string | null
}

interface RentalComps {
  market_rent_estimate: number | null
  rent_to_price_ratio: number | null
  cap_rate: number | null
  vacancy_rate: number | null
  tenant_turnover: string | null
  crime_rate: string | null
  school_district_quality: string | null
  transit_employment_access: string | null
  hoa_fees: number | null
  property_taxes: number | null
}

interface SimilarProperty {
  id: string
  address: string
  similarity: number
  price: number
  image: string
  property_type?: string
  sqft?: number
  bedrooms?: number
  bathrooms?: number
}

interface AnalysisResult {
  id: string
  features: { name: string; confidence: number }[]
  flip_comps: FlipComps
  rental_comps: RentalComps
  similar_properties: SimilarProperty[]
  estimated_value: number
  confidence: number
  address: string
  city: string
  state: string
  zip_code: string
  image_url: string
  admin_approved: boolean
  seller_visible_notes: string | null
  status: string
}

interface CompVisionResultsProps {
  analysisId: string
  onClose: () => void
}

export function CompVisionResults({ analysisId, onClose }: CompVisionResultsProps) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'flip' | 'rental' | 'bidding'>('overview')
  const supabase = createClient()

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      // Check if this is a demo/mock analysis ID
      if (analysisId.startsWith('demo-')) {
        // Use mock data for demo analyses
        const mockAnalysis = mockCompVisionAnalyses.find(analysis => analysis.id === analysisId)
        if (mockAnalysis) {
          setResult(mockAnalysis as any)
          return
        }
      }
      
      // Fetch data from API endpoint
      const response = await fetch(`/api/comp-vision/analyses/${analysisId}`)
      
      if (response.ok) {
        const apiData = await response.json()
        if (apiData.success && apiData.data) {
          setResult(apiData.data)
          return
        }
      }

      // If API fails and no data found, try to find in mock data as fallback
      const mockAnalysis = mockCompVisionAnalyses.find(analysis => analysis.id === analysisId)
      if (mockAnalysis) {
        setResult(mockAnalysis as any)
        return
      }

      // Fallback to direct Supabase query (shouldn't reach here normally)
      const { data, error } = await supabase
        .from('comp_vision_analyses')
        .select('*')
        .eq('id', analysisId)
        .single()

      if (error) {
        console.error('Error fetching analysis from Supabase:', error)
        return
      }

      // Transform Supabase data to match component interface
      const transformedData = {
        ...data,
        flip_comps: data.flip_comps || {
          after_repair_value: null,
          price_per_sqft: null,
          days_on_market: null,
          sale_to_list_ratio: null,
          renovation_grade: null,
          recent_sales: [],
          lot_size: null,
          zoning_potential: null,
          neighborhood_trends: null,
          property_type_match: null
        },
        rental_comps: data.rental_comps || {
          market_rent_estimate: null,
          rent_to_price_ratio: null,
          cap_rate: null,
          vacancy_rate: null,
          tenant_turnover: null,
          crime_rate: null,
          school_district_quality: null,
          transit_employment_access: null,
          hoa_fees: null,
          property_taxes: null
        },
        similar_properties: data.similar_properties || [],
        features: data.features || []
      }

      setResult(transformedData)
    } catch (error) {
      console.error('Error in fetchAnalysis:', error)
      // Final fallback to mock data
      const mockAnalysis = mockCompVisionAnalyses.find(analysis => analysis.id === analysisId)
      if (mockAnalysis) {
        console.log('Using mock data fallback for analysis:', analysisId)
        setResult(mockAnalysis as any)
      } else {
        console.error('No mock data found for analysis:', analysisId)
      }
    } finally {
      setLoading(false)
    }
  }, [analysisId, supabase])

  useEffect(() => {
    setIsMounted(true)
    fetchAnalysis()
  }, [fetchAnalysis])

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Comprehensive Property Analysis</CardTitle>
              <CardDescription>
                {result ? `${result.address}, ${result.city}, ${result.state} ${result.zip_code}` : `Analysis ID: ${analysisId}`}
              </CardDescription>
              {result && !result.admin_approved && (
                <Badge variant="outline" className="mt-2">Pending Admin Approval</Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              &times;
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading comprehensive analysis...</div>
          ) : result ? (
            <div className="space-y-6">
              {/* Property Image and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Image 
                    src={result.image_url} 
                    alt="Property" 
                    width={400}
                    height={256}
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                </div>
                <div className="space-y-4">
                  <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
                    <p className="text-sm text-gray-600">AI Estimated Value</p>
                    <p className="text-4xl font-bold text-green-600">${result.estimated_value?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Confidence: {result.confidence}%</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Detected Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.features?.map((feature, index) => (
                        <Badge key={index} variant="secondary">
                          {feature.name} ({feature.confidence}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs for Different Investor Types */}
              <div className="border-b">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview & Comps
                  </button>
                  <button
                    onClick={() => setActiveTab('flip')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'flip' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Fix & Flip Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('rental')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'rental' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Rental Investment
                  </button>
                  <button
                    onClick={() => setActiveTab('bidding')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'bidding' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Place Bid
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Similar Properties */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Similar Properties</CardTitle>
                      <CardDescription>Comparable properties used in valuation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.similar_properties?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {result.similar_properties.map((property) => (
                            <div key={property.id} className="border rounded-lg p-4">
                              <Image 
                                src={property.image} 
                                alt={property.address}
                                width={200}
                                height={150}
                                className="w-full h-32 object-cover rounded mb-3"
                              />
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{property.address}</p>
                                <p className="text-lg font-bold text-green-600">${property.price?.toLocaleString()}</p>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>{property.sqft} sq ft</span>
                                  <span>{property.similarity}% match</span>
                                </div>
                                {property.bedrooms && property.bathrooms && (
                                  <p className="text-xs text-gray-500">
                                    {property.bedrooms} bed, {property.bathrooms} bath
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No comparable properties found</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'flip' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Fix & Flip Investment Analysis</CardTitle>
                      <CardDescription>Analysis for property renovation and resale</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">After Repair Value</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ${result.flip_comps?.after_repair_value?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Price per Sq Ft</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${result.flip_comps?.price_per_sqft || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Days on Market</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {result.flip_comps?.days_on_market || 'N/A'} days
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Sale to List Ratio</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {result.flip_comps?.sale_to_list_ratio ? `${(result.flip_comps.sale_to_list_ratio * 100).toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Renovation Grade</p>
                          <p className="text-xl font-bold text-indigo-600">
                            {result.flip_comps?.renovation_grade || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Lot Size</p>
                          <p className="text-xl font-bold text-teal-600">
                            {result.flip_comps?.lot_size ? `${result.flip_comps.lot_size.toLocaleString()} sq ft` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Additional Flip Analysis */}
                      <div className="mt-6 space-y-4">
                        {result.flip_comps?.zoning_potential && (
                          <div>
                            <h4 className="font-medium text-gray-900">Zoning Potential</h4>
                            <p className="text-gray-600">{result.flip_comps.zoning_potential}</p>
                          </div>
                        )}
                        {result.flip_comps?.neighborhood_trends && (
                          <div>
                            <h4 className="font-medium text-gray-900">Neighborhood Trends</h4>
                            <p className="text-gray-600">{result.flip_comps.neighborhood_trends}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'rental' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rental Investment Analysis</CardTitle>
                      <CardDescription>Analysis for buy-and-hold rental investment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Market Rent Estimate</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${result.rental_comps?.market_rent_estimate?.toLocaleString() || 'N/A'}/mo
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Rent to Price Ratio</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {result.rental_comps?.rent_to_price_ratio ? `${(result.rental_comps.rent_to_price_ratio * 100).toFixed(2)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Cap Rate</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {result.rental_comps?.cap_rate ? `${(result.rental_comps.cap_rate * 100).toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Vacancy Rate</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {result.rental_comps?.vacancy_rate ? `${(result.rental_comps.vacancy_rate * 100).toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">HOA Fees</p>
                          <p className="text-xl font-bold text-red-600">
                            ${result.rental_comps?.hoa_fees || 0}/mo
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Property Taxes</p>
                          <p className="text-xl font-bold text-indigo-600">
                            ${result.rental_comps?.property_taxes?.toLocaleString() || 'N/A'}/yr
                          </p>
                        </div>
                      </div>

                      {/* Additional Rental Analysis */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Area Quality Factors</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Crime Rate</span>
                              <Badge variant={result.rental_comps?.crime_rate === 'low' ? 'default' : 'secondary'}>
                                {result.rental_comps?.crime_rate || 'N/A'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>School District</span>
                              <Badge variant={result.rental_comps?.school_district_quality === 'excellent' ? 'default' : 'secondary'}>
                                {result.rental_comps?.school_district_quality || 'N/A'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Transit Access</span>
                              <Badge variant="outline">
                                {result.rental_comps?.transit_employment_access || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Tenant Information</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Tenant Turnover</span>
                              <span className="text-gray-600">{result.rental_comps?.tenant_turnover || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'bidding' && (
                <div className="space-y-6">
                  <BiddingPanel 
                    propertyId={analysisId}
                    propertyDetails={{
                      address: result.address,
                      city: result.city,
                      state: result.state,
                      listingPrice: result.estimated_value,
                      bedrooms: 0, // Not available in analysis data
                      bathrooms: 0, // Not available in analysis data
                      sqft: 0, // Not available in analysis data
                      yearBuilt: 0 // Not available in analysis data
                    }}
                  />
                </div>
              )}

              {/* Admin Notes (if available) */}
              {result.seller_visible_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{result.seller_visible_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">No analysis found for this ID.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  if (!isMounted) return null
  
  const portalRoot = document.getElementById('modal-root')
  if (!portalRoot) return modalContent

  return createPortal(modalContent, portalRoot)
}
