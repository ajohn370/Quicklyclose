/**
 * Mock Configuration Manager for admin dashboard
 * This provides basic config management until the full system is set up
 */

export class MockConfigurationManager {
  /**
   * Get configuration value with defaults
   */
  static async getConfig<T = any>(
    key: string,
    defaultValue?: T,
    useCache: boolean = true
  ): Promise<T> {
    // Mock configurations for admin dashboard
    const mockConfigs: Record<string, any> = {
      'system.maintenance_mode': false,
      'system.debug_mode': process.env.NODE_ENV === 'development',
      'system.log_level': 'info',
      'feature_flag.bidding_enabled': true,
      'feature_flag.auto_analysis': true,
      'feature_flag.email_notifications': true
    }

    if (mockConfigs.hasOwnProperty(key)) {
      return mockConfigs[key] as T
    }

    if (defaultValue !== undefined) {
      return defaultValue
    }

    throw new Error(`Configuration not found: ${key}`)
  }

  /**
   * Set configuration value (mock)
   */
  static async setConfig(
    key: string,
    value: any,
    options: {
      type?: string
      scope?: string
      description?: string
      encrypt?: boolean
      environment?: string
      updatedBy: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    // Mock implementation - in real system this would save to database
    console.log(`Mock config update: ${key} = ${value}`)
    return { success: true }
  }

  /**
   * Get business rules (mock)
   */
  static async getBusinessRules(category: string): Promise<any> {
    // Mock business rules for different categories
    const mockBusinessRules: Record<string, any> = {
      'profit_margins': {
        minimum: 0.15,
        maximum: 0.35,
        default: 0.25,
        property_type_multipliers: {
          'single_family': 1.0,
          'condo': 0.9,
          'townhouse': 0.95,
          'multi_family': 1.1
        },
        condition_adjustments: {
          'excellent': 0.05,
          'good': 0.0,
          'fair': -0.05,
          'poor': -0.10
        }
      },
      'approval_thresholds': {
        auto_approve_limit: 50000,
        senior_approval_limit: 150000,
        director_approval_limit: 500000
      },
      'risk_scoring': {
        confidence_threshold: 85,
        market_volatility_factor: 1.2,
        location_risk_weights: {
          'urban': 0.8,
          'suburban': 1.0,
          'rural': 1.3
        }
      }
    }

    return mockBusinessRules[category] || {}
  }
}
