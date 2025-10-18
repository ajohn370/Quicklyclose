/**
 * Cleanup Job Processor
 * Handles data retention policies and automated cleanup tasks
 */

import { Job } from 'bullmq'
import { CleanupJobData } from '../job-queue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processCleanupJob(job: Job<CleanupJobData>) {
  const { dataType, olderThanDays } = job.data

  try {
    switch (dataType) {
      case 'rejected_submissions':
        return await cleanupRejectedSubmissions(job, olderThanDays)
      case 'inactive_accounts':
        return await cleanupInactiveAccounts(job, olderThanDays)
      case 'expired_sessions':
        return await cleanupExpiredSessions(job, olderThanDays)
      default:
        throw new Error(`Unknown cleanup data type: ${dataType}`)
    }
  } catch (error) {
    console.error(`Cleanup job ${job.id} failed:`, error)
    throw error
  }
}

async function cleanupRejectedSubmissions(job: Job<CleanupJobData>, olderThanDays: number) {
  await job.updateProgress(10)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  // 1. Find rejected submissions older than cutoff date
  const { data: rejectedSubmissions, error: findError } = await supabase
    .from('properties')
    .select('id, seller_id, address, created_at')
    .eq('status', 'rejected')
    .lt('created_at', cutoffDate.toISOString())

  if (findError) {
    throw new Error(`Failed to find rejected submissions: ${findError.message}`)
  }

  if (!rejectedSubmissions || rejectedSubmissions.length === 0) {
    return {
      success: true,
      message: 'No rejected submissions to clean up',
      deletedCount: 0
    }
  }

  await job.updateProgress(30)

  let deletedCount = 0
  const errors = []

  // 2. Process each rejected submission
  for (const submission of rejectedSubmissions) {
    try {
      // Delete related data first (foreign key constraints)
      
      // Delete comp vision analyses
      await supabase
        .from('comp_vision_analyses')
        .delete()
        .eq('property_id', submission.id)

      // Delete property transitions
      await supabase
        .from('property_transitions')
        .delete()
        .eq('property_id', submission.id)

      // Delete leads
      await supabase
        .from('leads')
        .delete()
        .eq('property_id', submission.id)

      // Delete pricing revisions
      await supabase
        .from('pricing_revisions')
        .delete()
        .eq('property_id', submission.id)

      // Finally delete the property
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', submission.id)

      if (deleteError) {
        errors.push(`Failed to delete property ${submission.id}: ${deleteError.message}`)
      } else {
        deletedCount++
        
        // Log cleanup action
        await supabase
          .from('admin_activity_logs')
          .insert({
            admin_id: 'system',
            action: 'CLEANUP_REJECTED_SUBMISSION',
            resource_type: 'property',
            resource_id: submission.id,
            metadata: {
              address: submission.address,
              sellerId: submission.seller_id,
              olderThanDays,
              jobId: job.id
            }
          })
      }
    } catch (error) {
      errors.push(`Error processing submission ${submission.id}: ${error}`)
    }

    await job.updateProgress(30 + (deletedCount / rejectedSubmissions.length) * 60)
  }

  await job.updateProgress(100)

  return {
    success: true,
    message: `Cleaned up ${deletedCount} rejected submissions`,
    deletedCount,
    errors: errors.length > 0 ? errors : undefined
  }
}

async function cleanupInactiveAccounts(job: Job<CleanupJobData>, olderThanDays: number) {
  await job.updateProgress(10)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  // 1. Find inactive seller profiles (no activity and no properties)
  const { data: inactiveSellers, error: sellersError } = await supabase
    .from('seller_profiles')
    .select(`
      id, 
      email, 
      full_name, 
      created_at, 
      updated_at,
      properties:properties(count)
    `)
    .lt('updated_at', cutoffDate.toISOString())
    .is('user_id', null) // Only anonymous submissions

  if (sellersError) {
    throw new Error(`Failed to find inactive sellers: ${sellersError.message}`)
  }

  const sellersToDelete = inactiveSellers?.filter(seller => 
    seller.properties?.[0]?.count === 0 // No properties
  ) || []

  await job.updateProgress(30)

  // 2. Find inactive investor profiles (no activity, no bids)
  const { data: inactiveInvestors, error: investorsError } = await supabase
    .from('investor_profiles')
    .select(`
      id, 
      user_id, 
      full_name, 
      created_at, 
      updated_at,
      bids:bids(count)
    `)
    .lt('updated_at', cutoffDate.toISOString())

  if (investorsError) {
    throw new Error(`Failed to find inactive investors: ${investorsError.message}`)
  }

  const investorsToDelete = inactiveInvestors?.filter(investor => 
    investor.bids?.[0]?.count === 0 // No bids
  ) || []

  await job.updateProgress(50)

  let deletedSellers = 0
  let deletedInvestors = 0
  const errors = []

  // 3. Delete inactive sellers
  for (const seller of sellersToDelete) {
    try {
      // Delete related leads first
      await supabase
        .from('leads')
        .delete()
        .eq('seller_id', seller.id)

      // Delete seller profile
      const { error: deleteError } = await supabase
        .from('seller_profiles')
        .delete()
        .eq('id', seller.id)

      if (deleteError) {
        errors.push(`Failed to delete seller ${seller.id}: ${deleteError.message}`)
      } else {
        deletedSellers++
      }
    } catch (error) {
      errors.push(`Error processing seller ${seller.id}: ${error}`)
    }
  }

  await job.updateProgress(75)

  // 4. Anonymize inactive investors (don't fully delete, preserve bid history)
  for (const investor of investorsToDelete) {
    try {
      const { error: anonymizeError } = await supabase
        .from('investor_profiles')
        .update({
          full_name: 'Deleted User',
          company_name: null,
          phone: null,
          investment_focus: [],
          preferred_locations: [],
          minimum_investment: 0,
          maximum_investment: 0
        })
        .eq('id', investor.id)

      if (anonymizeError) {
        errors.push(`Failed to anonymize investor ${investor.id}: ${anonymizeError.message}`)
      } else {
        deletedInvestors++
      }
    } catch (error) {
      errors.push(`Error processing investor ${investor.id}: ${error}`)
    }
  }

  await job.updateProgress(100)

  return {
    success: true,
    message: `Cleaned up ${deletedSellers} inactive sellers, anonymized ${deletedInvestors} inactive investors`,
    deletedSellers,
    anonymizedInvestors: deletedInvestors,
    errors: errors.length > 0 ? errors : undefined
  }
}

async function cleanupExpiredSessions(job: Job<CleanupJobData>, olderThanDays: number) {
  await job.updateProgress(10)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  // 1. Clean up expired notification logs
  const { data: expiredNotifications, error: notificationsError } = await supabase
    .from('notification_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id')

  if (notificationsError) {
    console.error('Failed to cleanup notification logs:', notificationsError)
  }

  await job.updateProgress(30)

  // 2. Clean up old admin activity logs (keep important actions)
  const { data: expiredLogs, error: logsError } = await supabase
    .from('admin_activity_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .not('action', 'in', '("DELETE_PROPERTY","DELETE_USER","SECURITY_VIOLATION")')
    .select('id')

  if (logsError) {
    console.error('Failed to cleanup admin logs:', logsError)
  }

  await job.updateProgress(60)

  // 3. Clean up old job logs from BullMQ (if accessible)
  // This would typically be handled by BullMQ's built-in retention settings
  // but we can also manually clean up very old records

  await job.updateProgress(80)

  // 4. Clean up temporary file uploads older than cutoff
  // This would interact with Supabase Storage API
  try {
    const { data: files, error: filesError } = await supabase.storage
      .from('property-images')
      .list('temp/', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      })

    if (!filesError && files) {
      const filesToDelete = files
        .filter(file => {
          const fileDate = new Date(file.created_at)
          return fileDate < cutoffDate
        })
        .map(file => `temp/${file.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('property-images')
          .remove(filesToDelete)
      }
    }
  } catch (error) {
    console.error('Failed to cleanup temporary files:', error)
  }

  await job.updateProgress(100)

  return {
    success: true,
    message: `Cleaned up expired sessions and temporary data`,
    deletedNotifications: expiredNotifications?.length || 0,
    deletedLogs: expiredLogs?.length || 0,
    cutoffDate: cutoffDate.toISOString()
  }
}