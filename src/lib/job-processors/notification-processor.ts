/**
 * Notification Job Processor
 * Handles email notifications and other communication jobs
 */

import { Job } from 'bullmq'
import { SellerNotificationJobData, InvestorNotificationJobData } from '../job-queue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processNotificationJob(
  job: Job<SellerNotificationJobData | InvestorNotificationJobData>
) {
  const jobData = job.data

  try {
    // Determine notification type and process accordingly
    if ('sellerId' in jobData) {
      return await processSellerNotification(job as Job<SellerNotificationJobData>)
    } else {
      return await processInvestorNotification(job as Job<InvestorNotificationJobData>)
    }
  } catch (error) {
    console.error(`Notification job ${job.id} failed:`, error)
    throw error
  }
}

async function processSellerNotification(job: Job<SellerNotificationJobData>) {
  const { sellerId, propertyId, notificationType, data } = job.data

  await job.updateProgress(10)

  // 1. Get seller information
  const { data: seller, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('id', sellerId)
    .single()

  if (sellerError || !seller) {
    throw new Error(`Failed to fetch seller: ${sellerError?.message}`)
  }

  await job.updateProgress(30)

  // 2. Get property information
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (propertyError || !property) {
    throw new Error(`Failed to fetch property: ${propertyError?.message}`)
  }

  await job.updateProgress(50)

  // 3. Generate email content based on notification type
  const emailContent = generateSellerEmailContent(notificationType, seller, property, data)

  // 4. Send email (mock implementation - replace with actual email service)
  await sendEmail({
    to: seller.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  })

  await job.updateProgress(80)

  // 5. Log notification in database
  const { error: logError } = await supabase
    .from('notification_logs')
    .insert({
      recipient_type: 'seller',
      recipient_id: sellerId,
      notification_type: notificationType,
      subject: emailContent.subject,
      status: 'sent',
      metadata: {
        propertyId,
        jobId: job.id,
        ...data
      }
    })

  if (logError) {
    console.error('Failed to log notification:', logError)
    // Don't fail the job for logging issues
  }

  await job.updateProgress(100)

  return {
    success: true,
    recipientEmail: seller.email,
    notificationType,
    sentAt: new Date().toISOString()
  }
}

async function processInvestorNotification(job: Job<InvestorNotificationJobData>) {
  const { propertyId, investorIds, notificationType, listingData } = job.data

  await job.updateProgress(10)

  // 1. Get property information
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (propertyError || !property) {
    throw new Error(`Failed to fetch property: ${propertyError?.message}`)
  }

  await job.updateProgress(30)

  // 2. Get investor list (all active investors if not specified)
  let investorsQuery = supabase
    .from('investor_profiles')
    .select('*')

  if (investorIds && investorIds.length > 0) {
    investorsQuery = investorsQuery.in('id', investorIds)
  }

  const { data: investors, error: investorsError } = await investorsQuery

  if (investorsError) {
    throw new Error(`Failed to fetch investors: ${investorsError?.message}`)
  }

  if (!investors || investors.length === 0) {
    return { success: true, message: 'No investors to notify' }
  }

  await job.updateProgress(50)

  // 3. Filter investors based on their preferences
  const filteredInvestors = filterInvestorsByPreferences(investors, property, listingData)

  const totalInvestors = filteredInvestors.length
  let notifiedCount = 0

  // 4. Send notifications to each investor
  for (const investor of filteredInvestors) {
    try {
      const emailContent = generateInvestorEmailContent(notificationType, investor, property, listingData)

      await sendEmail({
        to: investor.user_id, // This would be the user's email from auth
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      })

      // Log notification
      await supabase
        .from('notification_logs')
        .insert({
          recipient_type: 'investor',
          recipient_id: investor.id,
          notification_type: notificationType,
          subject: emailContent.subject,
          status: 'sent',
          metadata: {
            propertyId,
            jobId: job.id,
            ...listingData
          }
        })

      notifiedCount++
    } catch (error) {
      console.error(`Failed to notify investor ${investor.id}:`, error)
      // Continue with other investors
    }

    await job.updateProgress(50 + (notifiedCount / totalInvestors) * 50)
  }

  return {
    success: true,
    totalInvestors,
    notifiedCount,
    notificationType,
    sentAt: new Date().toISOString()
  }
}

function generateSellerEmailContent(
  notificationType: SellerNotificationJobData['notificationType'],
  seller: any,
  property: any,
  data: any
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const propertyAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`

  switch (notificationType) {
    case 'analysis_complete':
      return {
        subject: `Property Analysis Complete - ${propertyAddress}`,
        html: `
          <h2>Your Property Analysis is Ready</h2>
          <p>Hi ${seller.full_name},</p>
          <p>We've completed the analysis for your property at <strong>${propertyAddress}</strong>.</p>
          <p><strong>Estimated Value:</strong> $${data.estimatedValue?.toLocaleString()}</p>
          <p><strong>Confidence Level:</strong> ${data.confidence}%</p>
          <p>Our team will review these results and get back to you with a pricing proposal soon.</p>
          <p><a href="${baseUrl}/seller-portal">View your property dashboard</a></p>
        `,
        text: `Your property analysis is complete for ${propertyAddress}. Estimated value: $${data.estimatedValue?.toLocaleString()} with ${data.confidence}% confidence.`
      }

    case 'pricing_proposal':
      return {
        subject: `Pricing Proposal Ready - ${propertyAddress}`,
        html: `
          <h2>Pricing Proposal for Your Property</h2>
          <p>Hi ${seller.full_name},</p>
          <p>We have a pricing proposal ready for your property at <strong>${propertyAddress}</strong>.</p>
          <p><strong>Proposed Price:</strong> $${data.proposedPrice?.toLocaleString()}</p>
          <p>Please review and let us know if you'd like to proceed.</p>
          <p><a href="${baseUrl}/seller-portal/pricing/${property.id}">Review Pricing Proposal</a></p>
        `,
        text: `Pricing proposal ready for ${propertyAddress}: $${data.proposedPrice?.toLocaleString()}`
      }

    default:
      return {
        subject: `Update on Your Property - ${propertyAddress}`,
        html: `<p>Hi ${seller.full_name},</p><p>There's an update on your property at ${propertyAddress}.</p>`,
        text: `Update on your property at ${propertyAddress}`
      }
  }
}

function generateInvestorEmailContent(
  notificationType: InvestorNotificationJobData['notificationType'],
  investor: any,
  property: any,
  listingData: any
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const propertyAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`

  switch (notificationType) {
    case 'new_listing':
      return {
        subject: `New Investment Opportunity - ${propertyAddress}`,
        html: `
          <h2>New Property Available</h2>
          <p>Hi ${investor.full_name},</p>
          <p>A new investment property is now available that matches your criteria:</p>
          <p><strong>Address:</strong> ${propertyAddress}</p>
          <p><strong>Price:</strong> $${listingData.investorPrice?.toLocaleString()}</p>
          <p><strong>Property Type:</strong> ${property.property_type}</p>
          <p><strong>Bedrooms:</strong> ${property.bedrooms} | <strong>Bathrooms:</strong> ${property.bathrooms}</p>
          <p><a href="${baseUrl}/investor-portal/properties/${property.id}">View Property Details</a></p>
        `,
        text: `New investment property available: ${propertyAddress} for $${listingData.investorPrice?.toLocaleString()}`
      }

    case 'bidding_open':
      return {
        subject: `Bidding Now Open - ${propertyAddress}`,
        html: `
          <h2>Bidding Window Open</h2>
          <p>Hi ${investor.full_name},</p>
          <p>Bidding is now open for the property at <strong>${propertyAddress}</strong>.</p>
          <p><strong>Starting Price:</strong> $${listingData.startingPrice?.toLocaleString()}</p>
          <p><strong>Bidding Closes:</strong> ${new Date(listingData.biddingCloseTime).toLocaleString()}</p>
          <p><a href="${baseUrl}/investor-portal/bidding/${property.id}">Place Your Bid</a></p>
        `,
        text: `Bidding now open for ${propertyAddress}. Starting price: $${listingData.startingPrice?.toLocaleString()}`
      }

    default:
      return {
        subject: `Property Update - ${propertyAddress}`,
        html: `<p>Hi ${investor.full_name},</p><p>There's an update on the property at ${propertyAddress}.</p>`,
        text: `Update on property at ${propertyAddress}`
      }
  }
}

function filterInvestorsByPreferences(investors: any[], property: any, listingData: any) {
  return investors.filter(investor => {
    // Filter by location preferences
    if (investor.preferred_locations && investor.preferred_locations.length > 0) {
      const matchesLocation = investor.preferred_locations.some((location: string) =>
        property.city.toLowerCase().includes(location.toLowerCase()) ||
        property.state.toLowerCase().includes(location.toLowerCase())
      )
      if (!matchesLocation) return false
    }

    // Filter by investment range
    const price = listingData.investorPrice || property.estimated_value
    if (price) {
      if (investor.minimum_investment && price < investor.minimum_investment) return false
      if (investor.maximum_investment && price > investor.maximum_investment) return false
    }

    // Filter by investment focus
    if (investor.investment_focus && investor.investment_focus.length > 0) {
      const propertyType = property.property_type.toLowerCase()
      const matchesFocus = investor.investment_focus.some((focus: string) =>
        focus.toLowerCase().includes(propertyType) ||
        propertyType.includes(focus.toLowerCase())
      )
      if (!matchesFocus) return false
    }

    return true
  })
}

// Mock email service - replace with actual implementation
async function sendEmail(emailData: {
  to: string
  subject: string
  html: string
  text: string
}) {
  // In production, integrate with SendGrid, AWS SES, or similar
  console.log('Sending email:', {
    to: emailData.to,
    subject: emailData.subject
  })

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 100))

  return { success: true, messageId: `mock_${Date.now()}` }
}