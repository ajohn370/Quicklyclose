/**
 * Bidding Job Processor
 * Handles bidding window management and automated bid closure
 */

import { Job } from 'bullmq'
import { BiddingWindowJobData } from '../job-queue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processBiddingJob(job: Job<BiddingWindowJobData>) {
  const { propertyId, biddingWindowId, action } = job.data

  try {
    switch (action) {
      case 'close':
        return await closeBiddingWindow(job, propertyId, biddingWindowId)
      case 'extend':
        return await extendBiddingWindow(job, propertyId, biddingWindowId)
      case 'cancel':
        return await cancelBiddingWindow(job, propertyId, biddingWindowId)
      default:
        throw new Error(`Unknown bidding action: ${action}`)
    }
  } catch (error) {
    console.error(`Bidding job ${job.id} failed:`, error)
    throw error
  }
}

async function closeBiddingWindow(
  job: Job<BiddingWindowJobData>, 
  propertyId: string, 
  biddingWindowId: string
) {
  await job.updateProgress(10)

  // 1. Get bidding window details
  const { data: biddingWindow, error: windowError } = await supabase
    .from('bidding_windows')
    .select('*')
    .eq('id', biddingWindowId)
    .single()

  if (windowError || !biddingWindow) {
    throw new Error(`Failed to fetch bidding window: ${windowError?.message}`)
  }

  if (biddingWindow.status !== 'active') {
    return { success: true, message: 'Bidding window already closed' }
  }

  await job.updateProgress(30)

  // 2. Get all bids for this window
  const { data: bids, error: bidsError } = await supabase
    .from('bids')
    .select(`
      *,
      investor:investor_profiles(*)
    `)
    .eq('bidding_window_id', biddingWindowId)
    .eq('status', 'active')
    .order('amount', { ascending: false })

  if (bidsError) {
    throw new Error(`Failed to fetch bids: ${bidsError.message}`)
  }

  await job.updateProgress(50)

  // 3. Determine winning bid
  let winningBid = null
  let bidResults = []

  if (bids && bids.length > 0) {
    winningBid = bids[0] // Highest bid wins
    
    // Create bid results
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i]
      const isWinner = i === 0
      
      bidResults.push({
        bid_id: bid.id,
        investor_id: bid.investor_id,
        amount: bid.amount,
        rank: i + 1,
        status: isWinner ? 'won' : 'lost',
        result_reason: isWinner ? 'highest_bid' : 'outbid'
      })

      // Update bid status
      await supabase
        .from('bids')
        .update({ 
          status: isWinner ? 'won' : 'lost',
          result_reason: isWinner ? 'highest_bid' : 'outbid'
        })
        .eq('id', bid.id)
    }
  }

  await job.updateProgress(70)

  // 4. Close bidding window and save results
  const { data: closedWindow, error: closeError } = await supabase
    .from('bidding_windows')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      winning_bid_id: winningBid?.id || null,
      total_bids: bids?.length || 0,
      highest_bid: winningBid?.amount || null,
      metadata: {
        ...biddingWindow.metadata,
        closedBy: 'system',
        jobId: job.id
      }
    })
    .eq('id', biddingWindowId)
    .select()
    .single()

  if (closeError || !closedWindow) {
    throw new Error(`Failed to close bidding window: ${closeError?.message}`)
  }

  // 5. Insert bid results
  if (bidResults.length > 0) {
    const { error: resultsError } = await supabase
      .from('bid_results')
      .insert(bidResults.map(result => ({
        ...result,
        bidding_window_id: biddingWindowId,
        property_id: propertyId
      })))

    if (resultsError) {
      console.error('Failed to save bid results:', resultsError)
    }
  }

  await job.updateProgress(85)

  // 6. Update property status
  const newPropertyStatus = winningBid ? 'bid_accepted' : 'bidding_ended'
  await supabase
    .from('properties')
    .update({ status: newPropertyStatus })
    .eq('id', propertyId)

  // 7. Create state transition
  await supabase
    .from('property_transitions')
    .insert({
      property_id: propertyId,
      from_state: 'bidding_active',
      to_state: newPropertyStatus,
      triggered_by: 'system',
      metadata: {
        biddingWindowId,
        winningBidId: winningBid?.id,
        winningAmount: winningBid?.amount,
        totalBids: bids?.length || 0
      }
    })

  await job.updateProgress(95)

  // 8. Send notifications
  const { addNotificationJob } = await import('../job-queue')
  
  // Notify all bidders about results
  if (bids && bids.length > 0) {
    for (const bid of bids) {
      await addNotificationJob({
        sellerId: bid.investor_id, // This would need to be adjusted for investor notifications
        propertyId,
        notificationType: bid.id === winningBid?.id ? 'bid_won' : 'bid_lost',
        data: {
          bidAmount: bid.amount,
          winningAmount: winningBid?.amount,
          rank: bidResults.find(r => r.bid_id === bid.id)?.rank
        }
      } as any)
    }
  }

  await job.updateProgress(100)

  return {
    success: true,
    biddingWindowId,
    status: 'closed',
    totalBids: bids?.length || 0,
    winningBid: winningBid ? {
      id: winningBid.id,
      amount: winningBid.amount,
      investorId: winningBid.investor_id
    } : null,
    closedAt: closedWindow.closed_at
  }
}

async function extendBiddingWindow(
  job: Job<BiddingWindowJobData>, 
  propertyId: string, 
  biddingWindowId: string
) {
  await job.updateProgress(30)

  // Default extension of 24 hours
  const extensionHours = 24
  const newCloseTime = new Date()
  newCloseTime.setHours(newCloseTime.getHours() + extensionHours)

  const { data: extendedWindow, error: extendError } = await supabase
    .from('bidding_windows')
    .update({
      scheduled_close_time: newCloseTime.toISOString(),
      metadata: {
        extended: true,
        extensionHours,
        originalCloseTime: new Date().toISOString(),
        extendedBy: 'system',
        jobId: job.id
      }
    })
    .eq('id', biddingWindowId)
    .select()
    .single()

  if (extendError || !extendedWindow) {
    throw new Error(`Failed to extend bidding window: ${extendError?.message}`)
  }

  await job.updateProgress(70)

  // Schedule new close job
  const { addBiddingJob } = await import('../job-queue')
  const delayMs = extensionHours * 60 * 60 * 1000 // Convert hours to milliseconds
  
  await addBiddingJob({
    propertyId,
    biddingWindowId,
    action: 'close'
  }, delayMs)

  await job.updateProgress(100)

  return {
    success: true,
    biddingWindowId,
    status: 'extended',
    newCloseTime: newCloseTime.toISOString(),
    extensionHours
  }
}

async function cancelBiddingWindow(
  job: Job<BiddingWindowJobData>, 
  propertyId: string, 
  biddingWindowId: string
) {
  await job.updateProgress(30)

  // 1. Cancel bidding window
  const { data: cancelledWindow, error: cancelError } = await supabase
    .from('bidding_windows')
    .update({
      status: 'cancelled',
      closed_at: new Date().toISOString(),
      metadata: {
        cancelledBy: 'system',
        cancelReason: 'automated_cancellation',
        jobId: job.id
      }
    })
    .eq('id', biddingWindowId)
    .select()
    .single()

  if (cancelError || !cancelledWindow) {
    throw new Error(`Failed to cancel bidding window: ${cancelError?.message}`)
  }

  await job.updateProgress(60)

  // 2. Cancel all active bids
  const { data: cancelledBids, error: bidsError } = await supabase
    .from('bids')
    .update({ 
      status: 'cancelled',
      result_reason: 'bidding_cancelled'
    })
    .eq('bidding_window_id', biddingWindowId)
    .eq('status', 'active')
    .select()

  if (bidsError) {
    console.error('Failed to cancel bids:', bidsError)
  }

  await job.updateProgress(80)

  // 3. Update property status
  await supabase
    .from('properties')
    .update({ status: 'bidding_cancelled' })
    .eq('id', propertyId)

  // 4. Create state transition
  await supabase
    .from('property_transitions')
    .insert({
      property_id: propertyId,
      from_state: 'bidding_active',
      to_state: 'bidding_cancelled',
      triggered_by: 'system',
      metadata: {
        biddingWindowId,
        cancelReason: 'automated_cancellation',
        cancelledBids: cancelledBids?.length || 0
      }
    })

  await job.updateProgress(100)

  return {
    success: true,
    biddingWindowId,
    status: 'cancelled',
    cancelledBids: cancelledBids?.length || 0,
    cancelledAt: cancelledWindow.closed_at
  }
}