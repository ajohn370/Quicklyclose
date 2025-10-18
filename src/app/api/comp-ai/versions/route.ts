import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Comp AI Service - API Version Discovery
 */
export async function GET(request: NextRequest) {
  try {
    // Validate internal service authentication
    const authHeader = request.headers.get('authorization')
    const expectedServiceKey = process.env.COMP_AI_SERVICE_KEY || 'internal-service-key'
    
    if (!authHeader || authHeader !== `Bearer ${expectedServiceKey}`) {
      return NextResponse.json({
        error: 'Invalid service authentication'
      }, { status: 401 })
    }

    return NextResponse.json({
      versions: ['v1'],
      current: 'v1',
      deprecated: [],
      supported: ['v1'],
      changelog: {
        'v1': {
          releaseDate: '2024-01-01',
          features: [
            'Property analysis with AI',
            'Fix & flip comparables',
            'Rental analysis',
            'Similar properties matching',
            'Market valuation'
          ],
          breaking_changes: [],
          endpoints: [
            'POST /api/v1/analyze',
            'GET /api/v1/health'
          ]
        }
      },
      migration_guides: {},
      deprecation_schedule: {}
    })

  } catch (error) {
    console.error('Version discovery error:', error)
    return NextResponse.json({
      error: 'Version discovery failed'
    }, { status: 500 })
  }
}