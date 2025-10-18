import { POST } from '@/app/api/comp-vision/analyze/route'
import { NextRequest } from 'next/server'

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

describe('/api/comp-vision/analyze', () => {
  const { getAuthenticatedUser } = require('@/lib/auth')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('analyzes image when authenticated', async () => {
      // Mock authenticated user
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      // Create mock form data with image
      const formData = new FormData()
      const mockImage = new File(['fake image content'], 'house.jpg', { type: 'image/jpeg' })
      formData.append('image', mockImage)

      const request = new NextRequest('http://localhost:3000/api/comp-vision/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.features).toBeDefined()
      expect(Array.isArray(data.data.features)).toBe(true)
      expect(data.data.similarProperties).toBeDefined()
      expect(Array.isArray(data.data.similarProperties)).toBe(true)
      expect(data.data.estimatedValue).toBeDefined()
      expect(typeof data.data.estimatedValue).toBe('number')
      expect(data.data.confidence).toBeDefined()
      expect(typeof data.data.confidence).toBe('number')
    }, 10000) // Increase timeout for mock delay

    it('returns 401 when not authenticated', async () => {
      // Mock unauthenticated user
      getAuthenticatedUser.mockResolvedValue(null)

      const formData = new FormData()
      const mockImage = new File(['fake image content'], 'house.jpg', { type: 'image/jpeg' })
      formData.append('image', mockImage)

      const request = new NextRequest('http://localhost:3000/api/comp-vision/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when no image provided', async () => {
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      const formData = new FormData()
      // No image added to form data

      const request = new NextRequest('http://localhost:3000/api/comp-vision/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('No image provided')
    })

    it('returns expected analysis structure', async () => {
      getAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' })

      const formData = new FormData()
      const mockImage = new File(['fake image content'], 'house.jpg', { type: 'image/jpeg' })
      formData.append('image', mockImage)

      const request = new NextRequest('http://localhost:3000/api/comp-vision/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.features).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            confidence: expect.any(Number)
          })
        ])
      )

      expect(data.data.similarProperties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            address: expect.any(String),
            similarity: expect.any(Number),
            price: expect.any(Number),
            image: expect.any(String)
          })
        ])
      )
    }, 10000) // Increase timeout for mock delay
  })
})