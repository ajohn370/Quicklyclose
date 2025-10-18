/**
 * Data Governance and Privacy Management System
 * Handles PII encryption, retention policies, GDPR compliance, and consent management
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'pii'

export type DataSubjectRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'

export type ConsentType = 'marketing' | 'analytics' | 'data_processing' | 'cookies'

export interface DataRetentionPolicy {
  id: string
  policy_name: string
  description: string
  data_type: string
  table_name: string
  classification: DataClassification
  retention_period_days: number
  auto_delete_enabled: boolean
  anonymization_enabled: boolean
  anonymization_fields: string[]
  legal_basis: string
  geographical_scope: string
  is_active: boolean
}

export interface DataSubjectRequest {
  id: string
  request_type: DataSubjectRequestType
  data_subject_email: string
  data_subject_name?: string
  verification_status: 'pending' | 'verified' | 'rejected'
  request_details?: string
  status: 'received' | 'processing' | 'completed' | 'rejected' | 'extended'
  response_due_date?: string
  completed_at?: string
  response_details?: string
  rejection_reason?: string
}

export interface ConsentRecord {
  id: string
  user_id?: string
  data_subject_email: string
  consent_type: ConsentType
  purpose: string
  given: boolean
  consent_method: string
  consent_evidence: Record<string, any>
  withdrawn_at?: string
  expires_at?: string
  legal_basis: string
}

export interface PIIAuditLog {
  id: string
  user_id?: string
  action: string
  table_name: string
  record_id: string
  pii_fields: string[]
  purpose?: string
  legal_basis?: string
  user_consent: boolean
  ip_address?: string
  user_agent?: string
  automated: boolean
  created_at: string
}

export class DataGovernanceManager {
  /**
   * Encrypt PII data using database function
   */
  static async encryptPII(data: string, keyId: string = 'default'): Promise<string> {
    try {
      const { data: result, error } = await supabase.rpc('encrypt_pii', {
        data,
        key_id: keyId
      })

      if (error) {
        console.error('PII encryption error:', error)
        return data // Return original data if encryption fails
      }

      return result || data
    } catch (error) {
      console.error('PII encryption failed:', error)
      return data
    }
  }

  /**
   * Decrypt PII data using database function
   */
  static async decryptPII(encryptedData: string, keyId: string = 'default'): Promise<string> {
    try {
      const { data: result, error } = await supabase.rpc('decrypt_pii', {
        encrypted_data: encryptedData,
        key_id: keyId
      })

      if (error) {
        console.error('PII decryption error:', error)
        return encryptedData // Return original data if decryption fails
      }

      return result || encryptedData
    } catch (error) {
      console.error('PII decryption failed:', error)
      return encryptedData
    }
  }

  /**
   * Log PII access for audit purposes
   */
  static async logPIIAccess(params: {
    userId: string
    action: string
    tableName: string
    recordId: string
    piiFields: string[]
    purpose?: string
    automated?: boolean
  }): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_pii_access', {
        p_user_id: params.userId,
        p_action: params.action,
        p_table_name: params.tableName,
        p_record_id: params.recordId,
        p_pii_fields: params.piiFields,
        p_purpose: params.purpose,
        p_automated: params.automated || false
      })

      if (error) {
        console.error('PII access logging error:', error)
      }
    } catch (error) {
      console.error('PII access logging failed:', error)
    }
  }

  /**
   * Get data retention policies
   */
  static async getRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('is_active', true)
      .order('data_type', { ascending: true })

    if (error) {
      console.error('Error fetching retention policies:', error)
      return []
    }

    return data || []
  }

  /**
   * Create or update retention policy
   */
  static async upsertRetentionPolicy(policy: Partial<DataRetentionPolicy>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .upsert(policy)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Execute data cleanup based on retention policies
   */
  static async executeDataCleanup(): Promise<{ anonymized: number; deleted: number; error?: string }> {
    try {
      // Run anonymization
      const { data: anonymizedCount, error: anonymizeError } = await supabase.rpc('anonymize_expired_data')
      
      if (anonymizeError) {
        return { anonymized: 0, deleted: 0, error: anonymizeError.message }
      }

      // Run deletion
      const { data: deletedCount, error: deleteError } = await supabase.rpc('delete_expired_data')
      
      if (deleteError) {
        return { anonymized: anonymizedCount || 0, deleted: 0, error: deleteError.message }
      }

      return { 
        anonymized: anonymizedCount || 0, 
        deleted: deletedCount || 0 
      }
    } catch (error) {
      return { 
        anonymized: 0, 
        deleted: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Create data subject request (GDPR)
   */
  static async createDataSubjectRequest(request: {
    requestType: DataSubjectRequestType
    dataSubjectEmail: string
    dataSubjectName?: string
    requestDetails?: string
  }): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Calculate response due date (30 days from request)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const { data, error } = await supabase
        .from('data_subject_requests')
        .insert({
          request_type: request.requestType,
          data_subject_email: request.dataSubjectEmail,
          data_subject_name: request.dataSubjectName,
          request_details: request.requestDetails,
          response_due_date: dueDate.toISOString(),
          status: 'received'
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, requestId: data.id }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Process data subject request
   */
  static async processDataSubjectRequest(
    requestId: string,
    action: 'verify' | 'reject' | 'complete' | 'extend',
    details?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let updateData: any = { updated_at: new Date().toISOString() }

      switch (action) {
        case 'verify':
          updateData.verification_status = 'verified'
          updateData.status = 'processing'
          break
        case 'reject':
          updateData.verification_status = 'rejected'
          updateData.status = 'rejected'
          updateData.rejection_reason = details
          break
        case 'complete':
          updateData.status = 'completed'
          updateData.completed_at = new Date().toISOString()
          updateData.response_details = details
          break
        case 'extend':
          // Extend by 60 days (GDPR allows 2-month extension in complex cases)
          const newDueDate = new Date()
          newDueDate.setDate(newDueDate.getDate() + 60)
          updateData.response_due_date = newDueDate.toISOString()
          updateData.status = 'extended'
          break
      }

      const { error } = await supabase
        .from('data_subject_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Export user data (GDPR portability)
   */
  static async exportUserData(email: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get user data from various tables
      const userData: any = {}

      // Get user profile
      const { data: user } = await supabase.auth.admin.listUsers()
      const userRecord = user?.users?.find((u: any) => u.email === email)
      
      if (userRecord) {
        userData.profile = {
          id: userRecord.id,
          email: userRecord.email,
          created_at: userRecord.created_at,
          user_metadata: userRecord.user_metadata
        }

        // Get seller profile if exists
        const { data: sellerProfile } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('user_id', userRecord.id)
          .single()

        if (sellerProfile) {
          userData.seller_profile = sellerProfile
        }

        // Get investor profile if exists
        const { data: investorProfile } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', userRecord.id)
          .single()

        if (investorProfile) {
          userData.investor_profile = investorProfile
        }

        // Get properties
        const { data: properties } = await supabase
          .from('properties')
          .select(`
            *,
            comp_vision_analyses(*),
            pricing_revisions(*)
          `)
          .eq('seller_profiles.user_id', userRecord.id)

        if (properties) {
          userData.properties = properties
        }

        // Get bids (for investors)
        const { data: bids } = await supabase
          .from('bids')
          .select(`
            *,
            bidding_windows(property_id, starting_price)
          `)
          .eq('investor_profiles.user_id', userRecord.id)

        if (bids) {
          userData.bids = bids
        }

        // Get consent records
        const { data: consents } = await supabase
          .from('consent_records')
          .select('*')
          .eq('user_id', userRecord.id)

        if (consents) {
          userData.consents = consents
        }
      }

      // Log the data export
      if (userRecord) {
        await this.logPIIAccess({
          userId: userRecord.id,
          action: 'export',
          tableName: 'user_data_export',
          recordId: userRecord.id,
          piiFields: ['all_user_data'],
          purpose: 'GDPR data portability request',
          automated: false
        })
      }

      return { success: true, data: userData }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Delete user data (GDPR erasure)
   */
  static async deleteUserData(email: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users?.find((u: any) => u.email === email)

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Log the deletion request
      await this.logPIIAccess({
        userId: user.id,
        action: 'delete',
        tableName: 'user_data_deletion',
        recordId: user.id,
        piiFields: ['all_user_data'],
        purpose: `GDPR erasure request: ${reason}`,
        automated: false
      })

      // Delete related data in correct order (foreign key constraints)
      
      // Delete bids
      const { data: investorProfiles } = await supabase
        .from('investor_profiles')
        .select('id')
        .eq('user_id', user.id)
      
      if (investorProfiles && investorProfiles.length > 0) {
        const investorIds = investorProfiles.map(p => p.id)
        await supabase
          .from('bids')
          .delete()
          .in('investor_id', investorIds)
      }

      // Delete pricing revisions for user's properties
      const { data: sellerProfiles } = await supabase
        .from('seller_profiles')
        .select('id')
        .eq('user_id', user.id)
      
      if (sellerProfiles && sellerProfiles.length > 0) {
        const sellerIds = sellerProfiles.map(p => p.id)
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .in('seller_id', sellerIds)
        
        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id)
          await supabase
            .from('pricing_revisions')
            .delete()
            .in('property_id', propertyIds)
        }
      }

      // Delete comp vision analyses for user's properties
      await supabase
        .from('comp_vision_analyses')
        .delete()
        .eq('user_id', user.id)

      // Delete properties
      if (sellerProfiles && sellerProfiles.length > 0) {
        const sellerIds = sellerProfiles.map(p => p.id)
        await supabase
          .from('properties')
          .delete()
          .in('seller_id', sellerIds)
      }

      // Delete profiles
      await supabase
        .from('seller_profiles')
        .delete()
        .eq('user_id', user.id)

      await supabase
        .from('investor_profiles')
        .delete()
        .eq('user_id', user.id)

      // Delete consent records
      await supabase
        .from('consent_records')
        .delete()
        .eq('user_id', user.id)

      // Delete user roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)

      // Finally delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Record consent
   */
  static async recordConsent(consent: {
    userId?: string
    dataSubjectEmail: string
    consentType: ConsentType
    purpose: string
    given: boolean
    consentMethod: string
    consentEvidence?: Record<string, any>
    legalBasis: string
    expiresAt?: string
  }): Promise<{ success: boolean; consentId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .insert({
          user_id: consent.userId,
          data_subject_email: consent.dataSubjectEmail,
          consent_type: consent.consentType,
          purpose: consent.purpose,
          given: consent.given,
          consent_method: consent.consentMethod,
          consent_evidence: consent.consentEvidence || {},
          legal_basis: consent.legalBasis,
          expires_at: consent.expiresAt
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, consentId: data.id }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(
    consentId: string,
    withdrawMethod: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('consent_records')
        .update({
          given: false,
          withdraw_method: withdrawMethod,
          withdrawn_at: new Date().toISOString(),
          metadata: { withdrawal_reason: reason }
        })
        .eq('id', consentId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get user's consent status
   */
  static async getUserConsents(email: string): Promise<ConsentRecord[]> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('data_subject_email', email)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user consents:', error)
      return []
    }

    return data || []
  }

  /**
   * Check if user has valid consent for specific purpose
   */
  static async hasValidConsent(
    email: string,
    consentType: ConsentType,
    purpose?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('consent_records')
        .select('*')
        .eq('data_subject_email', email)
        .eq('consent_type', consentType)
        .eq('given', true)
        .is('withdrawn_at', null)
        .or('expires_at.is.null,expires_at.gt.now()')

      if (purpose) {
        query = query.eq('purpose', purpose)
      }

      const { data, error } = await query.limit(1)

      if (error) {
        console.error('Error checking consent:', error)
        return false
      }

      return (data && data.length > 0) || false
    } catch (error) {
      console.error('Consent check failed:', error)
      return false
    }
  }

  /**
   * Get PII audit logs
   */
  static async getPIIAuditLogs(params: {
    userId?: string
    tableName?: string
    recordId?: string
    action?: string
    limit?: number
    offset?: number
  }): Promise<{ logs: PIIAuditLog[]; total: number }> {
    try {
      let query = supabase
        .from('pii_audit_log')
        .select('*', { count: 'exact' })

      if (params.userId) {
        query = query.eq('user_id', params.userId)
      }
      if (params.tableName) {
        query = query.eq('table_name', params.tableName)
      }
      if (params.recordId) {
        query = query.eq('record_id', params.recordId)
      }
      if (params.action) {
        query = query.eq('action', params.action)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching PII audit logs:', error)
        return { logs: [], total: 0 }
      }

      return { logs: data || [], total: count || 0 }
    } catch (error) {
      console.error('PII audit logs fetch failed:', error)
      return { logs: [], total: 0 }
    }
  }

  /**
   * Log general activity for audit and governance purposes
   */
  static async logActivity(params: {
    userId: string
    action: string
    tableName?: string
    recordId?: string
    details?: string
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('activity_log')
        .insert({
          user_id: params.userId,
          action: params.action,
          table_name: params.tableName,
          record_id: params.recordId,
          details: params.details,
          metadata: params.metadata || {},
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Activity logging error:', error)
      }
    } catch (error) {
      console.error('Activity logging failed:', error)
    }
  }
}

/**
 * Privacy utilities for frontend
 */
export class PrivacyUtils {
  /**
   * Mask sensitive data for display
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email
    
    const [local, domain] = email.split('@')
    const maskedLocal = local.length > 2 ? 
      local.substring(0, 2) + '*'.repeat(local.length - 2) : 
      local
    
    return `${maskedLocal}@${domain}`
  }

  /**
   * Mask phone number
   */
  static maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return phone
    
    return phone.substring(0, 3) + '*'.repeat(phone.length - 6) + phone.substring(phone.length - 3)
  }

  /**
   * Mask name (keep first name, mask last name)
   */
  static maskName(name: string): string {
    if (!name) return name
    
    const parts = name.split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 1) + '*'.repeat(Math.max(0, parts[0].length - 1))
    }
    
    return parts[0] + ' ' + parts.slice(1).map(part => 
      part.substring(0, 1) + '*'.repeat(Math.max(0, part.length - 1))
    ).join(' ')
  }

  /**
   * Check if data retention period has expired
   */
  static isRetentionExpired(createdAt: string, retentionDays: number): boolean {
    const created = new Date(createdAt)
    const expiry = new Date(created.getTime() + (retentionDays * 24 * 60 * 60 * 1000))
    return new Date() > expiry
  }

  /**
   * Calculate days until retention expiry
   */
  static daysUntilExpiry(createdAt: string, retentionDays: number): number {
    const created = new Date(createdAt)
    const expiry = new Date(created.getTime() + (retentionDays * 24 * 60 * 60 * 1000))
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
  }
}