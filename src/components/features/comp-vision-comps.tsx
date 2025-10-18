import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface CompVisionCompsProps {
  activeTab: 'overview' | 'flip' | 'rental'
  flip_comps: FlipComps
  rental_comps: RentalComps
  similar_properties: SimilarProperty[]
}

export function CompVisionComps({ activeTab, flip_comps, rental_comps, similar_properties }: CompVisionCompsProps) {
  return (
    <>
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-4">Similar Properties</h4>
            <div className="grid gap-4">
              {similar_properties?.map((property, index) => (
                <div key={index} className="flex gap-4 p-4 border rounded-lg items-center">
                  <Image 
                    src={property.image || '/api/placeholder/150/100'} 
                    alt={property.address} 
                    width={128}
                    height={80}
                    className="w-32 h-20 bg-gray-200 rounded object-cover" 
                  />
                  <div className="flex-1">
                    <h5 className="text-sm font-medium">{property.address}</h5>
                    <p className="text-lg font-semibold text-green-600">${property.price?.toLocaleString()}</p>
                    {property.sqft && (
                      <p className="text-xs text-gray-500">
                        {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft} sqft
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{property.similarity}% match</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'flip' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">After Repair Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  ${flip_comps?.after_repair_value?.toLocaleString() || 'N/A'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Price per Sqft</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${flip_comps?.price_per_sqft || 'N/A'}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Days on Market</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{flip_comps?.days_on_market || 'N/A'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sale to List Ratio:</span>
                  <span className="font-semibold">{flip_comps?.sale_to_list_ratio ? `${(flip_comps.sale_to_list_ratio * 100).toFixed(1)}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lot Size:</span>
                  <span className="font-semibold">{flip_comps?.lot_size || 'N/A'} acres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Zoning:</span>
                  <span className="font-semibold">{flip_comps?.zoning_potential || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Renovation Grade:</span>
                  <span className="font-semibold">{flip_comps?.renovation_grade || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="font-semibold">{flip_comps?.property_type_match || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Neighborhood Trends:</span>
                  <span className="font-semibold text-sm">{flip_comps?.neighborhood_trends || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'rental' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Market Rent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  ${rental_comps?.market_rent_estimate?.toLocaleString() || 'N/A'}/mo
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Cap Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {rental_comps?.cap_rate ? `${rental_comps.cap_rate}%` : 'N/A'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Rent/Price Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {rental_comps?.rent_to_price_ratio ? `${(rental_comps.rent_to_price_ratio * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vacancy Rate:</span>
                  <span className="font-semibold">{rental_comps?.vacancy_rate ? `${rental_comps.vacancy_rate}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tenant Turnover:</span>
                  <span className="font-semibold text-sm">{rental_comps?.tenant_turnover || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Crime Rate:</span>
                  <span className="font-semibold">{rental_comps?.crime_rate || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Area Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">School District:</span>
                  <span className="font-semibold">{rental_comps?.school_district_quality || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transit Access:</span>
                  <span className="font-semibold text-sm">{rental_comps?.transit_employment_access || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">HOA Fees:</span>
                  <span className="font-semibold">${rental_comps?.hoa_fees?.toLocaleString() || '0'}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Taxes:</span>
                  <span className="font-semibold">${rental_comps?.property_taxes ? Math.round(rental_comps.property_taxes / 12).toLocaleString() : '0'}/mo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
