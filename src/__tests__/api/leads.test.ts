import { POST, GET } from '@/app/api/leads/route'
import { NextRequest } from 'next/server'

describe('/api/leads', () => {
  describe('POST', () => {
    it('creates a new lead successfully', async () => {
      const leadData = {
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1500,
        seller: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        address: leadData.address,
        city: leadData.city,
        state: leadData.state,
        zip: leadData.zip,
        bedrooms: leadData.bedrooms,
        bathrooms: leadData.bathrooms,
        sqft: leadData.sqft,
        seller: leadData.seller,
        status: 'new'
      })
      expect(data.data.id).toBeDefined()
      expect(data.data.createdAt).toBeDefined()
    })

    it('handles invalid request data', async () => {
      const invalidData = {
        address: '123 Main St'
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })

  describe('GET', () => {
    it('returns all leads', async () => {
      // First create a lead
      const leadData = {
        address: '456 Oak Ave',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2000,
        seller: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-5678'
        }
      }

      const postRequest = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await POST(postRequest)

      // Now get all leads
      const getRequest = new NextRequest('http://localhost:3000/api/leads', {
        method: 'GET'
      })
      const response = await GET(getRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })
  })
})