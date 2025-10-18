import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET bids for a property or investor
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { searchParams } = request.nextUrl
    const propertyId = searchParams.get('propertyId')
    const investorId = searchParams.get('investorId')
    
    const supabase = await createClient()
    const userRole = user.user_metadata?.role

    // Build query
    let query = supabase
      .from('property_bids')
      .select(`
        *,
        property:properties(
          id,
          address,
          city,
          state,
          listing_price,
          seller_id
        ),
        investor:investor_profiles(
          id,
          full_name,
          email,
          phone,
          company_name
        ),
        history:bid_history(
          action,
          previous_amount,
          new_amount,
          notes,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    if (investorId) {
      query = query.eq('investor_id', investorId)
    }

    // If user is investor, show their bids
    if (userRole === 'investor') {
      const { data: investorProfile } = await supabase
        .from('investor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (investorProfile && !investorId) {
        query = query.eq('investor_id', investorProfile.id)
      }
    }

    // If user is seller, show bids on their properties
    if (userRole === 'seller') {
      const { data: sellerProfile } = await supabase
        .from('seller_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (sellerProfile && !propertyId) {
        const { data: sellerProperties } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_id', sellerProfile.id)

        const propertyIds = sellerProperties?.map(p => p.id) || []
        if (propertyIds.length > 0) {
          query = query.in('property_id', propertyIds)
        }
      }
    }

    const { data: bids, error } = await query

    if (error) {
      console.error('Error fetching bids:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: bids || []
    })

  } catch (error) {
    console.error('Error in bids API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch bids'
    }, { status: 500 })
  }
}

// POST create a new bid
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const userRole = user.user_metadata?.role
    if (userRole !== 'investor') {
      return NextResponse.json({
        success: false,
        message: 'Only investors can place bids'
      }, { status: 403 })
    }

    const { propertyId, bidAmount, bidType, financingAmount, bidMessage } = await request.json()
    
    if (!propertyId || !bidAmount) {
      return NextResponse.json({
        success: false,
        message: 'Property ID and bid amount are required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get investor profile
    const { data: investorProfile, error: profileError } = await supabase
      .from('investor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !investorProfile) {
      return NextResponse.json({
        success: false,
        message: 'Investor profile not found'
      }, { status: 404 })
    }

    // Check if property exists and is active
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, status')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({
        success: false,
        message: 'Property not found'
      }, { status: 404 })
    }

    if (property.status !== 'active') {
      return NextResponse.json({
        success: false,
        message: 'Property is not accepting bids'
      }, { status: 400 })
    }

    // Check for existing active bid
    const { data: existingBid } = await supabase
      .from('property_bids')
      .select('id')
      .eq('property_id', propertyId)
      .eq('investor_id', investorProfile.id)
      .in('bid_status', ['pending', 'countered'])
      .single()

    if (existingBid) {
      return NextResponse.json({
        success: false,
        message: 'You already have an active bid on this property'
      }, { status: 400 })
    }

    // Create bid
    const { data: newBid, error: bidError } = await supabase
      .from('property_bids')
      .insert({
        property_id: propertyId,
        investor_id: investorProfile.id,
        bid_amount: bidAmount,
        bid_type: bidType || 'cash',
        financing_amount: financingAmount || null,
        bid_message: bidMessage || null,
        bid_status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (bidError) {
      console.error('Error creating bid:', bidError)
      throw bidError
    }

    // Create bid history entry
    await supabase
      .from('bid_history')
      .insert({
        bid_id: newBid.id,
        action: 'created',
        new_amount: bidAmount,
        notes: `Initial bid placed`,
        performed_by: user.id
      })

    return NextResponse.json({
      success: true,
      data: newBid
    })

  } catch (error) {
    console.error('Error in create bid API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create bid'
    }, { status: 500 })
  }
}

// PATCH update a bid (withdraw, modify)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthErrorResponse('Authentication required')
    }

    const { bidId, action, newAmount, message, counterAmount, counterMessage } = await request.json()
    
    if (!bidId || !action) {
      return NextResponse.json({
        success: false,
        message: 'Bid ID and action are required'
      }, { status: 400 })
    }

    const supabase = await createClient()
    const userRole = user.user_metadata?.role

    // Get the bid
    const { data: bid, error: bidError } = await supabase
      .from('property_bids')
      .select(`
        *,
        property:properties(seller_id)
      `)
      .eq('id', bidId)
      .single()

    if (bidError || !bid) {
      return NextResponse.json({
        success: false,
        message: 'Bid not found'
      }, { status: 404 })
    }

    // Check permissions
    let canUpdate = false
    let updateData: any = {}
    let historyNote = ''

    // Handle different actions
    switch (action) {
      case 'withdraw':
        // Only investor can withdraw their bid
        if (userRole === 'investor') {
          const { data: investorProfile } = await supabase
            .from('investor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
          
          if (investorProfile?.id === bid.investor_id) {
            canUpdate = true
            updateData = { 
              bid_status: 'withdrawn',
              withdrawn_at: new Date().toISOString()
            }
            historyNote = 'Bid withdrawn by investor'
          }
        }
        break

      case 'accept':
        // Only seller can accept bid
        if (userRole === 'seller') {
          const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
          
          if (sellerProfile?.id === bid.property.seller_id) {
            canUpdate = true
            updateData = { 
              bid_status: 'accepted',
              accepted_at: new Date().toISOString()
            }
            historyNote = 'Bid accepted by seller'
          }
        }
        break

      case 'reject':
        // Only seller can reject bid
        if (userRole === 'seller') {
          const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
          
          if (sellerProfile?.id === bid.property.seller_id) {
            canUpdate = true
            updateData = { 
              bid_status: 'rejected',
              rejected_at: new Date().toISOString()
            }
            historyNote = `Bid rejected by seller${message ? ': ' + message : ''}`
          }
        }
        break

      case 'counter':
        // Only seller can counter bid
        if (userRole === 'seller') {
          const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
          
          if (sellerProfile?.id === bid.property.seller_id && counterAmount) {
            canUpdate = true
            updateData = { 
              bid_status: 'countered',
              counter_offer_amount: counterAmount,
              counter_offer_message: counterMessage || null
            }
            historyNote = `Counter offer: $${counterAmount}`
          }
        }
        break

      case 'modify':
        // Only investor can modify their bid
        if (userRole === 'investor' && newAmount) {
          const { data: investorProfile } = await supabase
            .from('investor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
          
          if (investorProfile?.id === bid.investor_id) {
            canUpdate = true
            updateData = { 
              bid_amount: newAmount,
              bid_message: message || bid.bid_message
            }
            historyNote = `Bid modified from $${bid.bid_amount} to $${newAmount}`
          }
        }
        break
    }

    if (!canUpdate) {
      return NextResponse.json({
        success: false,
        message: 'You do not have permission to perform this action'
      }, { status: 403 })
    }

    // Update bid
    const { data: updatedBid, error: updateError } = await supabase
      .from('property_bids')
      .update(updateData)
      .eq('id', bidId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating bid:', updateError)
      throw updateError
    }

    // Create history entry
    await supabase
      .from('bid_history')
      .insert({
        bid_id: bidId,
        action: action,
        previous_amount: bid.bid_amount,
        new_amount: newAmount || counterAmount || bid.bid_amount,
        notes: historyNote,
        performed_by: user.id
      })

    return NextResponse.json({
      success: true,
      data: updatedBid
    })

  } catch (error) {
    console.error('Error in update bid API:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to update bid'
    }, { status: 500 })
  }
}