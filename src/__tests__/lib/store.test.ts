import { useStore } from '@/lib/store'
import { renderHook, act } from '@testing-library/react'

describe('Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useStore())
    act(() => {
      // Clear all data
      result.current.sellers.length = 0
      result.current.investors.length = 0  
      result.current.properties.length = 0
      result.current.user = null
    })
  })

  describe('Seller Management', () => {
    it('adds a seller', () => {
      const { result } = renderHook(() => useStore())

      const seller = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        status: 'new' as const
      }

      act(() => {
        result.current.addSeller(seller)
      })

      expect(result.current.sellers).toHaveLength(1)
      expect(result.current.sellers[0]).toMatchObject(seller)
      expect(result.current.sellers[0].id).toBeDefined()
    })

    it('updates a seller', () => {
      const { result } = renderHook(() => useStore())

      const seller = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        status: 'new' as const
      }

      act(() => {
        result.current.addSeller(seller)
      })

      const sellerId = result.current.sellers[0].id

      act(() => {
        result.current.updateSeller(sellerId, { status: 'contacted' })
      })

      expect(result.current.sellers[0].status).toBe('contacted')
    })
  })

  describe('Investor Management', () => {
    it('adds an investor', () => {
      const { result } = renderHook(() => useStore())

      const investor = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        budget: 500000,
        preferences: {
          minBedrooms: 2,
          maxPrice: 400000,
          preferredAreas: ['Austin', 'Dallas']
        },
        watchlist: []
      }

      act(() => {
        result.current.addInvestor(investor)
      })

      expect(result.current.investors).toHaveLength(1)
      expect(result.current.investors[0]).toMatchObject(investor)
      expect(result.current.investors[0].id).toBeDefined()
    })

    it('updates an investor', () => {
      const { result } = renderHook(() => useStore())

      const investor = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        budget: 500000,
        preferences: {
          minBedrooms: 2,
          maxPrice: 400000,
          preferredAreas: ['Austin', 'Dallas']
        },
        watchlist: []
      }

      act(() => {
        result.current.addInvestor(investor)
      })

      const investorId = result.current.investors[0].id

      act(() => {
        result.current.updateInvestor(investorId, { budget: 600000 })
      })

      expect(result.current.investors[0].budget).toBe(600000)
    })
  })

  describe('Property Management', () => {
    it('adds a property', () => {
      const { result } = renderHook(() => useStore())

      const property = {
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        images: [],
        status: 'active' as const,
        listingDate: '2024-01-15T00:00:00Z'
      }

      act(() => {
        result.current.addProperty(property)
      })

      expect(result.current.properties).toHaveLength(1)
      expect(result.current.properties[0]).toMatchObject(property)
      expect(result.current.properties[0].id).toBeDefined()
    })

    it('updates a property', () => {
      const { result } = renderHook(() => useStore())

      const property = {
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        images: [],
        status: 'active' as const,
        listingDate: '2024-01-15T00:00:00Z'
      }

      act(() => {
        result.current.addProperty(property)
      })

      const propertyId = result.current.properties[0].id

      act(() => {
        result.current.updateProperty(propertyId, { status: 'pending' })
      })

      expect(result.current.properties[0].status).toBe('pending')
    })
  })

  describe('User Management', () => {
    it('sets user', () => {
      const { result } = renderHook(() => useStore())

      const user = {
        id: 'user-1',
        role: 'admin' as const,
        name: 'Admin User',
        email: 'admin@example.com'
      }

      act(() => {
        result.current.setUser(user)
      })

      expect(result.current.user).toEqual(user)
    })

    it('clears user', () => {
      const { result } = renderHook(() => useStore())

      const user = {
        id: 'user-1',
        role: 'admin' as const,
        name: 'Admin User',
        email: 'admin@example.com'
      }

      act(() => {
        result.current.setUser(user)
      })

      expect(result.current.user).toEqual(user)

      act(() => {
        result.current.setUser(null)
      })

      expect(result.current.user).toBeNull()
    })
  })
})