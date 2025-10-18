import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to check comp_vision_analyses data and admin access
 */
export async function GET(request: NextRequest) {
  try {
    // Use service role client to bypass all RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // 1. Check total count of analysis records
    const { count: totalCount } = await supabase
      .from('comp_vision_analyses')
      .select('*', { count: 'exact', head: true })

    // 2. Get recent analysis records (raw)
    const { data: allAnalyses, error: analysesError } = await supabase
      .from('comp_vision_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    // 3. Check admin profiles
    const { data: adminProfiles, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*')

    // 4. Check auth users
    const { data: authUsers, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', 'admin@quicklyclose.com')

    return NextResponse.json({
      success: true,
      debug: {
        totalAnalysisRecords: totalCount,
        recentAnalyses: allAnalyses,
        analysesError,
        adminProfiles,
        adminError,
        authUsers,
        usersError,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}