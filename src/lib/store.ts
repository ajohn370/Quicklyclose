import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface Property {
  id: string
  address: string
  city: string
  state: string
  zip: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  images: string[]
  status: 'active' | 'pending' | 'sold'
  listingDate: string
}

interface Seller {
  id: string
  name: string
  email: string
  phone: string
  property?: Property
  status: 'new' | 'contacted' | 'scheduled' | 'evaluated' | 'offer_made' | 'closed'
}

interface Investor {
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
  watchlist: string[]
}

interface AppState {
  sellers: Seller[]
  investors: Investor[]
  properties: Property[]
  user: {
    id: string
    role: 'admin' | 'seller' | 'investor'
    name: string
    email: string
  } | null
  
  // Actions
  addSeller: (seller: Omit<Seller, 'id'>) => void
  updateSeller: (id: string, updates: Partial<Seller>) => void
  addInvestor: (investor: Omit<Investor, 'id'>) => void
  updateInvestor: (id: string, updates: Partial<Investor>) => void
  addProperty: (property: Omit<Property, 'id'>) => void
  updateProperty: (id: string, updates: Partial<Property>) => void
  setUser: (user: AppState['user']) => void
}

export const useStore = create<AppState>()(
  devtools(
    (set, get) => ({
      sellers: [],
      investors: [],
      properties: [],
      user: null,

      addSeller: (seller) => set((state) => ({
        sellers: [...state.sellers, { ...seller, id: crypto.randomUUID() }]
      })),

      updateSeller: (id, updates) => set((state) => ({
        sellers: state.sellers.map(seller => 
          seller.id === id ? { ...seller, ...updates } : seller
        )
      })),

      addInvestor: (investor) => set((state) => ({
        investors: [...state.investors, { ...investor, id: crypto.randomUUID() }]
      })),

      updateInvestor: (id, updates) => set((state) => ({
        investors: state.investors.map(investor => 
          investor.id === id ? { ...investor, ...updates } : investor
        )
      })),

      addProperty: (property) => set((state) => ({
        properties: [...state.properties, { ...property, id: crypto.randomUUID() }]
      })),

      updateProperty: (id, updates) => set((state) => ({
        properties: state.properties.map(property => 
          property.id === id ? { ...property, ...updates } : property
        )
      })),

      setUser: (user) => set({ user })
    })
  )
)