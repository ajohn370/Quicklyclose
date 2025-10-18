export interface InvestorProfile {
  id: string
  user_id: string
  full_name: string
  company_name?: string
  investment_focus: string[]
  minimum_investment: number
  maximum_investment: number
  preferred_locations: string[]
  phone?: string
  created_at: string
  updated_at: string
}

export interface SellerProfile {
  id: string
  user_id: string | null
  full_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  preferred_communication: 'email' | 'phone' | 'both'
  marketing_consent: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  seller_id: string
  address: string
  city: string
  state: string
  zip_code: string
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  lot_size?: number
  property_type: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land' | 'commercial'
  year_built?: number
  description?: string
  asking_price?: number
  estimated_value?: number
  status: 'active' | 'pending' | 'sold' | 'withdrawn'
  images: string[]
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  property_id?: string
  seller_id: string
  investor_id?: string
  lead_source: 'website' | 'referral' | 'advertisement' | 'direct'
  status: 'new' | 'contacted' | 'qualified' | 'scheduled' | 'evaluated' | 'offer_made' | 'accepted' | 'rejected' | 'closed'
  contact_method?: 'email' | 'phone' | 'text'
  notes?: string
  follow_up_date?: string
  created_at: string
  updated_at: string
}

export interface CompVisionAnalysis {
  id: string
  user_id: string
  property_id?: string | null
  image_url: string
  address: string
  city: string
  state: string
  zip_code: string
  features?: { name: string; confidence: number }[]
  flip_comps?: {
    after_repair_value?: number | null
    price_per_sqft?: number | null
    days_on_market?: number | null
    sale_to_list_ratio?: number | null
    renovation_grade?: string | null
    recent_sales?: any[]
    lot_size?: number | null
    zoning_potential?: string | null
    neighborhood_trends?: string | null
    property_type_match?: string | null
  }
  rental_comps?: {
    market_rent_estimate?: number | null
    rent_to_price_ratio?: number | null
    cap_rate?: number | null
    vacancy_rate?: number | null
    tenant_turnover?: string | null
    crime_rate?: string | null
    school_district_quality?: string | null
    transit_employment_access?: string | null
    hoa_fees?: number | null
    property_taxes?: number | null
  }
  similar_properties?: { 
    id: string
    address: string
    similarity: number
    price: number
    image: string
    property_type?: string
    sqft?: number
    bedrooms?: number
    bathrooms?: number
  }[]
  estimated_value?: number
  confidence?: number
  admin_approved?: boolean
  admin_notes?: string | null
  seller_visible_notes?: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'approved'
  created_at: string
  updated_at?: string
}

export interface Database {
  public: {
    Tables: {
      investor_profiles: {
        Row: InvestorProfile
        Insert: Omit<InvestorProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InvestorProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      seller_profiles: {
        Row: SellerProfile
        Insert: Omit<SellerProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SellerProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'id' | 'seller_id' | 'created_at' | 'updated_at'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>
      }
      comp_vision_analyses: {
        Row: CompVisionAnalysis
        Insert: Omit<CompVisionAnalysis, 'id' | 'created_at'>
        Update: Partial<Omit<CompVisionAnalysis, 'id' | 'created_at'>>
      }
    }
  }
}
