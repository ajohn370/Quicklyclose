import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Property Image Upload API
 * Handles property image uploads with Supabase Storage integration
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const propertyId = formData.get('propertyId') as string

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    if (!propertyId) {
      return NextResponse.json({
        success: false,
        error: 'Property ID is required'
      }, { status: 400 })
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'Only image files are allowed'
      }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({
        success: false,
        error: 'File size must be less than 10MB'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    const extension = file.name.split('.').pop()
    const fileName = `${propertyId}_${timestamp}_${random}.${extension}`
    const filePath = `property-images/${fileName}`

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({
        success: false,
        error: 'Failed to upload image'
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Save image record to database
    const { data: imageRecord, error: dbError } = await supabase
      .from('property_images')
      .insert({
        property_id: propertyId,
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
        public_url: publicUrl
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to cleanup the uploaded file
      await supabase.storage.from('property-images').remove([filePath])
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save image record'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: imageRecord.id,
        url: publicUrl,
        fileName: fileName,
        size: file.size,
        contentType: file.type
      }
    })

  } catch (error) {
    console.error('Property image upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}