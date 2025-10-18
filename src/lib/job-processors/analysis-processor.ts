/**
 * Analysis Job Processor
 * Handles property analysis background jobs
 */

import { Job } from 'bullmq'
import { AnalyzePropertyJobData } from '../job-queue'
import { compAIService } from '../comp-ai-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processAnalysisJob(job: Job<AnalyzePropertyJobData>) {
  const { propertyId, sellerId, imageUrl, address, userId, requestId } = job.data

  try {
    // Update job progress
    await job.updateProgress(10)

    // 1. Update property status to 'analyzing'
    const { error: statusError } = await supabase
      .from('properties')
      .update({ status: 'analyzing' })
      .eq('id', propertyId)

    if (statusError) {
      throw new Error(`Failed to update property status: ${statusError.message}`)
    }

    await job.updateProgress(20)

    // 2. Call Comp AI service for analysis
    const analysisRequest = {
      imageUrl,
      address,
      requestId,
      userId
    }

    const analysisResponse = await compAIService.analyzeProperty(analysisRequest)

    if (!analysisResponse.success) {
      throw new Error(`Analysis failed: ${analysisResponse.error}`)
    }

    await job.updateProgress(70)

    // 3. Update property with analysis results
    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({
        estimated_value: analysisResponse.data?.estimated_value,
        status: 'pending_admin_review'
      })
      .eq('id', propertyId)

    if (propertyUpdateError) {
      throw new Error(`Failed to update property with analysis: ${propertyUpdateError.message}`)
    }

    await job.updateProgress(80)

    // 4. Create property state transition record
    const { error: transitionError } = await supabase
      .from('property_transitions')
      .insert({
        property_id: propertyId,
        from_state: 'submitted',
        to_state: 'pending_admin_review',
        triggered_by: 'system',
        metadata: {
          analysisId: analysisResponse.data?.id,
          estimatedValue: analysisResponse.data?.estimated_value,
          confidence: analysisResponse.data?.confidence,
          processingTime: analysisResponse.processingTime
        }
      })

    if (transitionError) {
      console.error('Failed to create state transition:', transitionError)
      // Don't fail the job for this, just log it
    }

    await job.updateProgress(90)

    // 5. Trigger notification to admin about new analysis
    const { addNotificationJob } = await import('../job-queue')
    await addNotificationJob({
      sellerId,
      propertyId,
      notificationType: 'analysis_complete',
      data: {
        analysisId: analysisResponse.data?.id,
        estimatedValue: analysisResponse.data?.estimated_value,
        confidence: analysisResponse.data?.confidence
      }
    })

    await job.updateProgress(100)

    return {
      success: true,
      analysisId: analysisResponse.data?.id,
      estimatedValue: analysisResponse.data?.estimated_value,
      confidence: analysisResponse.data?.confidence,
      processingTime: analysisResponse.processingTime
    }

  } catch (error) {
    // Update property status to failed
    await supabase
      .from('properties')
      .update({ status: 'analysis_failed' })
      .eq('id', propertyId)

    // Create failure state transition
    await supabase
      .from('property_transitions')
      .insert({
        property_id: propertyId,
        from_state: 'analyzing',
        to_state: 'analysis_failed',
        triggered_by: 'system',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          jobId: job.id
        }
      })

    throw error
  }
}