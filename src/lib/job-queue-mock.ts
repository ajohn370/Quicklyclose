/**
 * Mock Job Queue System for Development
 * Replaces Redis-based BullMQ with in-memory mock for local development
 */

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

// Mock Job interface
interface MockJob<T = any> {
  id: string
  name: string
  data: T
  status: 'waiting' | 'active' | 'completed' | 'failed'
  progress: number
  createdAt: number
  processedAt?: number
  finishedAt?: number
  failedReason?: string
  logs: string[]
}

// In-memory storage for mock jobs
const mockJobs = new Map<string, MockJob>()
const queueStats = {
  analysis: { waiting: 12, active: 3, completed: 45, failed: 2 },
  notifications: { waiting: 5, active: 1, completed: 123, failed: 0 },
  pricing: { waiting: 8, active: 2, completed: 67, failed: 1 },
  bidding: { waiting: 3, active: 0, completed: 28, failed: 0 },
  cleanup: { waiting: 1, active: 0, completed: 15, failed: 0 },
}

export class MockJobQueueManager {
  private static instance: MockJobQueueManager

  private constructor() {}

  static getInstance(): MockJobQueueManager {
    if (!MockJobQueueManager.instance) {
      MockJobQueueManager.instance = new MockJobQueueManager()
    }
    return MockJobQueueManager.instance
  }

  /**
   * Add mock job to queue
   */
  async addJob<T extends JobData>(
    queueName: string,
    jobType: JobType,
    data: T,
    options?: any
  ): Promise<MockJob<T>> {
    const jobId = `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: MockJob<T> = {
      id: jobId,
      name: jobType,
      data,
      status: 'waiting',
      progress: 0,
      createdAt: Date.now(),
      logs: [`Job ${jobType} created in queue ${queueName}`]
    }

    mockJobs.set(jobId, job)
    
    // Simulate job processing
    setTimeout(() => this.processJob(jobId), Math.random() * 5000 + 1000)
    
    console.log(`Mock job ${jobType} added to queue ${queueName}:`, data)
    return job
  }

  private async processJob(jobId: string) {
    const job = mockJobs.get(jobId)
    if (!job) return

    // Simulate processing
    job.status = 'active'
    job.processedAt = Date.now()
    job.logs.push(`Job ${job.name} started processing`)

    // Simulate progress updates
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 200))
      job.progress = i
      job.logs.push(`Job ${job.name} progress: ${i}%`)
    }

    // Complete job
    job.status = 'completed'
    job.finishedAt = Date.now()
    job.logs.push(`Job ${job.name} completed successfully`)
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string) {
    const job = mockJobs.get(jobId)
    
    if (!job) {
      return { status: 'not_found', job: null }
    }

    return {
      status: job.status,
      job: {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        logs: job.logs,
        createdAt: job.createdAt,
        processedAt: job.processedAt,
        finishedAt: job.finishedAt,
        failedReason: job.failedReason,
      }
    }
  }

  /**
   * Schedule recurring job (mock)
   */
  async scheduleRecurringJob<T extends JobData>(
    queueName: string,
    jobType: JobType,
    data: T,
    cronExpression: string
  ) {
    console.log(`Mock recurring job ${jobType} scheduled with pattern ${cronExpression}`)
    return this.addJob(queueName, jobType, data)
  }

  /**
   * Get queue statistics (mock data)
   */
  async getQueueStats() {
    // Add some randomness to make it look realistic
    Object.keys(queueStats).forEach(queueName => {
      const stats = (queueStats as any)[queueName]
      // Randomly adjust numbers slightly
      if (Math.random() > 0.7) {
        stats.waiting += Math.floor(Math.random() * 3) - 1
        stats.active += Math.floor(Math.random() * 2) - 1
        stats.completed += Math.floor(Math.random() * 5)
        
        // Ensure no negative numbers
        stats.waiting = Math.max(0, stats.waiting)
        stats.active = Math.max(0, stats.active)
      }
      
      stats.total = stats.waiting + stats.active + stats.completed + stats.failed
    })
    
    return queueStats
  }

  /**
   * Clear queue (mock)
   */
  async clearQueue(queueName: string) {
    console.log(`Mock queue ${queueName} cleared`)
    // Reset stats for this queue
    if ((queueStats as any)[queueName]) {
      (queueStats as any)[queueName] = { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 }
    }
  }

  /**
   * Start workers (mock)
   */
  startWorkers(): void {
    console.log('[MOCK] Starting job workers...')
    // In a real implementation, this would start Redis workers
  }

  /**
   * Stop workers (mock)
   */
  async stopWorkers(): Promise<void> {
    console.log('[MOCK] Stopping job workers...')
    // In a real implementation, this would stop Redis workers
  }

  // Static wrapper methods for convenience
  static async addJob<T extends JobData>(
    queueName: string,
    jobType: JobType,
    data: T,
    options?: any
  ): Promise<MockJob<T>> {
    return MockJobQueueManager.getInstance().addJob(queueName, jobType, data, options)
  }

  static async getQueueStats() {
    return MockJobQueueManager.getInstance().getQueueStats()
  }

  static async getJobStatus(queueName: string, jobId: string) {
    return MockJobQueueManager.getInstance().getJobStatus(queueName, jobId)
  }
}

// Singleton instance
export const jobQueue = MockJobQueueManager.getInstance()

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
  // Schedule daily cleanup at 2 AM (mock)
  return await jobQueue.scheduleRecurringJob('cleanup', 'cleanup_expired_data', {
    dataType: 'expired_sessions',
    olderThanDays: 30
  }, '0 2 * * *')
}

// Export JobQueueManager class for compatibility
export const JobQueueManager = MockJobQueueManager
