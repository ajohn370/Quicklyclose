/**
 * Seller Authentication & Access Control System
 * Manages seller-specific authentication, property access, and secure communication
 */

import { createClient } from '@supabase/supabase-js'
import { DataGovernanceManager } from './data-governance'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SellerSession {
  seller_id: string
  email: string
  name: string
  phone?: string
  properties: Array<{
    id: string
    address: string
    current_state: string
    has_pending_pricing: boolean
  }>
  access_token: string
  expires_at: string
}

export interface SellerAccess {
  can_view_property: boolean
  can_approve_pricing: boolean
  can_provide_feedback: boolean
  can_view_analytics: boolean
  restrictions: string[]
}

export interface SecureLink {
  id: string
  seller_id: string
  property_id?: string
  link_type: 'property_access' | 'pricing_approval' | 'document_review'
  token: string
  expires_at: string
  used_at?: string
  metadata: Record<string, any>
}

export class SellerAuthManager {
  
  /**
   * Generate secure access link for seller
   */
  static async generateSecureLink(
    sellerEmail: string,
    linkType: SecureLink['link_type'],
    propertyId?: string,
    expirationHours: number = 72
  ): Promise<{ success: boolean; link?: string; token?: string; error?: string }> {
    try {
      // Verify seller exists
      const { data: seller, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('id, email, name')
        .eq('email', sellerEmail)
        .single()

      if (sellerError || !seller) {
        return { success: false, error: 'Seller not found' }
      }

      // Verify property ownership if property-specific link
      if (propertyId) {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('id, seller_id')
          .eq('id', propertyId)
          .eq('seller_id', seller.id)
          .single()

        if (propertyError || !property) {
          return { success: false, error: 'Property not found or access denied' }
        }
      }

      // Generate secure token
      const token = this.generateSecureToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expirationHours)

      // Store secure link in database
      const { data: linkRecord, error: linkError } = await supabase
        .from('seller_secure_links')
        .insert({
          seller_id: seller.id,
          property_id: propertyId,
          link_type: linkType,
          token,
          expires_at: expiresAt.toISOString(),
          metadata: {
            generated_for: sellerEmail,
            user_agent: 'system',
            ip_address: null
          }
        })
        .select()
        .single()

      if (linkError) {
        return { success: false, error: 'Failed to generate secure link' }
      }

      // Create secure URL
      const baseUrl = process.env.NEXTAUTH_URL || 'https://quicklyclose.com'
      const secureLink = `${baseUrl}/seller/access?token=${token}&type=${linkType}`

      // Log link generation
      await DataGovernanceManager.logPIIAccess({
        userId: seller.id,
        action: 'secure_link_generated',
        tableName: 'seller_secure_links',
        recordId: linkRecord.id,
        piiFields: ['email'],
        purpose: `Generated ${linkType} access link`,
        automated: true
      })

      return {
        success: true,
        link: secureLink,
        token
      }
    } catch (error) {
      console.error('Error generating secure link:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Validate secure access token and create seller session
   */
  static async validateSecureToken(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; session?: SellerSession; error?: string }> {
    try {
      // Find and validate token
      const { data: linkRecord, error: linkError } = await supabase
        .from('seller_secure_links')
        .select(`
          id,
          seller_id,
          property_id,
          link_type,
          expires_at,
          used_at,
          metadata,
          seller_profiles!inner (
            id,
            email,
            name,
            phone
          )
        `)
        .eq('token', token)
        .single()

      if (linkError || !linkRecord) {
        return { success: false, error: 'Invalid or expired access token' }
      }

      // Check if token is expired
      if (new Date() > new Date(linkRecord.expires_at)) {
        return { success: false, error: 'Access token has expired' }
      }

      // Check if token was already used (for single-use tokens)
      if (linkRecord.used_at && linkRecord.link_type === 'pricing_approval') {
        return { success: false, error: 'Access token has already been used' }
      }

      // Get seller's properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          current_state,
          pricing_revisions!left (
            id,
            approval_status
          )
        `)
        .eq('seller_id', linkRecord.seller_id)

      if (propertiesError) {
        console.error('Error fetching seller properties:', propertiesError)
      }

      // Process properties with pricing status
      const processedProperties = (properties || []).map(property => ({
        id: property.id,
        address: property.address,
        current_state: property.current_state,
        has_pending_pricing: property.pricing_revisions?.some(
          revision => revision.approval_status === 'pending'
        ) || false
      }))

      // Generate JWT session token
      const sellerProfile = Array.isArray(linkRecord.seller_profiles) 
        ? linkRecord.seller_profiles[0] 
        : linkRecord.seller_profiles;
      
      const sessionToken = jwt.sign(
        {
          seller_id: linkRecord.seller_id,
          email: sellerProfile.email,
          link_type: linkRecord.link_type,
          property_id: linkRecord.property_id
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      )

      // Mark token as used if it's a single-use token
      if (linkRecord.link_type === 'pricing_approval') {
        await supabase
          .from('seller_secure_links')
          .update({
            used_at: new Date().toISOString(),
            metadata: {
              ...linkRecord.metadata,
              used_ip: ipAddress,
              used_user_agent: userAgent
            }
          })
          .eq('id', linkRecord.id)
      }

      // Log access
      await DataGovernanceManager.logPIIAccess({
        userId: linkRecord.seller_id,
        action: 'secure_access_granted',
        tableName: 'seller_secure_links',
        recordId: linkRecord.id,
        piiFields: ['email'],
        purpose: `Seller accessed ${linkRecord.link_type}`,
        automated: false
      })

      const session: SellerSession = {
        seller_id: linkRecord.seller_id,
        email: sellerProfile.email,
        name: sellerProfile.name,
        phone: sellerProfile.phone,
        properties: processedProperties,
        access_token: sessionToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }

      return { success: true, session }
    } catch (error) {
      console.error('Error validating secure token:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token validation failed' 
      }
    }
  }

  /**
   * Validate seller session JWT
   */
  static async validateSellerSession(
    sessionToken: string
  ): Promise<{ success: boolean; sellerId?: string; error?: string }> {
    try {
      const decoded = jwt.verify(
        sessionToken,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as any

      if (!decoded.seller_id) {
        return { success: false, error: 'Invalid session token' }
      }

      // Verify seller still exists and is active
      const { data: seller, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('id, is_active')
        .eq('id', decoded.seller_id)
        .single()

      if (sellerError || !seller || !seller.is_active) {
        return { success: false, error: 'Seller account not found or inactive' }
      }

      return { success: true, sellerId: decoded.seller_id }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { success: false, error: 'Session has expired' }
      }
      return { success: false, error: 'Invalid session token' }
    }
  }

  /**
   * Check seller access permissions for specific actions
   */
  static async checkSellerAccess(
    sellerId: string,
    propertyId: string,
    action: 'view' | 'approve_pricing' | 'provide_feedback' | 'view_analytics'
  ): Promise<SellerAccess> {
    try {
      // Verify property ownership
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, seller_id, current_state')
        .eq('id', propertyId)
        .eq('seller_id', sellerId)
        .single()

      if (propertyError || !property) {
        return {
          can_view_property: false,
          can_approve_pricing: false,
          can_provide_feedback: false,
          can_view_analytics: false,
          restrictions: ['Property not found or access denied']
        }
      }

      const restrictions: string[] = []
      let canViewProperty = true
      let canApprovePricing = false
      let canProvideFeedback = false
      let canViewAnalytics = false

      // Determine permissions based on property state
      switch (property.current_state) {
        case 'seller_review':
        case 'seller_approved':
        case 'seller_rejected':
          canApprovePricing = true
          canProvideFeedback = true
          canViewAnalytics = true
          break

        case 'pricing_approved':
        case 'bidding_preparation':
        case 'bidding_active':
          canViewAnalytics = true
          canProvideFeedback = true
          break

        case 'completed':
        case 'cancelled':
          canViewAnalytics = true
          restrictions.push('Property transaction is complete')
          break

        default:
          restrictions.push('Property is still under internal review')
      }

      return {
        can_view_property: canViewProperty,
        can_approve_pricing: canApprovePricing,
        can_provide_feedback: canProvideFeedback,
        can_view_analytics: canViewAnalytics,
        restrictions
      }
    } catch (error) {
      console.error('Error checking seller access:', error)
      return {
        can_view_property: false,
        can_approve_pricing: false,
        can_provide_feedback: false,
        can_view_analytics: false,
        restrictions: ['Error validating access permissions']
      }
    }
  }

  /**
   * Send secure access notification to seller
   */
  static async sendAccessNotification(
    sellerEmail: string,
    notificationType: 'pricing_ready' | 'feedback_requested' | 'status_update',
    propertyAddress: string,
    secureLink: string,
    additionalData?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create notification record
      const { error: notificationError } = await supabase
        .from('seller_notifications')
        .insert({
          seller_email: sellerEmail,
          notification_type: notificationType,
          subject: this.getNotificationSubject(notificationType, propertyAddress),
          content: this.getNotificationContent(
            notificationType,
            propertyAddress,
            secureLink,
            additionalData
          ),
          secure_link: secureLink,
          delivery_status: 'pending',
          metadata: additionalData
        })

      if (notificationError) {
        return { success: false, error: notificationError.message }
      }

      // Queue email delivery job (would integrate with email service)
      // await JobQueueManager.addJob('notifications', 'seller_email', {
      //   email: sellerEmail,
      //   type: notificationType,
      //   link: secureLink,
      //   ...additionalData
      // })

      return { success: true }
    } catch (error) {
      console.error('Error sending access notification:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Notification failed' 
      }
    }
  }

  /**
   * Revoke seller access (expire all tokens)
   */
  static async revokeSellerAccess(
    sellerId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Expire all active tokens for seller
      const { error: revokeError } = await supabase
        .from('seller_secure_links')
        .update({
          expires_at: new Date().toISOString(),
          metadata: {
            revoked: true,
            revoked_at: new Date().toISOString(),
            revoked_reason: reason
          }
        })
        .eq('seller_id', sellerId)
        .is('used_at', null)

      if (revokeError) {
        return { success: false, error: revokeError.message }
      }

      // Log the revocation
      await DataGovernanceManager.logPIIAccess({
        userId: sellerId,
        action: 'access_revoked',
        tableName: 'seller_secure_links',
        recordId: sellerId,
        piiFields: ['access_tokens'],
        purpose: `Access revoked: ${reason}`,
        automated: false
      })

      return { success: true }
    } catch (error) {
      console.error('Error revoking seller access:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Access revocation failed' 
      }
    }
  }

  /**
   * Private helper methods
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private static getNotificationSubject(
    type: string,
    propertyAddress: string
  ): string {
    switch (type) {
      case 'pricing_ready':
        return `Pricing Ready for Review - ${propertyAddress}`
      case 'feedback_requested':
        return `Your Feedback Requested - ${propertyAddress}`
      case 'status_update':
        return `Status Update - ${propertyAddress}`
      default:
        return `Update on Your Property - ${propertyAddress}`
    }
  }

  private static getNotificationContent(
    type: string,
    propertyAddress: string,
    secureLink: string,
    additionalData?: Record<string, any>
  ): string {
    const baseContent = `Dear Property Owner,\n\nWe have an update regarding your property at ${propertyAddress}.\n\n`
    
    let specificContent = ''
    switch (type) {
      case 'pricing_ready':
        specificContent = `Our analysis is complete and we're ready to present our offer. Please review the pricing details and let us know your decision.\n\nOffer Amount: ${additionalData?.offer_amount ? '$' + additionalData.offer_amount.toLocaleString() : 'Available in portal'}\n\n`
        break
      case 'feedback_requested':
        specificContent = `We'd appreciate your feedback on our recent analysis. Your input helps us provide the best possible service.\n\n`
        break
      case 'status_update':
        specificContent = `Your property status has been updated. Please check your portal for the latest information.\n\n`
        break
    }

    return baseContent + specificContent + 
      `Click the secure link below to access your property portal:\n${secureLink}\n\n` +
      `This link is secure and will expire in 72 hours for your protection.\n\n` +
      `If you have any questions, please don't hesitate to contact us.\n\n` +
      `Best regards,\nQuicklyClose Team`
  }
}