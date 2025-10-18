"use client"

import { useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import ExifReader from 'exifreader'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CompVisionAnalysis } from '@/types'
import { useAuth } from '@/lib/auth-context'
import { usStates } from '@/lib/states'

interface CompVisionForm {
  street: string
  city: string
  state: string
  zip: string
  image: File | null
}

export function CompVision() {
  const { user } = useAuth()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<CompVisionAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<CompVisionForm>({
    defaultValues: { image: null }
  })

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setError(null)
      setAnalysisResult(null)

      // Validate image
      try {
        const tags = await ExifReader.load(file)
        if (!tags.DateTimeOriginal) {
          throw new Error('Image is missing creation date. Please upload an original photo, not a screenshot.')
        }

        const dateTakenStr = tags.DateTimeOriginal.description.replace(':', '-').replace(':', '-')
        const dateTaken = new Date(dateTakenStr)
        
        const sixWeeksAgo = new Date()
        sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42)

        if (dateTaken < sixWeeksAgo) {
          throw new Error('Image is older than 6 weeks. Please upload a more recent photo.')
        }

        setValue('image', file)
        const reader = new FileReader()
        reader.onload = (e) => setPreviewUrl(e.target?.result as string)
        reader.readAsDataURL(file)

      } catch (err: any) {
        setError(err.message)
        clearSelection()
      }
    }
  }

  const analyzeProperty = async (data: CompVisionForm) => {
    if (!user) {
      setError("You must be logged in to analyze properties.")
      return
    }
    if (!data.image) {
      setError("Please upload an image.")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('image', data.image)
    formData.append('street', data.street)
    formData.append('city', data.city)
    formData.append('state', data.state)
    formData.append('zip', data.zip)

    try {
      const response = await fetch('/api/comp-vision/analyze', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Analysis failed.')
      }
      
      setAnalysisResult(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearSelection = () => {
    setValue('image', null)
    setPreviewUrl(null)
    setAnalysisResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit(analyzeProperty)} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Enter the full address and upload an exterior photo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input id="street" {...register('street', { required: 'Street address is required' })} />
                {errors.street && <p className="text-sm text-red-600 mt-1">{errors.street.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city', { required: 'City is required' })} />
                  {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" {...register('zip', { required: 'ZIP code is required' })} />
                  {errors.zip && <p className="text-sm text-red-600 mt-1">{errors.zip.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Controller
                  name="state"
                  control={control}
                  rules={{ required: 'State is required' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {usStates.map(s => <SelectItem key={s.abbreviation} value={s.abbreviation}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Image</CardTitle>
              <CardDescription>Upload a recent, original exterior photo.</CardDescription>
            </CardHeader>
            <CardContent>
              {previewUrl ? (
                <div className="relative">
                  <Image src={previewUrl} alt="Selected property" width={500} height={256} className="w-full h-64 object-cover rounded-lg" />
                  <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={clearSelection}>Remove</Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <p>Click to upload</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleImageUpload} />
              {errors.image && <p className="text-sm text-red-600 mt-1">{errors.image.message}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <Button type="submit" disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? 'Analyzing...' : 'Analyze Property'}
          </Button>
          {isAnalyzing && <Progress value={undefined} />}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {analysisResult && (
            <>
              {/* Estimated Value */}
              <Card>
                <CardHeader>
                  <CardTitle>Estimated Value</CardTitle>
                  <CardDescription>AI-powered property valuation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      ${analysisResult.estimated_value?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Confidence: {analysisResult.confidence || 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Fix & Flip Comps */}
              {analysisResult.flip_comps && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fix & Flip Analysis</CardTitle>
                    <CardDescription>Investment metrics for flippers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">After Repair Value</p>
                        <p className="font-semibold">
                          ${analysisResult.flip_comps.after_repair_value?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Price/sqft</p>
                        <p className="font-semibold">
                          ${analysisResult.flip_comps.price_per_sqft || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Days on Market</p>
                        <p className="font-semibold">
                          {analysisResult.flip_comps.days_on_market || 'N/A'} days
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sale-to-List Ratio</p>
                        <p className="font-semibold">
                          {analysisResult.flip_comps.sale_to_list_ratio ? 
                            `${(analysisResult.flip_comps.sale_to_list_ratio * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Renovation Grade</p>
                        <p className="font-semibold">
                          {analysisResult.flip_comps.renovation_grade || 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Neighborhood Trends</p>
                        <p className="font-semibold">
                          {analysisResult.flip_comps.neighborhood_trends || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rental Comps */}
              {analysisResult.rental_comps && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rental Analysis</CardTitle>
                    <CardDescription>Buy-and-hold investment metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Market Rent</p>
                        <p className="font-semibold">
                          ${analysisResult.rental_comps.market_rent_estimate?.toLocaleString() || 'N/A'}/mo
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rent-to-Price</p>
                        <p className="font-semibold">
                          {analysisResult.rental_comps.rent_to_price_ratio ? 
                            `${(analysisResult.rental_comps.rent_to_price_ratio * 100).toFixed(2)}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cap Rate</p>
                        <p className="font-semibold">
                          {analysisResult.rental_comps.cap_rate ? 
                            `${analysisResult.rental_comps.cap_rate.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Vacancy Rate</p>
                        <p className="font-semibold">
                          {analysisResult.rental_comps.vacancy_rate ? 
                            `${analysisResult.rental_comps.vacancy_rate.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">School District</p>
                        <p className="font-semibold">
                          {analysisResult.rental_comps.school_district_quality || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Crime Rate</p>
                        <p className="font-semibold">
                          {analysisResult.rental_comps.crime_rate || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Property Taxes</p>
                        <p className="font-semibold">
                          ${analysisResult.rental_comps.property_taxes?.toLocaleString() || 'N/A'}/yr
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">HOA Fees</p>
                        <p className="font-semibold">
                          ${analysisResult.rental_comps.hoa_fees || 0}/mo
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Similar Properties */}
              <Card>
                <CardHeader>
                  <CardTitle>Similar Properties</CardTitle>
                  <CardDescription>Comparable properties in the area</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisResult.similar_properties?.slice(0, 3).map((property, index) => (
                    <div key={property.id} className="flex gap-4 p-3 border rounded-lg">
                      <Image 
                        src={property.image} 
                        alt={property.address} 
                        width={96}
                        height={80}
                        className="w-24 h-20 bg-gray-200 rounded object-cover flex-shrink-0" 
                      />
                      <div className="flex-grow">
                        <h4 className="text-sm font-medium">{property.address}</h4>
                        <p className="text-lg font-semibold text-green-600">
                          ${property.price.toLocaleString()}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{property.similarity}% match</Badge>
                          {property.property_type && (
                            <Badge variant="secondary">{property.property_type}</Badge>
                          )}
                        </div>
                        {(property.bedrooms || property.bathrooms || property.sqft) && (
                          <p className="text-xs text-gray-600 mt-1">
                            {property.bedrooms && `${property.bedrooms} bed`}
                            {property.bathrooms && ` • ${property.bathrooms} bath`}
                            {property.sqft && ` • ${property.sqft.toLocaleString()} sqft`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
