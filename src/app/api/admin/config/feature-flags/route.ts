import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-rbac'
import { ConfigurationManager } from '@/lib/configuration-manager'

export const dynamic = 'force-dynamic'

/**
 * Feature Flags Management API
 */
export async function GET(request: NextRequest) {
  try {
    const { user, isAdmin, error } = await requireAdmin(request)
    
    if (!user || !isAdmin) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const { searchParams } = new URL(request.url)
    const flag = searchParams.get('flag')
    const userId = searchParams.get('userId')
    const userGroups = searchParams.get('userGroups')?.split(',') || []

    if (flag) {
      // Check specific feature flag
      const isEnabled = await ConfigurationManager.isFeatureEnabled(
        flag,
        userId || undefined,
        userGroups.length > 0 ? userGroups : undefined
      )

      return NextResponse.json({
        success: true,
        data: {
          flag,
          enabled: isEnabled,
          userId,
          userGroups
        }
      })
    }

    // Get all feature flags
    const configurations = await ConfigurationManager.getAllConfigurations('feature_flag')
    
    const featureFlags = configurations.map(config => {
      const flagKey = config.key.replace('feature_flag.', '')
      const flagValue = config.value as any
      
      return {
        key: flagKey,
        fullKey: config.key,
        enabled: flagValue.enabled || false,
        rollout_percentage: flagValue.rollout_percentage || 100,
        user_groups: flagValue.user_groups || [],
        environment: flagValue.environment || 'production',
        metadata: flagValue.metadata || {},
        description: config.description,
        updated_at: config.updated_at
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        featureFlags,
        totalCount: featureFlags.length
      }
    })

  } catch (error) {
    console.error('Feature flags API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process feature flags request'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isAdmin, error } = await requireAdmin(request)
    
    if (!user || !isAdmin) {
      return NextResponse.json({
        success: false,
        message: error
      }, { status: user ? 403 : 401 })
    }

    const body = await request.json()
    const { action, flag, enabled, rolloutPercentage, userGroups, environment, metadata, userId, userGroup, reason, expiresAt } = body

    switch (action) {
      case 'toggle-flag':
        if (!flag) {
          return NextResponse.json({
            success: false,
            message: 'Feature flag key is required'
          }, { status: 400 })
        }

        const toggleResult = await ConfigurationManager.setFeatureFlag(
          flag,
          {
            enabled: enabled ?? true,
            rollout_percentage: rolloutPercentage ?? 100,
            user_groups: userGroups ?? [],
            environment: environment ?? 'production',
            metadata: metadata ?? {}
          },
          user.id
        )

        if (!toggleResult.success) {
          return NextResponse.json({
            success: false,
            message: toggleResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: `Feature flag ${flag} ${enabled ? 'enabled' : 'disabled'} successfully`
        })

      case 'create-user-override':
        if (!flag || (!userId && !userGroup)) {
          return NextResponse.json({
            success: false,
            message: 'Flag key and either userId or userGroup are required'
          }, { status: 400 })
        }

        // Use Supabase directly for feature flag overrides
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const overrideData: any = {
          flag_key: flag,
          enabled: enabled ?? true,
          reason,
          created_by: user.id
        }

        if (userId) {
          overrideData.user_id = userId
        }
        if (userGroup) {
          overrideData.user_group = userGroup
        }
        if (expiresAt) {
          overrideData.expires_at = expiresAt
        }

        const { data: override, error: overrideError } = await supabase
          .from('feature_flag_overrides')
          .upsert(overrideData)
          .select()
          .single()

        if (overrideError) {
          return NextResponse.json({
            success: false,
            message: overrideError.message
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          data: override,
          message: 'Feature flag override created successfully'
        })

      case 'remove-user-override':
        if (!flag || (!userId && !userGroup)) {
          return NextResponse.json({
            success: false,
            message: 'Flag key and either userId or userGroup are required'
          }, { status: 400 })
        }

        const supabase2 = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        let deleteQuery = supabase2
          .from('feature_flag_overrides')
          .delete()
          .eq('flag_key', flag)

        if (userId) {
          deleteQuery = deleteQuery.eq('user_id', userId)
        }
        if (userGroup) {
          deleteQuery = deleteQuery.eq('user_group', userGroup)
        }

        const { error: deleteError } = await deleteQuery

        if (deleteError) {
          return NextResponse.json({
            success: false,
            message: deleteError.message
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Feature flag override removed successfully'
        })

      case 'bulk-toggle':
        if (!body.flags || !Array.isArray(body.flags)) {
          return NextResponse.json({
            success: false,
            message: 'Flags array is required'
          }, { status: 400 })
        }

        const bulkResults = []
        for (const flagConfig of body.flags) {
          const result = await ConfigurationManager.setFeatureFlag(
            flagConfig.flag,
            {
              enabled: flagConfig.enabled ?? true,
              rollout_percentage: flagConfig.rolloutPercentage ?? 100,
              user_groups: flagConfig.userGroups ?? [],
              environment: flagConfig.environment ?? 'production',
              metadata: flagConfig.metadata ?? {}
            },
            user.id
          )
          
          bulkResults.push({
            flag: flagConfig.flag,
            success: result.success,
            error: result.error
          })
        }

        const bulkSuccessCount = bulkResults.filter(r => r.success).length
        const bulkFailureCount = bulkResults.length - bulkSuccessCount

        return NextResponse.json({
          success: bulkFailureCount === 0,
          data: {
            results: bulkResults,
            summary: {
              total: bulkResults.length,
              successful: bulkSuccessCount,
              failed: bulkFailureCount
            }
          },
          message: `Bulk toggle completed: ${bulkSuccessCount} successful, ${bulkFailureCount} failed`
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Feature flags management error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to manage feature flags'
    }, { status: 500 })
  }
}