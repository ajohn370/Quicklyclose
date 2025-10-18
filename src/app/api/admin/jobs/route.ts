import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { getAuthenticatedAdmin, createAdminAuthErrorResponse } from '@/lib/admin-auth'
import { jobQueue } from '@/lib/job-queue-mock'

export const dynamic = 'force-dynamic'

/**
 * Job Queue Management API for Admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user is admin via admin profiles
    const admin = await getAuthenticatedAdmin(request)
    if (!admin) {
      return createAdminAuthErrorResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const queueName = searchParams.get('queue')
    const jobId = searchParams.get('jobId')

    switch (action) {
      case 'stats':
        const stats = await jobQueue.getQueueStats()
        return NextResponse.json({
          success: true,
          data: stats
        })

      case 'job-status':
        if (!queueName || !jobId) {
          return NextResponse.json({
            success: false,
            message: 'Queue name and job ID required'
          }, { status: 400 })
        }

        const jobStatus = await jobQueue.getJobStatus(queueName as any, jobId)
        return NextResponse.json({
          success: true,
          data: jobStatus
        })

      default:
        // Return general queue information
        const queueStats = await jobQueue.getQueueStats()
        return NextResponse.json({
          success: true,
          data: {
            queues: queueStats,
            workers: {status: 'active'}, // This would need worker status implementation
            uptime: process.uptime(),
            memory: process.memoryUsage()
          }
        })
    }

  } catch (error) {
    console.error('Job queue API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process job queue request'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    // Check if user is admin via admin profiles
    const admin = await getAuthenticatedAdmin(request)
    if (!admin) {
      return createAdminAuthErrorResponse('Admin access required')
    }

    const body = await request.json()
    const { action, queueName, ...params } = body

    switch (action) {
      case 'clear-queue':
        if (!queueName) {
          return NextResponse.json({
            success: false,
            message: 'Queue name required'
          }, { status: 400 })
        }

        await jobQueue.clearQueue(queueName)
        return NextResponse.json({
          success: true,
          message: `Queue ${queueName} cleared successfully`
        })

      case 'trigger-cleanup':
        const { JobQueueManager } = await import('@/lib/job-queue')
        const cleanupJob = await JobQueueManager.addJob('cleanup', 'cleanup_expired_data', {
          dataType: params.dataType || 'expired_sessions',
          olderThanDays: params.olderThanDays || 30
        })

        return NextResponse.json({
          success: true,
          data: {
            jobId: cleanupJob.id,
            message: 'Cleanup job scheduled successfully'
          }
        })

      case 'start-workers':
        jobQueue.startWorkers()
        return NextResponse.json({
          success: true,
          message: 'Job workers started successfully'
        })

      case 'stop-workers':
        await jobQueue.stopWorkers()
        return NextResponse.json({
          success: true,
          message: 'Job workers stopped successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Job queue management error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process job queue management request'
    }, { status: 500 })
  }
}
