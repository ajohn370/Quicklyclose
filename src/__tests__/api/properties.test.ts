import { GET } from '@/app/api/properties/route'
import { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => {
    const { searchParams } = new URL(url);
    return {
      url,
      ...options,
      nextUrl: {
        searchParams,
      },
      headers: {
        entries: () => [],
        get: () => null,
      },
    };
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((data) => ({
      json: () => Promise.resolve(data),
      status: 200,
    })),
  },
}));

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
  createAuthErrorResponse: jest.fn(() => 
    new Response(JSON.stringify({ success: false, message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}))

describe('/api/properties', () => {
  const { getAuthenticatedUser } = require('@/lib/auth')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns properties when authenticated', async () => {
      // Mock authenticated user
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      const request = new NextRequest('http://localhost:3000/api/properties')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.totalCount).toBeDefined()
    })

    it('returns 401 when not authenticated', async () => {
      // Mock unauthenticated user
      getAuthenticatedUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/properties')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('filters properties by price range', async () => {
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      const request = new NextRequest('http://localhost:3000/api/properties?minPrice=400000&maxPrice=500000')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // All returned properties should be within price range
      data.data.forEach((property: any) => {
        expect(property.price).toBeGreaterThanOrEqual(400000)
        expect(property.price).toBeLessThanOrEqual(500000)
      })
    })

    it('filters properties by city', async () => {
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      const request = new NextRequest('http://localhost:3000/api/properties?city=Austin')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // All returned properties should be in Austin
      data.data.forEach((property: any) => {
        expect(property.city.toLowerCase()).toContain('austin')
      })
    })

    it('filters properties by minimum bedrooms', async () => {
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      const request = new NextRequest('http://localhost:3000/api/properties?minBedrooms=3')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // All returned properties should have at least 3 bedrooms
      data.data.forEach((property: any) => {
        expect(property.bedrooms).toBeGreaterThanOrEqual(3)
      })
    })
  })
})