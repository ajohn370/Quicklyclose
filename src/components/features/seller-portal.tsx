"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AuthModal } from '@/components/features/auth-modal'
import { Mail, Search, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react'
import Link from 'next/link'

// Status Checker Component for unauthenticated users
function StatusChecker() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/sellers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to check status')
      }

      setStatus(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (accountStatus: string) => {
    switch (accountStatus) {
      case 'activated':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending_activation':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusText = (accountStatus: string) => {
    switch (accountStatus) {
      case 'activated':
        return 'Account Active'
      case 'pending_activation':
        return 'Pending Activation'
      default:
        return 'Unknown Status'
    }
  }

  const getStatusColor = (accountStatus: string) => {
    switch (accountStatus) {
      case 'activated':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'pending_activation':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      default:
        return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  if (status) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${getStatusColor(status.accountStatus)}`}>
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(status.accountStatus)}
            <h4 className="font-medium">{getStatusText(status.accountStatus)}</h4>
          </div>
          <p className="text-sm mb-2">
            <strong>{status.seller.name}</strong> • {status.seller.email}
          </p>
          {status.accountStatus === 'pending_activation' && (
            <p className="text-sm">
              Check your email for the account activation link to access your seller dashboard.
            </p>
          )}
        </div>

        {status.properties.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Your Property Submissions</h5>
            <div className="space-y-3">
              {status.properties.map((property: any) => (
                <div key={property.id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{property.address}</p>
                      <p className="text-sm text-gray-600">
                        {property.city}, {property.state} {property.zipCode}
                      </p>
                    </div>
                    <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                      {property.status || 'Under Review'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    Submitted: {new Date(property.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setStatus(null)
            setEmail('')
            setError(null)
          }}
        >
          Check Another Email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleCheck} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
        <Button type="submit" disabled={loading} variant="outline">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  )
}

interface PropertyForm {
  address: string
  city: string
  state: string
  zip: string
  bedrooms: number
  bathrooms: number
  sqft: number
  propertyImages?: FileList
}

interface SellerForm {
  name: string
  email: string
  phone: string
}

export function SellerPortal() {
  const { user, loading: authLoading, signOut, userRole, sellerProfile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sellerData, setSellerData] = useState<SellerForm | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [userProperties, setUserProperties] = useState<any[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authTimeout, setAuthTimeout] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)

  const sellerForm = useForm<SellerForm>()
  const propertyForm = useForm<PropertyForm>()

  // Quick check for auth status without blocking unauthenticated users
  useEffect(() => {
    // Always stop checking when auth loading is complete
    if (!authLoading) {
      setCheckingAuth(false)
    }
  }, [authLoading])

  // Add timeout safeguard to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || checkingAuth) {
        console.warn('Auth loading timeout - forcing completion')
        setCheckingAuth(false)
        setAuthTimeout(true)
      }
    }, 3500) // 3.5 second timeout (slightly longer than auth context)

    return () => clearTimeout(timeout)
  }, [authLoading, checkingAuth])

  // Load user's properties if authenticated as seller or has seller profile
  useEffect(() => {
    if (user && (userRole === 'seller' || sellerProfile)) {
      loadUserProperties()
    }
  }, [user, userRole, sellerProfile])

  // Additional safeguard: if user is logged in but not as seller, and they have seller profile
  useEffect(() => {
    if (user && userRole && userRole !== 'seller') {
      // Check if they have a seller profile and should be using seller role
      console.log('⚠️ User logged in with non-seller role in seller portal:', { userRole, user: user.email })
    }
  }, [user, userRole])

  const loadUserProperties = async () => {
    setLoadingProperties(true)
    try {
      const response = await fetch('/api/properties')
      const result = await response.json()
      if (result.success) {
        setUserProperties(result.data || [])
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoadingProperties(false)
    }
  }

  const onSellerSubmit = (data: SellerForm) => {
    setSellerData(data)
    setStep(2)
  }

  const onPropertySubmit = async (data: PropertyForm) => {
    if (!sellerData) return

    setIsLoading(true)
    setError(null)

    try {
      // First submit the property to get the property ID
      const response = await fetch('/api/sellers/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller: sellerData,
          property: data,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit property.')
      }

      // Store submission result for display
      setSubmissionResult(result)

      // Upload images if any are selected
      let imageUrls: string[] = []
      if (selectedImages.length > 0 && result.data?.propertyId) {
        try {
          imageUrls = await uploadImages(result.data.propertyId)
        } catch (imageError) {
          console.error('Image upload failed:', imageError)
          // Don't fail the entire submission if images fail
          setError('Property submitted successfully, but some images failed to upload')
        }
      }

      // ALWAYS trigger n8n analysis for property valuation
      // n8n will analyze the property with or without images
      try {
        console.log('Triggering n8n property analysis...')
        const analysisResponse = await fetch('/api/comp-ai/v1/analyze', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer internal-service-key-quicklyclose-2024`
          },
          body: JSON.stringify({
            // Use first uploaded image if available, otherwise use placeholder
            imageUrl: imageUrls.length > 0 ? imageUrls[0] : 'https://quicklyclose.com/placeholder-property.jpg',
            address: {
              street: data.address,
              city: data.city,
              state: data.state,
              zip: data.zip
            },
            requestId: `seller-${result.data?.propertyId || Date.now()}-${Date.now()}`,
            userId: user?.id || 'anonymous'
          }),
        })
        
        const analysisResult = await analysisResponse.json()
        console.log('n8n analysis result:', analysisResult)
        
        if (!analysisResponse.ok) {
          console.error('n8n analysis failed with status:', analysisResponse.status, analysisResult)
        }
      } catch (analysisError) {
        console.error('n8n analysis error:', analysisError)
        // Don't fail submission if analysis fails - property is still submitted
      }

      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSellerData(null)
    setError(null)
    setSelectedImages([])
    setImagePreviews([])
    setSubmissionResult(null)
    sellerForm.reset()
    propertyForm.reset()
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    })

    if (validFiles.length + selectedImages.length > 6) {
      setError('You can upload a maximum of 6 images')
      return
    }

    setSelectedImages(prev => [...prev, ...validFiles])

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (propertyId: string): Promise<string[]> => {
    if (selectedImages.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (const image of selectedImages) {
        const formData = new FormData()
        formData.append('file', image)
        formData.append('propertyId', propertyId)

        const response = await fetch('/api/upload/property-image', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          uploadedUrls.push(result.url)
        }
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      throw new Error('Failed to upload property images')
    } finally {
      setUploadingImages(false)
    }

    return uploadedUrls
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/marketing')
    } catch (error) {
      console.error('Signout error:', error)
      // Even if signout fails, redirect to home
      router.push('/marketing')
    }
  }

  const progressValue = (step / 3) * 100
  // Allow authenticated users with seller profiles to see the seller dashboard
  // This is more flexible than strict role checking
  const isAuthenticated = user && (userRole === 'seller' || sellerProfile)

  // Only show loading during initial auth check (with timeout protection)
  if ((authLoading || checkingAuth) && !authTimeout) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Authenticated seller dashboard
  if (isAuthenticated && !showForm) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Properties</h1>
          <p className="text-gray-600">Manage your property listings and track offers</p>
        </div>

        <div className="mb-6">
          <Button onClick={() => setShowForm(true)} size="lg">
            Sell Another Property
          </Button>
        </div>

        {loadingProperties ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : userProperties.length > 0 ? (
          <div className="space-y-6">
            {userProperties.map((property) => (
              <Card key={property.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{property.address}</CardTitle>
                      <CardDescription>
                        {property.city}, {property.state} {property.zip}
                      </CardDescription>
                    </div>
                    <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                      {property.status || 'Under Review'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Bedrooms</span>
                      <p className="font-medium">{property.bedrooms}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Bathrooms</span>
                      <p className="font-medium">{property.bathrooms}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Square Feet</span>
                      <p className="font-medium">{property.sqft?.toLocaleString()}</p>
                    </div>
                  </div>
                  {property.estimated_value && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500">Estimated Value</span>
                      <p className="text-2xl font-bold text-green-600">
                        ${property.estimated_value.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Submitted: {new Date(property.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h3>
              <p className="text-gray-600 mb-4">Submit your first property to get started</p>
              <Button onClick={() => setShowForm(true)}>
                Submit Your First Property
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Property submission form (for both authenticated and unauthenticated users)
  return (
    <div className="max-w-2xl mx-auto p-6">
      {isAuthenticated && (
        <div className="mb-6">
          <Button variant="outline" onClick={() => setShowForm(false)}>
            ← Back to Dashboard
          </Button>
        </div>
      )}
      
      {/* Show auth timeout info if needed */}
      {authTimeout && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You can submit a property without creating an account. We&apos;ll send you an activation link via email to track your submission.
          </p>
        </div>
      )}

      {/* Seller Authentication Section - Show only for unauthenticated users */}
      {!isAuthenticated && (
        <div className="mb-8 space-y-6">
          {/* Quick Status Check */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Already Submitted a Property?</CardTitle>
              <CardDescription>Enter your email to check your submission status</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusChecker />
            </CardContent>
          </Card>

          {/* Authentication Options */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started as a Seller</h2>
              <p className="text-gray-600 mb-4">
                Create a seller account to manage your properties and track offers
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Sign Up as Seller
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                >
                  Seller Login
                </Button>
              </div>
            </div>
            <div className="text-center text-sm text-gray-600">
              <p>Or continue below to submit a property without an account</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sell Your Property Fast</h1>
        <p className="text-gray-600">Get a cash offer in 24 hours</p>
        <Progress value={progressValue} className="mt-4" />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tell Us About Yourself</CardTitle>
            <CardDescription>We&apos;ll need some basic information to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={sellerForm.handleSubmit(onSellerSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...sellerForm.register('name', { required: true })}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...sellerForm.register('email', { required: true })}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...sellerForm.register('phone', { required: true })}
                  placeholder="Enter your phone number"
                />
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>Tell us about your property</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={propertyForm.handleSubmit(onPropertySubmit)} className="space-y-4">
              <div>
                <Label htmlFor="address">Property Address</Label>
                <Input
                  id="address"
                  {...propertyForm.register('address', { required: true })}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...propertyForm.register('city', { required: true })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    {...propertyForm.register('state', { required: true })}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    {...propertyForm.register('zip', { required: true })}
                    placeholder="ZIP"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    {...propertyForm.register('bedrooms', { required: true, valueAsNumber: true })}
                    placeholder="3"
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    step="0.5"
                    {...propertyForm.register('bathrooms', { required: true, valueAsNumber: true })}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label htmlFor="sqft">Square Feet</Label>
                  <Input
                    id="sqft"
                    type="number"
                    {...propertyForm.register('sqft', { required: true, valueAsNumber: true })}
                    placeholder="1500"
                  />
                </div>
              </div>

              {/* Property Images Upload */}
              <div className="space-y-4">
                <Label htmlFor="property-images">Property Images (Optional)</Label>
                <p className="text-sm text-gray-500">
                  Upload up to 6 high-quality photos of your property for AI analysis. This helps provide more accurate valuations.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {selectedImages.length < 6 && (
                    <label className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-gray-500">Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                
                {selectedImages.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                    {uploadingImages && ' • Uploading...'}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Property'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>Your property has been submitted successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Property Submitted!</h3>
              
              {!isAuthenticated ? (
                <div className="space-y-4 mb-6">
                  <p className="text-gray-600">
                    We&apos;ll evaluate your property and get back to you with an offer within 24 hours.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <div className="flex items-start space-x-3">
                      <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Check Your Email</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          We&apos;ve sent you an account activation link at <strong>{submissionResult?.data?.email || sellerData?.email}</strong>
                        </p>
                        <p className="text-sm text-blue-700">
                          Click the link to create your seller account and track your property submission, offers, and communications all in one place.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Our team will analyze your property details</li>
                      <li>• You&apos;ll receive a competitive cash offer within 24 hours</li>
                      <li>• Track everything through your seller dashboard (activate your account first)</li>
                      <li>• No obligations - review the offer and decide what&apos;s best for you</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 mb-6">
                  We&apos;ll evaluate your property and get back to you with an offer within 24 hours.
                  You can track the progress in your seller dashboard.
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={resetForm} variant="outline">
                  Submit Another Property
                </Button>
                {!isAuthenticated && (
                  <Button 
                    onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Access Seller Dashboard
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auth Modal for Sellers */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
        userRole="seller"
      />
    </div>
  )
}
