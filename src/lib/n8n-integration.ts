/**
 * n8n Integration Service
 * Handles communication with n8n workflows via MCP and direct webhook calls
 */

export interface N8nWorkflowRequest {
  workflowId?: string
  executionData: any
  webhook?: string
}

export interface N8nWorkflowResponse {
  success: boolean
  executionId?: string
  data?: any
  error?: string
}

export interface PropertyAnalysisRequest {
  imageUrl: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  requestId: string
  userId: string
}

export interface PropertyAnalysisResponse {
  success: boolean
  data?: {
    propertyAnalysis?: any
    zillowData?: any
    geminiAnalysis?: any
    marketInsights?: any
    investmentRecommendation?: any
  }
  error?: string
  executionId?: string
}

export class N8nIntegrationService {
  private webhookUrl: string
  private apiKey: string
  private baseUrl: string

  constructor(config?: {
    webhookUrl?: string
    apiKey?: string
    baseUrl?: string
  }) {
    this.webhookUrl = config?.webhookUrl || process.env.N8N_WEBHOOK_URL || ''
    this.apiKey = config?.apiKey || process.env.N8N_API_KEY || ''
    this.baseUrl = config?.baseUrl || process.env.N8N_BASE_URL || 'http://localhost:5678'
  }

  /**
   * Execute property analysis workflow via webhook
   */
  async executePropertyAnalysis(request: PropertyAnalysisRequest): Promise<PropertyAnalysisResponse> {
    try {
      if (!this.webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL not configured')
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          imageUrl: request.imageUrl,
          address: request.address,
          requestId: request.requestId,
          userId: request.userId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`)
      }

      const rawData = await response.json()
      
      // Handle both wrapped and unwrapped response formats
      // n8n might return data directly or wrapped in success/data structure
      let responseData: any = rawData
      
      // Check if response is already in expected format
      if (rawData.success !== undefined && rawData.data) {
        // Response is already wrapped correctly
        return rawData as PropertyAnalysisResponse
      }
      
      // Transform n8n response to expected format
      // n8n returns data with flip_comps, rental_comps, etc.
      const transformedData: PropertyAnalysisResponse = {
        success: true,
        data: {
          propertyAnalysis: {
            // Map address if available
            address: rawData.address || request.address,
            
            // Map Gemini AI analysis
            geminiAnalysis: rawData.ai_analysis || {
              propertyCondition: rawData.property_condition || 'Good',
              estimatedAge: rawData.property_age || 'Unknown',
              architecturalStyle: rawData.architectural_style || 'Unknown',
              curbAppeal: rawData.curb_appeal || 'Good',
              maintenanceNeeds: rawData.maintenance_needs || 'Minor updates needed',
              keyFeatures: rawData.key_features || [],
              suggestedImprovements: rawData.suggested_improvements || [],
              marketReadiness: rawData.market_readiness || 'Ready'
            },
            
            // Map Zillow data
            zillowData: rawData.zillow_data || {
              zestimate: rawData.estimated_value || rawData.zestimate || 0,
              rentZestimate: rawData.rent_estimate || 0,
              propertyType: rawData.property_type || 'Single Family',
              yearBuilt: rawData.year_built || null,
              lotSize: rawData.lot_size || null,
              finishedSqFt: rawData.sqft || rawData.square_feet || null,
              bedrooms: rawData.bedrooms || null,
              bathrooms: rawData.bathrooms || null,
              lastSoldDate: rawData.last_sold_date || null,
              lastSoldPrice: rawData.last_sold_price || null
            },
            
            // Map comparables - handle flip_comps and rental_comps
            comparables: [
              ...(rawData.flip_comps || []).map((comp: any) => ({
                address: comp.address || 'Unknown',
                soldPrice: comp.sale_price || comp.after_repair_value || 0,
                soldDate: comp.sale_date || new Date().toISOString(),
                sqft: comp.sqft || null,
                bedrooms: comp.bedrooms || null,
                bathrooms: comp.bathrooms || null,
                type: 'flip'
              })),
              ...(rawData.rental_comps || []).map((comp: any) => ({
                address: comp.address || 'Unknown',
                soldPrice: comp.market_value || 0,
                rentEstimate: comp.market_rent_estimate || 0,
                soldDate: comp.date || new Date().toISOString(),
                sqft: comp.sqft || null,
                bedrooms: comp.bedrooms || null,
                bathrooms: comp.bathrooms || null,
                type: 'rental'
              })),
              ...(rawData.similar_properties || []).map((comp: any) => ({
                address: comp.address || 'Unknown',
                soldPrice: comp.price || 0,
                soldDate: comp.sold_date || new Date().toISOString(),
                sqft: comp.sqft || null,
                bedrooms: comp.bedrooms || null,
                bathrooms: comp.bathrooms || null,
                type: 'similar'
              }))
            ].slice(0, 5), // Limit to 5 comparables
            
            // Map market analysis
            marketAnalysis: {
              estimatedValue: rawData.estimated_value || 0,
              valueRangeLow: rawData.value_range_low || (rawData.estimated_value ? rawData.estimated_value * 0.9 : 0),
              valueRangeHigh: rawData.value_range_high || (rawData.estimated_value ? rawData.estimated_value * 1.1 : 0),
              daysOnMarket: rawData.days_on_market || 30,
              marketTrend: rawData.market_trend || 'Stable',
              neighborhoodGrowth: rawData.neighborhood_growth || 'Unknown',
              investmentScore: rawData.investment_score || rawData.confidence_score || 0,
              cashFlowPotential: rawData.cash_flow_potential || 'Unknown'
            },
            
            // Map AI recommendations
            aiRecommendation: {
              quickSalePrice: rawData.quick_sale_price || (rawData.estimated_value ? rawData.estimated_value * 0.95 : 0),
              optimalListPrice: rawData.optimal_list_price || rawData.estimated_value || 0,
              repairCosts: rawData.repair_costs || 0,
              timeToSell: rawData.time_to_sell || '2-4 weeks',
              confidence: rawData.confidence ? `${rawData.confidence}%` : 'High',
              summary: rawData.summary || rawData.recommendation || 'Property analysis complete. Please review the details above.'
            }
          }
        },
        executionId: rawData.executionId || rawData.execution_id || `n8n-${Date.now()}`
      }
      
      // Log the transformation for debugging
      console.log('n8n response transformed:', {
        original: rawData,
        transformed: transformedData
      })
      
      return transformedData
    } catch (error) {
      console.error('n8n property analysis failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('N8N_API_KEY not configured')
      }

      const response = await fetch(`${this.baseUrl}/api/v1/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get execution status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get n8n execution status:', error)
      throw error
    }
  }

  /**
   * List available workflows
   */
  async listWorkflows(): Promise<any[]> {
    try {
      if (!this.apiKey) {
        throw new Error('N8N_API_KEY not configured')
      }

      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to list workflows: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Failed to list n8n workflows:', error)
      return []
    }
  }

  /**
   * Execute workflow by ID
   */
  async executeWorkflow(workflowId: string, executionData: any): Promise<N8nWorkflowResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('N8N_API_KEY not configured')
      }

      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(executionData)
      })

      if (!response.ok) {
        throw new Error(`Failed to execute workflow: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        executionId: data.data?.executionId,
        data: data.data
      }
    } catch (error) {
      console.error('Failed to execute n8n workflow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Test connection to n8n instance
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('n8n connection test failed:', error)
      return false
    }
  }
}

// Singleton instance
export const n8nService = new N8nIntegrationService()

// Convenience functions
export async function analyzePropertyWithN8n(request: PropertyAnalysisRequest): Promise<PropertyAnalysisResponse> {
  return n8nService.executePropertyAnalysis(request)
}

export async function getN8nWorkflows(): Promise<any[]> {
  return n8nService.listWorkflows()
}

export async function testN8nConnection(): Promise<boolean> {
  return n8nService.testConnection()
}