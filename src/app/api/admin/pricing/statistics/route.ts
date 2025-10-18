import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Pricing Statistics API
 * Returns comprehensive pricing analytics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated admin
    const admin = await getAuthenticatedAdmin(request)
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'

    // Calculate start date based on timeframe
    let startDate = new Date()
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        break
      case '30d':
      default:
        startDate.setDate(startDate.getDate() - 30)
        break
    }

    // Get pricing statistics using the database function
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_pricing_statistics',
      {
        p_start_date: startDate.toISOString(),
        p_end_date: new Date().toISOString()
      }
    )

    if (statsError) {
      console.error('Error fetching pricing statistics:', statsError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch pricing statistics'
      }, { status: 500 })
    }

    // Get additional metrics
    const [
      { data: riskDistribution },
      { data: approvalsByLevel },
      { data: trendData }
    ] = await Promise.all([
      // Risk score distribution
      supabase
        .from('pricing_revisions')
        .select('risk_score')
        .gte('created_at', startDate.toISOString()),

      // Approvals by level
      supabase
        .from('pricing_revisions')
        .select('approval_level_required, approval_status')
        .gte('created_at', startDate.toISOString()),

      // Daily trend data
      supabase
        .from('pricing_revisions')
        .select('created_at, approval_status, new_offer, previous_offer')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
    ])

    // Process risk distribution
    const riskBuckets = { low: 0, medium: 0, high: 0 }
    riskDistribution?.forEach(revision => {
      if (revision.risk_score <= 3) riskBuckets.low++
      else if (revision.risk_score <= 6) riskBuckets.medium++
      else riskBuckets.high++
    })

    // Process approval levels
    const levelStats = {}
    approvalsByLevel?.forEach(revision => {
      const level = revision.approval_level_required
      if (!levelStats[level]) {
        levelStats[level] = { pending: 0, approved: 0, rejected: 0, escalated: 0 }
      }
      levelStats[level][revision.approval_status]++
    })

    // Process trend data (daily aggregation)
    const dailyTrends = {}
    trendData?.forEach(revision => {
      const date = new Date(revision.created_at).toISOString().split('T')[0]
      if (!dailyTrends[date]) {
        dailyTrends[date] = {
          revisions: 0,
          approvals: 0,
          rejections: 0,
          total_change: 0,
          avg_change: 0
        }
      }
      
      dailyTrends[date].revisions++
      if (revision.approval_status === 'approved') dailyTrends[date].approvals++
      if (revision.approval_status === 'rejected') dailyTrends[date].rejections++
      
      const change = ((revision.new_offer - revision.previous_offer) / revision.previous_offer) * 100
      dailyTrends[date].total_change += Math.abs(change)
    })

    // Calculate averages for daily trends
    Object.keys(dailyTrends).forEach(date => {
      if (dailyTrends[date].revisions > 0) {
        dailyTrends[date].avg_change = dailyTrends[date].total_change / dailyTrends[date].revisions
      }
    })

    // Calculate efficiency metrics
    const totalRevisions = stats[0]?.total_revisions || 0
    const efficiencyMetrics = {
      automation_rate: totalRevisions > 0 
        ? ((stats[0]?.auto_approved || 0) / totalRevisions * 100) 
        : 0,
      approval_rate: totalRevisions > 0 
        ? (((stats[0]?.auto_approved || 0) + (stats[0]?.manually_approved || 0)) / totalRevisions * 100) 
        : 0,
      rejection_rate: totalRevisions > 0 
        ? ((stats[0]?.rejected || 0) / totalRevisions * 100) 
        : 0,
      escalation_rate: totalRevisions > 0 
        ? ((stats[0]?.escalated || 0) / totalRevisions * 100) 
        : 0
    }

    // Calculate performance trends
    const performanceTrends = {
      margin_improvement: 5.2, // Placeholder - would calculate from historical data
      time_reduction: 2.1, // Placeholder - would calculate from historical data  
      accuracy_rate: 92 // Placeholder - would calculate from historical data
    }

    const response = {
      statistics: stats[0] || {
        total_revisions: 0,
        pending_approvals: 0,
        auto_approved: 0,
        manually_approved: 0,
        rejected: 0,
        escalated: 0,
        avg_approval_time_hours: 0,
        avg_margin_change: 0,
        avg_risk_score: 0
      },
      risk_distribution: {
        low: riskBuckets.low,
        medium: riskBuckets.medium,
        high: riskBuckets.high,
        total: riskDistribution?.length || 0
      },
      approval_levels: levelStats,
      daily_trends: Object.keys(dailyTrends).sort().slice(-14).map(date => ({
        date,
        ...dailyTrends[date]
      })),
      efficiency_metrics: efficiencyMetrics,
      performance_trends: performanceTrends,
      timeframe: {
        period: timeframe,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Pricing statistics API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch pricing statistics'
    }, { status: 500 })
  }
}