import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { JobQueueManager } from '@/lib/job-queue-mock'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get queue stats from mock job queue
    const queueStats = await JobQueueManager.getQueueStats()
    
    // Calculate totals across all queues
    const totalWaiting = Object.values(queueStats).reduce((sum, queue) => sum + queue.waiting, 0)
    const totalActive = Object.values(queueStats).reduce((sum, queue) => sum + queue.active, 0)
    const totalCompleted = Object.values(queueStats).reduce((sum, queue) => sum + queue.completed, 0)
    
    const stats = {
      pendingSubmissions: queueStats.analysis?.waiting || 5,
      underReview: queueStats.analysis?.active || 3,
      activeAnalyses: totalActive,
      completedToday: Math.floor(totalCompleted * 0.1), // Simulate daily completion rate
      queueSize: totalWaiting + totalActive,
      systemHealth: 'healthy' as const
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load dashboard stats'
      },
      { status: 500 }
    )
  }
}
