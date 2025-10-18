import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-rbac'
import { ConfigurationManager } from '@/lib/configuration-manager'

export const dynamic = 'force-dynamic'

/**
 * Configuration Management API
 */
export async function GET(request: NextRequest) {
  try {
    const { user, isSuperAdmin, error } = await requireSuperAdmin(request)
    
    if (!user || !isSuperAdmin) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const type = searchParams.get('type')
    const key = searchParams.get('key')
    const category = searchParams.get('category')

    switch (action) {
      case 'business-rules':
        const rules = await ConfigurationManager.getBusinessRules(category || undefined)
        return NextResponse.json({
          success: true,
          data: rules
        })

      case 'system-defaults':
        const defaults = await ConfigurationManager.getSystemDefaults()
        return NextResponse.json({
          success: true,
          data: defaults
        })

      case 'environment-config':
        const envConfig = await ConfigurationManager.getEnvironmentConfig()
        return NextResponse.json({
          success: true,
          data: envConfig
        })

      case 'single-config':
        if (!key) {
          return NextResponse.json({
            success: false,
            message: 'Configuration key is required'
          }, { status: 400 })
        }

        const value = await ConfigurationManager.getConfig(key)
        return NextResponse.json({
          success: true,
          data: { key, value }
        })

      default:
        // Get all configurations
        const configurations = await ConfigurationManager.getAllConfigurations(
          type as any
        )
        
        return NextResponse.json({
          success: true,
          data: {
            configurations,
            totalCount: configurations.length,
            types: ['system', 'business_rule', 'feature_flag', 'api_key', 'notification']
          }
        })
    }

  } catch (error) {
    console.error('Configuration API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process configuration request'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isSuperAdmin, error } = await requireSuperAdmin(request)
    
    if (!user || !isSuperAdmin) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const body = await request.json()
    const { action, key, value, type, scope, description, encrypt, environment, category, validation } = body

    switch (action) {
      case 'set-config':
        if (!key || value === undefined) {
          return NextResponse.json({
            success: false,
            message: 'Configuration key and value are required'
          }, { status: 400 })
        }

        const setResult = await ConfigurationManager.setConfig(key, value, {
          type,
          scope,
          description,
          encrypt,
          environment,
          updatedBy: user.id
        })

        if (!setResult.success) {
          return NextResponse.json({
            success: false,
            message: setResult.error
          }, { status: 400 })
        }

        // Clear cache for this key
        ConfigurationManager.clearCache(key)

        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully'
        })

      case 'update-business-rule':
        if (!key || value === undefined || !category) {
          return NextResponse.json({
            success: false,
            message: 'Key, value, and category are required for business rules'
          }, { status: 400 })
        }

        const ruleResult = await ConfigurationManager.updateBusinessRule(
          key,
          value,
          category,
          user.id,
          validation
        )

        if (!ruleResult.success) {
          return NextResponse.json({
            success: false,
            message: ruleResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Business rule updated successfully'
        })

      case 'set-feature-flag':
        if (!key) {
          return NextResponse.json({
            success: false,
            message: 'Feature flag key is required'
          }, { status: 400 })
        }

        const flagResult = await ConfigurationManager.setFeatureFlag(
          key,
          {
            enabled: body.enabled ?? false,
            rollout_percentage: body.rollout_percentage ?? 100,
            user_groups: body.user_groups ?? [],
            environment: body.environment ?? 'production',
            metadata: body.metadata ?? {}
          },
          user.id
        )

        if (!flagResult.success) {
          return NextResponse.json({
            success: false,
            message: flagResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Feature flag updated successfully'
        })

      case 'clear-cache':
        ConfigurationManager.clearCache(key)
        return NextResponse.json({
          success: true,
          message: key ? `Cache cleared for ${key}` : 'All cache cleared'
        })

      case 'bulk-update':
        if (!body.configurations || !Array.isArray(body.configurations)) {
          return NextResponse.json({
            success: false,
            message: 'Configurations array is required'
          }, { status: 400 })
        }

        const results = []
        for (const config of body.configurations) {
          const result = await ConfigurationManager.setConfig(config.key, config.value, {
            type: config.type,
            scope: config.scope,
            description: config.description,
            encrypt: config.encrypt,
            environment: config.environment,
            updatedBy: user.id
          })
          
          results.push({
            key: config.key,
            success: result.success,
            error: result.error
          })
        }

        // Clear all cache after bulk update
        ConfigurationManager.clearCache()

        const successCount = results.filter(r => r.success).length
        const failureCount = results.length - successCount

        return NextResponse.json({
          success: failureCount === 0,
          data: {
            results,
            summary: {
              total: results.length,
              successful: successCount,
              failed: failureCount
            }
          },
          message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Configuration management error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to manage configuration'
    }, { status: 500 })
  }
}