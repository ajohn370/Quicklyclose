// Admin-specific TypeScript interfaces

export type AdminRole = 'super_admin' | 'admin' | 'analyst' | 'support'
export type MessageType = 'chat' | 'pricing_update' | 'analysis_update' | 'system_notification'
export type CommunicationMethod = 'in_app' | 'email' | 'both'
export type PricingRevisionType = 'admin_suggestion' | 'admin_final' | 'ai_automated'
export type RevisionStatus = 'pending' | 'approved' | 'rejected' | 'auto_applied'
export type NoteType = 'general' | 'pricing' | 'follow_up' | 'issue' | 'opportunity'
export type CommunicationType = 'initial_contact' | 'follow_up' | 'pricing_discussion' | 'analysis_review'
export type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'responded'

export interface AdminProfile {
  id: string
  user_id: string
  full_name: string
  role: AdminRole
  permissions: Record<string, any>
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthenticatedAdmin {
  user: any
  adminProfile: AdminProfile
}

export interface AdminMessage {
  id: string
  admin_id: string
  seller_id: string
  message: string
  message_type: MessageType
  communication_method: CommunicationMethod
  email_sent_at: string | null
  read_at: string | null
  reply_to_message_id: string | null
  created_at: string
  admin?: AdminProfile
  seller?: any
}

export interface PricingRevision {
  id: string
  seller_id: string
  admin_id: string
  property_analysis_id: string | null
  revision_type: PricingRevisionType
  original_price: number
  suggested_price: number
  final_price: number | null
  revision_notes: string | null
  ai_confidence_score: number | null
  market_data: Record<string, any>
  status: RevisionStatus
  seller_response: string | null
  approved_at: string | null
  expires_at: string | null
  created_at: string
  seller?: any
  admin?: AdminProfile
  analysis?: any
}

export interface AdminNote {
  id: string
  seller_id: string
  admin_id: string
  note_content: string
  note_type: NoteType
  is_private: boolean
  tags: string[]
  created_at: string
  admin?: AdminProfile
  seller?: any
}

export interface SellerCommunication {
  id: string
  seller_id: string
  admin_id: string
  communication_type: CommunicationType
  content: string
  response_time_hours: number | null
  status: CommunicationStatus
  metadata: Record<string, any>
  created_at: string
}

export interface AdminActivityLog {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, any>
  ip_address: string | null
  created_at: string
  admin?: AdminProfile
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_template: string
  template_variables: string[]
  template_type: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface PricingAutomationRule {
  id: string
  rule_name: string
  conditions: Record<string, any>
  pricing_adjustment: Record<string, any>
  is_active: boolean
  created_by: string
  created_at: string
}

export interface SellerSummary {
  seller_id: string
  seller_name: string
  email: string
  properties_count: number
  analyses_count: number
  last_activity: string
  status: 'no_analysis' | 'pending_pricing' | 'active'
}

export interface SellerMetrics {
  total_properties: number
  total_analyses: number
  avg_property_value: number
  pending_pricing_revisions: number
  last_contact: number | null
  response_rate: number
  total_communications: number
}

export interface SellerDetail {
  seller: any
  metrics: SellerMetrics
  properties?: any[]
  analyses?: any[]
  pricing_revisions?: PricingRevision[]
  admin_notes?: AdminNote[]
  admin_messages?: AdminMessage[]
  seller_communications?: SellerCommunication[]
}

// API Response Types
export interface AdminAPIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Dashboard Statistics Types
export interface AdminDashboardStats {
  total_sellers: number
  active_sellers: number
  pending_analyses: number
  pending_pricing: number
  messages_today: number
  avg_response_time: number
  recent_activities: AdminActivityLog[]
}

// Pricing Analysis Types
export interface PricingAnalysis {
  current_market_value: number
  confidence_score: number
  price_recommendation: number
  market_trends: {
    direction: 'up' | 'down' | 'stable'
    percentage: number
    timeframe: string
  }
  comparable_properties: any[]
  risk_factors: string[]
  opportunities: string[]
}

// Communication Templates
export interface MessageTemplate {
  id: string
  name: string
  subject: string
  message_template: string
  variables: string[]
  category: 'welcome' | 'pricing' | 'analysis' | 'follow_up' | 'general'
  is_active: boolean
}

// Bulk Operations
export interface BulkOperation {
  operation: 'send_message' | 'update_pricing' | 'add_note' | 'mark_status'
  seller_ids: string[]
  data: Record<string, any>
}

export interface BulkOperationResult {
  successful: number
  failed: number
  errors: Array<{
    seller_id: string
    error: string
  }>
}

// Admin Permissions
export interface AdminPermissions {
  can_view_sellers: boolean
  can_edit_sellers: boolean
  can_delete_sellers: boolean
  can_send_messages: boolean
  can_create_pricing_revisions: boolean
  can_approve_pricing: boolean
  can_set_final_pricing: boolean
  can_view_private_notes: boolean
  can_manage_admins: boolean
  can_view_activity_logs: boolean
  can_manage_automation_rules: boolean
  can_export_data: boolean
}

// Filter and Search Types
export interface SellerFilters {
  search?: string
  status?: 'no_analysis' | 'pending_pricing' | 'active' | 'all'
  date_range?: {
    start: string
    end: string
  }
  property_type?: string
  location?: string
  value_range?: {
    min: number
    max: number
  }
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}
