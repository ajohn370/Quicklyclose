/**
 * Job Queue System using BullMQ + Redis
 * Handles background processing for long-running tasks
 */

import { Queue, Worker, Job, QueueOptions, JobsOptions } from 'bullmq'
import { Redis } from 'ioredis'

// Job Types
export type JobType = 
  | 'analyze_property'
  | 'property_analysis'
  | 'send_seller_notification'
  | 'approval_notification'
  | 'calculate_investor_price'
  | 'notify_investors_listing'
  | 'close_bidding_window'
  | 'cleanup_expired_data'

export interface AnalyzePropertyJobData {
  propertyId: string
  sellerId: string
  imageUrl: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  userId: string
  requestId: string
}

export interface SellerNotificationJobData {
  sellerId: string
  propertyId: string
  notificationType: 'pricing_proposal' | 'analysis_complete' | 'listing_approved'
  data: Record<string, any>
}

export interface InvestorPriceJobData {
  propertyId: string
  sellerPrice: number
  analysisId: string
  profitMarginRules: Record<string, number>
}

export interface InvestorNotificationJobData {
  propertyId: string
  investorIds?: string[]
  notificationType: 'new_listing' | 'bidding_open' | 'bidding_closed'
  listingData: Record<string, any>
}

export interface BiddingWindowJobData {
  propertyId: string
  biddingWindowId: string
  action: 'close' | 'extend' | 'cancel'
}

export interface CleanupJobData {
  dataType: 'rejected_submissions' | 'inactive_accounts' | 'expired_sessions'
  olderThanDays: number
}

export type JobData = 
  | AnalyzePropertyJobData
  | SellerNotificationJobData
  | InvestorPriceJobData
  | InvestorNotificationJobData
  | BiddingWindowJobData
  | CleanupJobData

// Redis Configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  family: 4,
}

// Check if we're in a build environment
const isBuildEnvironment = process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL && !process.env.RUNTIME

// Lazy Redis connection - only create when needed and not in build environment
let _redis: Redis | null = null
export const getRedis = (): Redis | null => {
  // Skip Redis connection during build
  if (isBuildEnvironment || process.env.NODE_ENV === 'test') {
    console.log('Skipping Redis connection in build environment')
    return null
  }
  
  if (!_redis) {
    try {
      _redis = new Redis(redisConfig)
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      return null
    }
  }
  return _redis
}

// Create connection only if not in build environment
export const redis = getRedis()

// Default queue options - only create if Redis is available
const queueOptions: QueueOptions | null = redis ? {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
} : null

// Job Queues - only create if not in build environment
export const queues = redis && queueOptions ? {
  analysis: new Queue<AnalyzePropertyJobData>('analysis', queueOptions),
  notifications: new Queue<SellerNotificationJobData | InvestorNotificationJobData>('notifications', queueOptions),
  pricing: new Queue<InvestorPriceJobData>('pricing', queueOptions),
  bidding: new Queue<BiddingWindowJobData>('bidding', queueOptions),
  cleanup: new Queue<CleanupJobData>('cleanup', queueOptions),
} : null

// Job Queue Manager
export class JobQueueManager {
  private static instance: JobQueueManager
  private workers: Worker[] = []

  private constructor() {}

  static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager()
    }
    return JobQueueManager.instance
  }

  /**
   * Add job to queue
   */
  async addJob<T extends JobData>(
    queueName: keyof typeof queues,
    jobType: JobType,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T> | null> {
    if (!queues) {
      console.warn('Job queues not available in build environment')
      return null
    }

    const queue = queues[queueName] as Queue<T>
    if (!queue) {
      console.warn(`Queue ${queueName} not available`)
      return null
    }
    
    const jobOptions: JobsOptions = {
      ...options,
      // Add job metadata
      jobId: `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    console.log(`Adding job ${jobType} to queue ${queueName}:`, data)
    return await (queue as any).add(jobType, data, jobOptions)
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: keyof typeof queues, jobId: string) {
    if (!queues) {
      return { status: 'unavailable', job: null }
    }

    const queue = queues[queueName]
    if (!queue) {
      return { status: 'queue_unavailable', job: null }
    }

    const job = await queue.getJob(jobId)
    
    if (!job) {
      return { status: 'not_found', job: null }
    }

    const state = await job.getState()
    const progress = job.progress
    const logs = (job as any).logs || []

    return {
      status: state,
      job: {
        id: job.id,
        name: job.name,
        data: job.data,
        progress,
        logs,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn,
        failedReason: job.failedReason,
      }
    }
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob<T extends JobData>(
    queueName: keyof typeof queues,
    jobType: JobType,
    data: T,
    cronExpression: string
  ) {
    const queue = queues[queueName] as Queue<T>
    
    return await (queue as any).add(jobType, data, {
      repeat: { pattern: cronExpression },
      jobId: `recurring_${jobType}`,
    })
  }

  /**
   * Start workers for processing jobs
   */
  startWorkers() {
    // Analysis worker
    const analysisWorker = new Worker('analysis', async (job: Job<AnalyzePropertyJobData>) => {
      const { processAnalysisJob } = await import('./job-processors/analysis-processor')
      return await processAnalysisJob(job)
    }, { connection: redis })

    // Notifications worker
    const notificationsWorker = new Worker('notifications', async (job: Job<SellerNotificationJobData | InvestorNotificationJobData>) => {
      const { processNotificationJob } = await import('./job-processors/notification-processor')
      return await processNotificationJob(job)
    }, { connection: redis })

    // Pricing worker
    const pricingWorker = new Worker('pricing', async (job: Job<InvestorPriceJobData>) => {
      const { processPricingJob } = await import('./job-processors/pricing-processor')
      return await processPricingJob(job)
    }, { connection: redis })

    // Bidding worker
    const biddingWorker = new Worker('bidding', async (job: Job<BiddingWindowJobData>) => {
      const { processBiddingJob } = await import('./job-processors/bidding-processor')
      return await processBiddingJob(job)
    }, { connection: redis })

    // Cleanup worker
    const cleanupWorker = new Worker('cleanup', async (job: Job<CleanupJobData>) => {
      const { processCleanupJob } = await import('./job-processors/cleanup-processor')
      return await processCleanupJob(job)
    }, { connection: redis })

    this.workers = [
      analysisWorker,
      notificationsWorker,
      pricingWorker,
      biddingWorker,
      cleanupWorker,
    ]

    // Add error handling
    this.workers.forEach(worker => {
      worker.on('completed', job => {
        console.log(`Job ${job.id} completed successfully`)
      })

      worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed:`, err)
      })

      worker.on('error', err => {
        console.error('Worker error:', err)
      })
    })

    console.log('Job workers started successfully')
  }

  /**
   * Stop all workers
   */
  async stopWorkers() {
    await Promise.all(this.workers.map(worker => worker.close()))
    this.workers = []
    console.log('Job workers stopped')
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    [queueName: string]: {
      waiting: number
      active: number
      completed: number
      failed: number
      total: number
    }
  }> {
    const stats: any = {}
    
    for (const [name, queue] of Object.entries(queues)) {
      const waiting = await queue.getWaiting()
      const active = await queue.getActive()
      const completed = await queue.getCompleted()
      const failed = await queue.getFailed()

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      }
    }
    
    return stats
  }

  /**
   * Clear queue
   */
  async clearQueue(queueName: keyof typeof queues) {
    const queue = queues[queueName]
    await queue.obliterate({ force: true })
    console.log(`Queue ${queueName} cleared`)
  }

  // Static wrapper methods for convenience
  static async addJob<T extends JobData>(
    queueName: keyof typeof queues,
    jobType: JobType,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T>> {
    return JobQueueManager.getInstance().addJob(queueName, jobType, data, options)
  }

  static async getQueueStats() {
    return JobQueueManager.getInstance().getQueueStats()
  }

  static async getJobStatus(queueName: keyof typeof queues, jobId: string) {
    return JobQueueManager.getInstance().getJobStatus(queueName, jobId)
  }
}

// Singleton instance
export const jobQueue = JobQueueManager.getInstance()

// Helper functions for common job operations
export async function addAnalysisJob(data: AnalyzePropertyJobData, priority?: number) {
  return await jobQueue.addJob('analysis', 'analyze_property', data, { priority })
}

export async function addNotificationJob(data: SellerNotificationJobData | InvestorNotificationJobData, delay?: number) {
  return await jobQueue.addJob('notifications', 
    'sellerId' in data ? 'send_seller_notification' : 'notify_investors_listing', 
    data, 
    { delay }
  )
}

export async function addPricingJob(data: InvestorPriceJobData) {
  return await jobQueue.addJob('pricing', 'calculate_investor_price', data)
}

export async function addBiddingJob(data: BiddingWindowJobData, delay?: number) {
  return await jobQueue.addJob('bidding', 'close_bidding_window', data, { delay })
}

export async function scheduleCleanupJob() {
  // Schedule daily cleanup at 2 AM
  return await jobQueue.scheduleRecurringJob('cleanup', 'cleanup_expired_data', {
    dataType: 'expired_sessions',
    olderThanDays: 30
  }, '0 2 * * *')
}