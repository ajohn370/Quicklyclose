/**
 * Comp AI Service Client
 * Handles communication with the decoupled Comp AI analysis service
 * Supports API versioning and service discovery
 */

import { CompVisionAnalysis } from '@/types'

export interface CompAIServiceConfig {
  baseUrl: string
  apiKey: string
  version: string
  timeout: number
  retryAttempts: number
}

export interface AnalysisRequest {
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

export interface AnalysisResponse {
  success: boolean
  data?: CompVisionAnalysis
  error?: string
  requestId: string
  processingTime: number
}

export interface ServiceHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  lastCheck: string
}

class CompAIService {
  private config: CompAIServiceConfig
  private healthCache: { status: ServiceHealthResponse; timestamp: number } | null = null
  private readonly HEALTH_CACHE_TTL = 30000 // 30 seconds

  constructor(config: CompAIServiceConfig) {
    this.config = config
  }

  /**
   * Analyze property with versioned API
   */
  async analyzeProperty(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now()
    
    try {
      const response = await this.makeRequest(`/api/${this.config.version}/analyze`, {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Request-ID': request.requestId,
        },
      })

      const data = await response.json()
      
      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || 'Analysis failed',
        requestId: request.requestId,
        processingTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        requestId: request.requestId,
        processingTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Check service health with caching
   */
  async checkHealth(): Promise<ServiceHealthResponse> {
    const now = Date.now()
    
    // Return cached health if still valid
    if (this.healthCache && now - this.healthCache.timestamp < this.HEALTH_CACHE_TTL) {
      return this.healthCache.status
    }

    try {
      const response = await this.makeRequest(`/api/${this.config.version}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      })

      const health: ServiceHealthResponse = await response.json()
      
      // Cache the health status
      this.healthCache = {
        status: health,
        timestamp: now,
      }

      return health
    } catch (error) {
      const unhealthyStatus: ServiceHealthResponse = {
        status: 'unhealthy',
        version: this.config.version,
        uptime: 0,
        lastCheck: new Date().toISOString(),
      }

      this.healthCache = {
        status: unhealthyStatus,
        timestamp: now,
      }

      return unhealthyStatus
    }
  }

  /**
   * Get supported API versions
   */
  async getSupportedVersions(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/api/versions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      })

      const data = await response.json()
      return data.versions || [this.config.version]
    } catch (error) {
      // Fallback to current version if versions endpoint is not available
      return [this.config.version]
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        return response

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Request failed')
        
        // Don't retry on the last attempt
        if (attempt === this.config.retryAttempts) {
          throw lastError
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}

/**
 * Factory function to create CompAI service instance
 */
export function createCompAIService(): CompAIService {
  const config: CompAIServiceConfig = {
    baseUrl: process.env.COMP_AI_SERVICE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    apiKey: process.env.COMP_AI_SERVICE_KEY || 'internal-service-key',
    version: process.env.COMP_AI_API_VERSION || 'v1',
    timeout: parseInt(process.env.COMP_AI_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.COMP_AI_RETRY_ATTEMPTS || '3'),
  }

  return new CompAIService(config)
}

/**
 * Default service instance
 */
export const compAIService = createCompAIService()

/**
 * Service status monitoring
 */
export async function monitorCompAIService(): Promise<{
  isHealthy: boolean
  version: string
  responseTime: number
}> {
  const startTime = Date.now()
  
  try {
    const health = await compAIService.checkHealth()
    const responseTime = Date.now() - startTime

    return {
      isHealthy: health.status === 'healthy',
      version: health.version,
      responseTime,
    }
  } catch (error) {
    return {
      isHealthy: false,
      version: 'unknown',
      responseTime: Date.now() - startTime,
    }
  }
}