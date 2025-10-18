import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { getAuthenticatedAdmin, createAdminAuthErrorResponse } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
import { compAIService } from '@/lib/comp-ai-service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return createAuthErrorResponse('Authentication required to analyze images')
    }

    // Check if user is admin via admin profiles
    const admin = await getAuthenticatedAdmin(request)
    if (!admin) {
      return createAdminAuthErrorResponse('Admin access required for property analysis')
    }
    
    const formData = await request.formData()
    const image = formData.get('image') as File
    const street = formData.get('street') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const zip = formData.get('zip') as string

    if (!image || !street || !city || !state || !zip) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: image and full address are required.'
      }, { status: 400 })
    }

    // 1. Upload image to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${image.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, image)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return NextResponse.json({
        success: false,
        message: 'Failed to upload image.'
      }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    // 2. Call decoupled Comp AI service
    const requestId = crypto.randomUUID()
    const analysisRequest = {
      imageUrl,
      address: { street, city, state, zip },
      requestId,
      userId: user.id
    }

    const analysisResponse = await compAIService.analyzeProperty(analysisRequest)

    if (!analysisResponse.success) {
      return NextResponse.json({
        success: false,
        message: analysisResponse.error || 'Analysis service failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: analysisResponse.data,
      message: 'Image analysis completed',
      processingTime: analysisResponse.processingTime,
      requestId: analysisResponse.requestId
    })

  } catch (error) {
    console.error('Error analyzing image:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to analyze image'
    }, { status: 500 })
  }
}
