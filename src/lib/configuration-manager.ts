/**
 * Centralized Configuration Management System
 * Handles system configuration, business rules, feature flags, and environment variables
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ConfigurationType = 'system' | 'business_rule' | 'feature_flag' | 'api_key' | 'notification'

export type ConfigurationScope = 'global' | 'environment' | 'user' | 'tenant'

export interface Configuration {
  id: string
  key: string
  value: any
  type: ConfigurationType
  scope: ConfigurationScope
  description: string
  is_encrypted: boolean
  is_active: boolean
  environment?: string
  created_by: string
  updated_by: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  rollout_percentage: number
  user_groups: string[]
  environment: string
  metadata: Record<string, any>
}

export interface BusinessRule {
  key: string
  value: any
  category: string
  validation_rule?: string
  min_value?: number
  max_value?: number
  allowed_values?: any[]
}

export class ConfigurationManager {
  private static cache = new Map<string, any>()
  private static cacheExpiry = new Map<string, number>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get configuration value with caching
   */
  static async getConfig<T = any>(
    key: string,
    defaultValue?: T,
    useCache: boolean = true
  ): Promise<T> {
    try {
      // Check cache first
      if (useCache && this.isCacheValid(key)) {
        return this.cache.get(key) as T
      }

      const { data, error } = await supabase
        .from('system_configurations')
        .select('value, is_encrypted')
        .eq('key', key)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        if (defaultValue !== undefined) {
          return defaultValue
        }
        throw new Error(`Configuration not found: ${key}`)
      }

      let value = data.value

      // Decrypt if needed
      if (data.is_encrypted) {
        value = await this.decryptValue(value)
      }

      // Cache the result
      if (useCache) {
        this.cache.set(key, value)
        this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL)
      }

      return value as T
    } catch (error) {
      console.error(`Error getting configuration ${key}:`, error)
      if (defaultValue !== undefined) {
        return defaultValue
      }
      throw error
    }
  }

  /**
   * Set configuration value
   */
  static async setConfig(
    key: string,
    value: any,
    options: {
      type?: ConfigurationType
      scope?: ConfigurationScope
      description?: string
      encrypt?: boolean
      environment?: string
      updatedBy: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let processedValue = value

      // Encrypt sensitive values
      if (options.encrypt) {
        processedValue = await this.encryptValue(value)
      }

      const configData = {
        key,
        value: processedValue,
        type: options.type || 'system',
        scope: options.scope || 'global',
        description: options.description || '',
        is_encrypted: options.encrypt || false,
        environment: options.environment,
        updated_by: options.updatedBy,
        metadata: {}
      }

      const { data, error } = await supabase
        .from('system_configurations')
        .upsert(configData)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Update cache
      this.cache.set(key, value)
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL)

      // Log configuration change
      await this.logConfigurationChange(key, 'update', value, options.updatedBy)

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get business rules
   */
  static async getBusinessRules(category?: string): Promise<Record<string, any>> {
    try {
      let query = supabase
        .from('system_configurations')
        .select('key, value, metadata')
        .eq('type', 'business_rule')
        .eq('is_active', true)

      if (category) {
        query = query.eq('metadata->>category', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching business rules:', error)
        return {}
      }

      const rules: Record<string, any> = {}
      for (const rule of data || []) {
        rules[rule.key] = rule.value
      }

      return rules
    } catch (error) {
      console.error('Business rules fetch failed:', error)
      return {}
    }
  }

  /**
   * Get feature flag status
   */
  static async isFeatureEnabled(
    flag: string,
    userId?: string,
    userGroups?: string[]
  ): Promise<boolean> {
    try {
      const flagConfig = await this.getConfig<FeatureFlag>(`feature_flag.${flag}`)
      
      if (!flagConfig || !flagConfig.enabled) {
        return false
      }

      // Check rollout percentage
      if (flagConfig.rollout_percentage < 100) {
        const hash = this.hashUserId(userId)
        if (hash > flagConfig.rollout_percentage) {
          return false
        }
      }

      // Check user groups
      if (flagConfig.user_groups && flagConfig.user_groups.length > 0 && userGroups) {
        const hasGroup = flagConfig.user_groups.some(group => userGroups.includes(group))
        if (!hasGroup) {
          return false
        }
      }

      return true
    } catch (error) {
      console.error(`Error checking feature flag ${flag}:`, error)
      return false
    }
  }

  /**
   * Set feature flag
   */
  static async setFeatureFlag(
    flag: string,
    config: Partial<FeatureFlag>,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const flagConfig: FeatureFlag = {
      key: flag,
      enabled: config.enabled ?? false,
      rollout_percentage: config.rollout_percentage ?? 100,
      user_groups: config.user_groups ?? [],
      environment: config.environment ?? 'production',
      metadata: config.metadata ?? {}
    }

    return await this.setConfig(`feature_flag.${flag}`, flagConfig, {
      type: 'feature_flag',
      description: `Feature flag: ${flag}`,
      updatedBy
    })
  }

  /**
   * Get system defaults with fallbacks
   */
  static async getSystemDefaults(): Promise<{
    profitMargins: Record<string, number>
    biddingDefaults: Record<string, any>
    notificationSettings: Record<string, any>
    analysisSettings: Record<string, any>
  }> {
    const [profitMargins, biddingDefaults, notificationSettings, analysisSettings] = await Promise.all([
      this.getBusinessRules('profit_margins'),
      this.getBusinessRules('bidding'),
      this.getBusinessRules('notifications'),
      this.getBusinessRules('analysis')
    ])

    return {
      profitMargins: {
        base: 0.15,
        minimum: 0.10,
        maximum: 0.30,
        single_family: 1.0,
        condo: 1.1,
        townhouse: 1.05,
        multi_family: 0.95,
        land: 1.2,
        commercial: 0.9,
        hot_market: 0.95,
        slow_market: 1.1,
        high_confidence: 0.95,
        medium_confidence: 1.0,
        low_confidence: 1.1,
        ...profitMargins
      },
      biddingDefaults: {
        duration_hours: 48,
        minimum_increment: 1000,
        auto_extend_threshold_minutes: 10,
        extension_duration_minutes: 30,
        reserve_price_enabled: false,
        proxy_bidding_enabled: true,
        ...biddingDefaults
      },
      notificationSettings: {
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        digest_frequency_hours: 24,
        immediate_notifications: ['bid_won', 'bid_lost', 'listing_approved'],
        batched_notifications: ['new_listing', 'price_update'],
        ...notificationSettings
      },
      analysisSettings: {
        timeout_seconds: 30,
        retry_attempts: 3,
        confidence_threshold: 70,
        require_recent_image: true,
        max_image_age_days: 42,
        auto_approve_high_confidence: false,
        high_confidence_threshold: 90,
        ...analysisSettings
      }
    }
  }

  /**
   * Update business rule
   */
  static async updateBusinessRule(
    key: string,
    value: any,
    category: string,
    updatedBy: string,
    validation?: {
      minValue?: number
      maxValue?: number
      allowedValues?: any[]
      validationRule?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    // Validate value if rules provided
    if (validation) {
      const validationError = this.validateBusinessRule(value, validation)
      if (validationError) {
        return { success: false, error: validationError }
      }
    }

    return await this.setConfig(key, value, {
      type: 'business_rule',
      description: `Business rule: ${key}`,
      updatedBy,
      scope: 'global'
    })
  }

  /**
   * Get all configurations for admin dashboard
   */
  static async getAllConfigurations(type?: ConfigurationType): Promise<Configuration[]> {
    try {
      let query = supabase
        .from('system_configurations')
        .select('*')
        .eq('is_active', true)
        .order('type', { ascending: true })
        .order('key', { ascending: true })

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching configurations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Configurations fetch failed:', error)
      return []
    }
  }

  /**
   * Environment-specific configuration
   */
  static async getEnvironmentConfig(): Promise<{
    environment: string
    debugMode: boolean
    logLevel: string
    serviceUrls: Record<string, string>
    apiKeys: Record<string, string>
    limits: Record<string, number>
  }> {
    const environment = process.env.NODE_ENV || 'development'
    
    const [
      debugMode,
      logLevel,
      serviceUrls,
      apiKeys,
      limits
    ] = await Promise.all([
      this.getConfig('debug_mode', environment === 'development'),
      this.getConfig('log_level', 'info'),
      this.getConfig('service_urls', {}),
      this.getConfig('api_keys', {}),
      this.getConfig('rate_limits', {})
    ])

    return {
      environment,
      debugMode,
      logLevel,
      serviceUrls: {
        comp_ai: process.env.COMP_AI_SERVICE_URL || 'http://localhost:3000/api/comp-ai',
        redis: process.env.REDIS_URL || 'redis://localhost:6379',
        supabase: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        ...serviceUrls
      },
      apiKeys: {
        comp_ai: process.env.COMP_AI_SERVICE_KEY || 'internal-service-key',
        supabase_service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        ...apiKeys
      },
      limits: {
        max_file_size: 10 * 1024 * 1024, // 10MB
        max_properties_per_user: 100,
        max_bids_per_property: 1000,
        analysis_timeout: 30000,
        job_retry_attempts: 3,
        ...limits
      }
    }
  }

  /**
   * Clear configuration cache
   */
  static clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
      this.cacheExpiry.delete(key)
    } else {
      this.cache.clear()
      this.cacheExpiry.clear()
    }
  }

  /**
   * Private helper methods
   */
  private static isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry ? Date.now() < expiry : false
  }

  private static async encryptValue(value: any): Promise<string> {
    // Use the same encryption as data governance
    const { DataGovernanceManager } = await import('./data-governance')
    return await DataGovernanceManager.encryptPII(JSON.stringify(value), 'config')
  }

  private static async decryptValue(encryptedValue: string): Promise<any> {
    // Use the same decryption as data governance
    const { DataGovernanceManager } = await import('./data-governance')
    const decrypted = await DataGovernanceManager.decryptPII(encryptedValue, 'config')
    try {
      return JSON.parse(decrypted)
    } catch {
      return decrypted
    }
  }

  private static hashUserId(userId?: string): number {
    if (!userId) return Math.random() * 100
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100
  }

  private static validateBusinessRule(
    value: any,
    validation: {
      minValue?: number
      maxValue?: number
      allowedValues?: any[]
      validationRule?: string
    }
  ): string | null {
    if (validation.minValue !== undefined && typeof value === 'number' && value < validation.minValue) {
      return `Value must be at least ${validation.minValue}`
    }

    if (validation.maxValue !== undefined && typeof value === 'number' && value > validation.maxValue) {
      return `Value must be at most ${validation.maxValue}`
    }

    if (validation.allowedValues && !validation.allowedValues.includes(value)) {
      return `Value must be one of: ${validation.allowedValues.join(', ')}`
    }

    if (validation.validationRule) {
      try {
        const regex = new RegExp(validation.validationRule)
        if (typeof value === 'string' && !regex.test(value)) {
          return `Value does not match required pattern`
        }
      } catch (error) {
        console.error('Invalid validation rule:', error)
      }
    }

    return null
  }

  private static async logConfigurationChange(
    key: string,
    action: string,
    value: any,
    userId: string
  ): Promise<void> {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: userId,
          action: 'CONFIGURATION_CHANGE',
          resource_type: 'configuration',
          resource_id: key,
          metadata: {
            key,
            action,
            value: typeof value === 'object' ? JSON.stringify(value) : value
          }
        })
    } catch (error) {
      console.error('Failed to log configuration change:', error)
    }
  }
}

/**
 * Environment-aware configuration wrapper
 */
export class EnvironmentConfig {
  private static instance: EnvironmentConfig
  private config: any = {}

  private constructor() {}

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig()
    }
    return EnvironmentConfig.instance
  }

  async initialize(): Promise<void> {
    this.config = await ConfigurationManager.getEnvironmentConfig()
  }

  get<T>(key: string, defaultValue?: T): T {
    const keys = key.split('.')
    let value = this.config

    for (const k of keys) {
      value = value?.[k]
    }

    return value !== undefined ? value : defaultValue
  }

  getServiceUrl(service: string): string {
    return this.config.serviceUrls?.[service] || ''
  }

  getApiKey(service: string): string {
    return this.config.apiKeys?.[service] || ''
  }

  getLimit(limit: string): number {
    return this.config.limits?.[limit] || 0
  }

  isDebugMode(): boolean {
    return this.config.debugMode || false
  }

  getLogLevel(): string {
    return this.config.logLevel || 'info'
  }

  getEnvironment(): string {
    return this.config.environment || 'development'
  }
}

/**
 * Configuration constants and defaults
 */
export const CONFIG_KEYS = {
  // Business Rules
  PROFIT_MARGINS: 'profit_margins',
  BIDDING_DEFAULTS: 'bidding_defaults',
  ANALYSIS_SETTINGS: 'analysis_settings',
  NOTIFICATION_SETTINGS: 'notification_settings',

  // Feature Flags
  FEATURE_BIDDING_ENABLED: 'feature_flag.bidding_enabled',
  FEATURE_AUTO_ANALYSIS: 'feature_flag.auto_analysis',
  FEATURE_EMAIL_NOTIFICATIONS: 'feature_flag.email_notifications',
  FEATURE_ADVANCED_ANALYTICS: 'feature_flag.advanced_analytics',

  // System Settings
  DEBUG_MODE: 'debug_mode',
  LOG_LEVEL: 'log_level',
  MAINTENANCE_MODE: 'maintenance_mode',
  MAX_CONCURRENT_ANALYSES: 'max_concurrent_analyses',

  // Service URLs
  COMP_AI_SERVICE_URL: 'service_urls.comp_ai',
  REDIS_URL: 'service_urls.redis',
  EMAIL_SERVICE_URL: 'service_urls.email',

  // API Keys (encrypted)
  COMP_AI_API_KEY: 'api_keys.comp_ai',
  EMAIL_API_KEY: 'api_keys.email',
  ANALYTICS_API_KEY: 'api_keys.analytics'
} as const

// Initialize environment config
export const envConfig = EnvironmentConfig.getInstance()