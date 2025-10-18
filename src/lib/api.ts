const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
}

export interface PropertyLead {
  id: string
  address: string
  city: string
  state: string
  zip: string
  bedrooms: number
  bathrooms: number
  sqft: number
  seller: {
    name: string
    email: string
    phone: string
  }
  status: 'new' | 'contacted' | 'scheduled' | 'evaluated' | 'offer_made' | 'closed'
  createdAt: string
}

export interface PropertyValuation {
  propertyId: string
  estimatedValue: number
  comparables: Array<{
    address: string
    price: number
    similarity: number
  }>
  confidence: number
}

export interface InvestorProfile {
  id: string
  name: string
  email: string
  phone: string
  budget: number
  preferences: {
    minBedrooms: number
    maxPrice: number
    preferredAreas: string[]
  }
}

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Property Leads
  async submitPropertyLead(lead: Omit<PropertyLead, 'id' | 'createdAt'>): Promise<ApiResponse<PropertyLead>> {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    })
  }

  async getPropertyLeads(): Promise<ApiResponse<PropertyLead[]>> {
    return this.request('/leads')
  }

  async updateLeadStatus(id: string, status: PropertyLead['status']): Promise<ApiResponse<PropertyLead>> {
    return this.request(`/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  // Property Valuation
  async requestValuation(propertyId: string): Promise<ApiResponse<PropertyValuation>> {
    return this.request(`/properties/${propertyId}/valuation`, {
      method: 'POST',
    })
  }

  async getValuation(propertyId: string): Promise<ApiResponse<PropertyValuation>> {
    return this.request(`/properties/${propertyId}/valuation`)
  }

  // Comp Vision
  async analyzePropertyImage(imageFile: File): Promise<ApiResponse<{
    features: Array<{ name: string; confidence: number }>
    similarProperties: Array<{
      id: string
      address: string
      similarity: number
      price: number
      image: string
    }>
    estimatedValue: number
  }>> {
    const formData = new FormData()
    formData.append('image', imageFile)

    return fetch(`${API_BASE_URL}/comp-vision/analyze`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json())
  }

  // Investor Management
  async createInvestorProfile(profile: Omit<InvestorProfile, 'id'>): Promise<ApiResponse<InvestorProfile>> {
    return this.request('/investors', {
      method: 'POST',
      body: JSON.stringify(profile),
    })
  }

  async getInvestorProfile(id: string): Promise<ApiResponse<InvestorProfile>> {
    return this.request(`/investors/${id}`)
  }

  async updateInvestorProfile(id: string, updates: Partial<InvestorProfile>): Promise<ApiResponse<InvestorProfile>> {
    return this.request(`/investors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  // Property Feed for Investors
  async getAvailableProperties(filters?: {
    minPrice?: number
    maxPrice?: number
    minBedrooms?: number
    city?: string
    state?: string
  }): Promise<ApiResponse<Array<{
    id: string
    address: string
    city: string
    state: string
    price: number
    bedrooms: number
    bathrooms: number
    sqft: number
    images: string[]
    status: string
    listingDate: string
  }>>> {
    const queryParams = filters ? `?${new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString()
        return acc
      }, {} as Record<string, string>)
    )}` : ''

    return this.request(`/properties${queryParams}`)
  }

  // Bidding System
  async submitBid(propertyId: string, bid: {
    amount: number
    investorId: string
    terms?: string
  }): Promise<ApiResponse<{
    id: string
    propertyId: string
    investorId: string
    amount: number
    status: 'pending' | 'accepted' | 'rejected'
    submittedAt: string
  }>> {
    return this.request(`/properties/${propertyId}/bids`, {
      method: 'POST',
      body: JSON.stringify(bid),
    })
  }

  async getBidsForProperty(propertyId: string): Promise<ApiResponse<Array<{
    id: string
    investorId: string
    amount: number
    status: string
    submittedAt: string
  }>>> {
    return this.request(`/properties/${propertyId}/bids`)
  }
}

export const api = new ApiClient()