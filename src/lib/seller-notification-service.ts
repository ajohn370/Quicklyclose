/**
 * Seller Notification Service
 * Manages communication workflow and notification delivery for seller portal
 */

import { createClient } from '@supabase/supabase-js'
import { SellerAuthManager } from './seller-auth'
import { DataGovernanceManager } from './data-governance'
import { ConfigurationManager } from './configuration-manager'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface NotificationTemplate {
  subject: string
  content_text: string
  content_html: string
  priority: number
  delivery_channels: ('email' | 'sms' | 'push')[]
}

export interface NotificationContext {
  seller_name: string
  property_address: string
  offer_amount?: number
  secure_link: string
  expires_at: string
  custom_data?: Record<string, any>
}

export interface DeliveryResult {
  success: boolean
  message_id?: string
  provider_response?: any
  error?: string
  delivery_time?: number
}

export type NotificationType = 
  | 'pricing_ready' 
  | 'feedback_requested' 
  | 'status_update'
  | 'document_available'
  | 'bidding_started'
  | 'offer_accepted'
  | 'contract_ready'

export class SellerNotificationService {

  /**
   * Send notification to seller with secure access link
   */
  static async sendNotification(
    sellerId: string,
    propertyId: string,
    notificationType: NotificationType,
    context: Partial<NotificationContext> = {},
    options: {
      priority?: number
      scheduled_for?: Date
      delivery_channels?: ('email' | 'sms')[]
    } = {}
  ): Promise<{ success: boolean; notification_id?: string; error?: string }> {
    try {
      // Get seller information
      const { data: seller, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('id, email, name, phone, communication_preferences')
        .eq('id', sellerId)
        .single()

      if (sellerError || !seller) {
        return { success: false, error: 'Seller not found' }
      }

      // Get property information  
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, address, listing_price, estimated_value')
        .eq('id', propertyId)
        .single()

      if (propertyError || !property) {
        return { success: false, error: 'Property not found' }
      }

      // Generate secure access link
      const linkResult = await SellerAuthManager.generateSecureLink(
        seller.email,
        notificationType === 'pricing_ready' ? 'pricing_approval' : 'property_access',
        propertyId,
        72 // 72 hours expiration
      )

      if (!linkResult.success || !linkResult.link) {
        return { success: false, error: 'Failed to generate secure access link' }
      }

      // Build notification context
      const fullContext: NotificationContext = {
        seller_name: seller.name,
        property_address: property.address,
        secure_link: linkResult.link,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        ...context
      }

      // Get notification template
      const template = this.getNotificationTemplate(notificationType, fullContext)

      // Determine delivery channels
      const deliveryChannels = options.delivery_channels || 
        this.getPreferredChannels(seller.communication_preferences, notificationType)

      // Create notification record
      const { data: notification, error: notificationError } = await supabase
        .from('seller_notifications')
        .insert({
          seller_id: sellerId,
          property_id: propertyId,
          notification_type: notificationType,
          subject: template.subject,
          content: template.content_text,
          html_content: template.content_html,
          seller_email: seller.email,
          secure_link: linkResult.link,
          priority: options.priority || template.priority,
          scheduled_for: options.scheduled_for?.toISOString(),
          metadata: {
            context: fullContext,
            delivery_channels: deliveryChannels,
            template_version: '1.0'
          }
        })
        .select()
        .single()

      if (notificationError || !notification) {
        return { success: false, error: 'Failed to create notification record' }
      }

      // Queue delivery for each channel
      const deliveryPromises = deliveryChannels.map(channel => 
        this.queueDelivery(notification.id, channel, seller, template, fullContext)
      )

      const deliveryResults = await Promise.allSettled(deliveryPromises)
      
      // Check if at least one delivery succeeded
      const hasSuccessfulDelivery = deliveryResults.some(
        result => result.status === 'fulfilled' && result.value.success
      )

      if (!hasSuccessfulDelivery) {
        await this.updateNotificationStatus(notification.id, 'failed', {
          error: 'All delivery channels failed',
          delivery_results: deliveryResults
        })
        return { success: false, error: 'Notification delivery failed' }
      }

      // Log notification sent
      await DataGovernanceManager.logActivity({
        userId: sellerId,
        action: 'notification_sent',
        tableName: 'seller_notifications',
        recordId: notification.id,
        details: JSON.stringify({
          type: notificationType as string,
          property_id: propertyId,
          delivery_channels: deliveryChannels
        })
      })

      return {
        success: true,
        notification_id: notification.id
      }

    } catch (error) {
      console.error('Error sending seller notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Queue notification delivery for specific channel
   */
  private static async queueDelivery(
    notificationId: string,
    channel: 'email' | 'sms',
    seller: any,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<DeliveryResult> {
    try {
      switch (channel) {
        case 'email':
          return await this.deliverEmail(notificationId, seller.email, template, context)
        case 'sms':
          if (!seller.phone) {
            return { success: false, error: 'No phone number available' }
          }
          return await this.deliverSMS(notificationId, seller.phone, template, context)
        default:
          return { success: false, error: `Unsupported delivery channel: ${channel}` }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delivery failed'
      }
    }
  }

  /**
   * Deliver notification via email
   */
  private static async deliverEmail(
    notificationId: string,
    email: string,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<DeliveryResult> {
    const startTime = Date.now()

    try {
      // Check if email service is enabled
      const emailEnabled = await ConfigurationManager.getConfig('notifications.email.enabled', true)
      if (!emailEnabled) {
        return { success: false, error: 'Email delivery is disabled' }
      }

      // Mock email delivery - In production, integrate with SendGrid, AWS SES, etc.
      const emailResult = await this.mockEmailDelivery({
        to: email,
        subject: template.subject,
        text: template.content_text,
        html: template.content_html
      })

      const deliveryTime = Date.now() - startTime

      if (emailResult.success) {
        // Update notification status
        await this.updateNotificationStatus(notificationId, 'sent', {
          provider: 'mock_email',
          message_id: emailResult.message_id,
          delivery_time: deliveryTime
        })

        return {
          success: true,
          message_id: emailResult.message_id,
          provider_response: emailResult,
          delivery_time: deliveryTime
        }
      } else {
        await this.updateNotificationStatus(notificationId, 'failed', {
          error: emailResult.error,
          delivery_time: deliveryTime
        })

        return {
          success: false,
          error: emailResult.error,
          delivery_time: deliveryTime
        }
      }

    } catch (error) {
      const deliveryTime = Date.now() - startTime
      
      await this.updateNotificationStatus(notificationId, 'failed', {
        error: error instanceof Error ? error.message : 'Email delivery failed',
        delivery_time: deliveryTime
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email delivery failed',
        delivery_time: deliveryTime
      }
    }
  }

  /**
   * Deliver notification via SMS
   */
  private static async deliverSMS(
    notificationId: string,
    phone: string,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<DeliveryResult> {
    const startTime = Date.now()

    try {
      // Check if SMS service is enabled
      const smsEnabled = await ConfigurationManager.getConfig('notifications.sms.enabled', false)
      if (!smsEnabled) {
        return { success: false, error: 'SMS delivery is disabled' }
      }

      // Create SMS-optimized content
      const smsContent = this.createSMSContent(template, context)

      // Mock SMS delivery - In production, integrate with Twilio, AWS SNS, etc.
      const smsResult = await this.mockSMSDelivery({
        to: phone,
        message: smsContent
      })

      const deliveryTime = Date.now() - startTime

      if (smsResult.success) {
        await this.updateNotificationStatus(notificationId, 'sent', {
          provider: 'mock_sms',
          message_id: smsResult.message_id,
          delivery_time: deliveryTime
        })

        return {
          success: true,
          message_id: smsResult.message_id,
          provider_response: smsResult,
          delivery_time: deliveryTime
        }
      } else {
        await this.updateNotificationStatus(notificationId, 'failed', {
          error: smsResult.error,
          delivery_time: deliveryTime
        })

        return {
          success: false,
          error: smsResult.error,
          delivery_time: deliveryTime
        }
      }

    } catch (error) {
      const deliveryTime = Date.now() - startTime
      
      await this.updateNotificationStatus(notificationId, 'failed', {
        error: error instanceof Error ? error.message : 'SMS delivery failed',
        delivery_time: deliveryTime
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS delivery failed',
        delivery_time: deliveryTime
      }
    }
  }

  /**
   * Update notification delivery status
   */
  private static async updateNotificationStatus(
    notificationId: string,
    status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const updates: any = {
        delivery_status: status,
        last_delivery_attempt: new Date().toISOString(),
        provider_response: metadata
      }

      if (status === 'sent' || status === 'delivered') {
        updates.delivered_at = new Date().toISOString()
      }

      await supabase
        .from('seller_notifications')
        .update(updates)
        .eq('id', notificationId)

    } catch (error) {
      console.error('Error updating notification status:', error)
    }
  }

  /**
   * Get notification template for specific type
   */
  private static getNotificationTemplate(
    type: NotificationType,
    context: NotificationContext
  ): NotificationTemplate {
    switch (type) {
      case 'pricing_ready':
        return {
          subject: `Pricing Ready for Review - ${context.property_address}`,
          content_text: this.buildTextContent('pricing_ready', context),
          content_html: this.buildHTMLContent('pricing_ready', context),
          priority: 2, // High priority
          delivery_channels: ['email', 'sms']
        }

      case 'feedback_requested':
        return {
          subject: `Your Feedback Requested - ${context.property_address}`,
          content_text: this.buildTextContent('feedback_requested', context),
          content_html: this.buildHTMLContent('feedback_requested', context),
          priority: 3, // Medium priority
          delivery_channels: ['email']
        }

      case 'status_update':
        return {
          subject: `Status Update - ${context.property_address}`,
          content_text: this.buildTextContent('status_update', context),
          content_html: this.buildHTMLContent('status_update', context),
          priority: 3,
          delivery_channels: ['email']
        }

      case 'offer_accepted':
        return {
          subject: `Offer Accepted - Next Steps for ${context.property_address}`,
          content_text: this.buildTextContent('offer_accepted', context),
          content_html: this.buildHTMLContent('offer_accepted', context),
          priority: 1, // Urgent
          delivery_channels: ['email', 'sms']
        }

      default:
        return {
          subject: `Update on Your Property - ${context.property_address}`,
          content_text: this.buildTextContent('generic', context),
          content_html: this.buildHTMLContent('generic', context),
          priority: 3,
          delivery_channels: ['email']
        }
    }
  }

  /**
   * Build text content for notifications
   */
  private static buildTextContent(type: string, context: NotificationContext): string {
    const baseContent = `Dear ${context.seller_name},\n\nWe have an update regarding your property at ${context.property_address}.\n\n`
    
    let specificContent = ''
    switch (type) {
      case 'pricing_ready':
        specificContent = `Great news! Our analysis is complete and we're ready to present our cash offer.\n\n` +
          `${context.offer_amount ? `Our Offer: $${context.offer_amount.toLocaleString()}\n\n` : ''}` +
          `Please review the pricing details and let us know your decision by clicking the secure link below.\n\n`
        break
        
      case 'feedback_requested':
        specificContent = `We'd appreciate your feedback on our recent analysis. Your input helps us provide the best possible service.\n\n`
        break
        
      case 'offer_accepted':
        specificContent = `Congratulations! We're moving forward with your property sale. We'll be in touch with next steps shortly.\n\n`
        break
        
      default:
        specificContent = `Your property status has been updated. Please check your portal for the latest information.\n\n`
    }

    return baseContent + specificContent +
      `Access your secure portal: ${context.secure_link}\n\n` +
      `This link is secure and will expire on ${new Date(context.expires_at).toLocaleDateString()} for your protection.\n\n` +
      `If you have any questions, please don't hesitate to contact us.\n\n` +
      `Best regards,\nQuicklyClose Team`
  }

  /**
   * Build HTML content for email notifications
   */
  private static buildHTMLContent(type: string, context: NotificationContext): string {
    const baseHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #2563eb; margin: 0;">QuicklyClose</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hello ${context.seller_name},</h2>
          <p>We have an update regarding your property at <strong>${context.property_address}</strong>.</p>
    `

    let specificHTML = ''
    switch (type) {
      case 'pricing_ready':
        specificHTML = `
          <div style="background-color: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="color: #16a34a; margin: 0 0 10px 0;">✅ Pricing Ready for Review</h3>
            <p style="margin: 0;">Our analysis is complete and we're ready to present our cash offer.</p>
            ${context.offer_amount ? `<p style="font-size: 18px; font-weight: bold; color: #16a34a; margin: 10px 0;">Our Offer: $${context.offer_amount.toLocaleString()}</p>` : ''}
          </div>
          <p>Please review the pricing details and let us know your decision.</p>
        `
        break
        
      case 'offer_accepted':
        specificHTML = `
          <div style="background-color: #dbeafe; border: 1px solid #2563eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="color: #2563eb; margin: 0 0 10px 0;">🎉 Offer Accepted!</h3>
            <p style="margin: 0;">Congratulations! We're moving forward with your property sale.</p>
          </div>
          <p>We'll be in touch with next steps shortly.</p>
        `
        break
        
      default:
        specificHTML = `<p>Your property status has been updated. Please check your portal for the latest information.</p>`
    }

    return baseHTML + specificHTML + `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${context.secure_link}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Access Your Portal
            </a>
          </div>
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin: 20px 0; font-size: 14px;">
            <strong>Security Notice:</strong> This secure link will expire on ${new Date(context.expires_at).toLocaleDateString()} for your protection.
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>© 2024 QuicklyClose. All rights reserved.</p>
        </div>
      </div>
    `
  }

  /**
   * Create SMS-optimized content
   */
  private static createSMSContent(template: NotificationTemplate, context: NotificationContext): string {
    const shortLink = context.secure_link // In production, use URL shortener
    
    return `QuicklyClose: ${template.subject.replace(` - ${context.property_address}`, '')} for ${context.property_address}. ` +
           `Access secure portal: ${shortLink} (expires ${new Date(context.expires_at).toLocaleDateString()})`
  }

  /**
   * Get preferred delivery channels based on user preferences
   */
  private static getPreferredChannels(
    preferences: any,
    notificationType: NotificationType
  ): ('email' | 'sms')[] {
    // Default channels based on notification urgency
    const defaultChannels: ('email' | 'sms')[] = ['email']
    
    if (['pricing_ready', 'offer_accepted'].includes(notificationType)) {
      defaultChannels.push('sms')
    }

    // Return user preferences if available, otherwise use defaults
    return preferences?.notification_channels || defaultChannels
  }

  /**
   * Mock email delivery service
   */
  private static async mockEmailDelivery(emailData: {
    to: string
    subject: string
    text: string
    html: string
  }): Promise<{ success: boolean; message_id?: string; error?: string }> {
    // Simulate email delivery with random success/failure
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    const success = Math.random() > 0.05 // 95% success rate
    
    if (success) {
      return {
        success: true,
        message_id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    } else {
      return {
        success: false,
        error: 'Mock email delivery failure'
      }
    }
  }

  /**
   * Mock SMS delivery service
   */
  private static async mockSMSDelivery(smsData: {
    to: string
    message: string
  }): Promise<{ success: boolean; message_id?: string; error?: string }> {
    // Simulate SMS delivery
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
    
    const success = Math.random() > 0.10 // 90% success rate
    
    if (success) {
      return {
        success: true,
        message_id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    } else {
      return {
        success: false,
        error: 'Mock SMS delivery failure'
      }
    }
  }

  /**
   * Track notification engagement (opened, clicked)
   */
  static async trackEngagement(
    notificationId: string,
    eventType: 'opened' | 'clicked',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const updates: any = {
        [`${eventType}_at`]: new Date().toISOString(),
        delivery_status: eventType,
        provider_response: {
          ...(await this.getNotificationMetadata(notificationId)),
          engagement: {
            event: eventType,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        }
      }

      await supabase
        .from('seller_notifications')
        .update(updates)
        .eq('id', notificationId)

    } catch (error) {
      console.error('Error tracking notification engagement:', error)
    }
  }

  /**
   * Get notification metadata
   */
  private static async getNotificationMetadata(notificationId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('seller_notifications')
        .select('provider_response')
        .eq('id', notificationId)
        .single()

      return data?.provider_response || {}
    } catch (error) {
      return {}
    }
  }

  /**
   * Get delivery analytics for notifications
   */
  static async getDeliveryAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_sent: number
    delivered: number
    opened: number
    clicked: number
    failed: number
    delivery_rate: number
    engagement_rate: number
  }> {
    try {
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('delivery_status, opened_at, clicked_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error || !data) {
        return {
          total_sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0,
          delivery_rate: 0,
          engagement_rate: 0
        }
      }

      const total_sent = data.length
      const delivered = data.filter(n => ['delivered', 'opened', 'clicked'].includes(n.delivery_status)).length
      const opened = data.filter(n => n.opened_at).length
      const clicked = data.filter(n => n.clicked_at).length
      const failed = data.filter(n => n.delivery_status === 'failed').length

      return {
        total_sent,
        delivered,
        opened,
        clicked,
        failed,
        delivery_rate: total_sent > 0 ? (delivered / total_sent) * 100 : 0,
        engagement_rate: delivered > 0 ? (opened / delivered) * 100 : 0
      }

    } catch (error) {
      console.error('Error getting delivery analytics:', error)
      return {
        total_sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        delivery_rate: 0,
        engagement_rate: 0
      }
    }
  }
}