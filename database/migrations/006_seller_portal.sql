-- Seller Portal and Interaction System
-- Phase 1.3: Build seller interaction portal for price approval

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Link types for secure seller access
CREATE TYPE seller_link_type AS ENUM (
  'property_access',
  'pricing_approval', 
  'document_review',
  'status_update',
  'feedback_request'
);

-- Notification types for seller communications
CREATE TYPE notification_type AS ENUM (
  'pricing_ready',
  'feedback_requested',
  'status_update',
  'document_available',
  'bidding_started',
  'offer_accepted',
  'contract_ready'
);

-- Delivery status for notifications
CREATE TYPE delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'failed'
);

-- Seller feedback types
CREATE TYPE feedback_type AS ENUM (
  'pricing_feedback',
  'service_feedback',
  'process_feedback',
  'general_feedback'
);

-- Seller Secure Links Table (for passwordless access)
CREATE TABLE seller_secure_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Link details
  link_type seller_link_type NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Usage tracking
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  ip_addresses TEXT[],
  user_agents TEXT[],
  
  -- Security and metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  is_single_use BOOLEAN DEFAULT false,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR used_at >= created_at)
);

-- Seller Notifications Table
CREATE TABLE seller_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES seller_profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type notification_type NOT NULL,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  
  -- Delivery information
  seller_email VARCHAR(255) NOT NULL,
  secure_link VARCHAR(500),
  delivery_status delivery_status DEFAULT 'pending',
  delivery_attempts INTEGER DEFAULT 0,
  last_delivery_attempt TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Provider information
  email_provider VARCHAR(50),
  message_id VARCHAR(100),
  provider_response JSONB,
  
  -- Metadata and scheduling
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller Feedback Table
CREATE TABLE seller_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Feedback details
  feedback_type feedback_type NOT NULL,
  subject VARCHAR(200),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Context information
  context_data JSONB DEFAULT '{}'::jsonb, -- What they're providing feedback on
  requested_response BOOLEAN DEFAULT false,
  response_provided TEXT,
  response_provided_at TIMESTAMP WITH TIME ZONE,
  response_provided_by UUID REFERENCES auth.users(id),
  
  -- Categorization and processing
  category VARCHAR(100),
  tags TEXT[],
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  
  -- Follow-up tracking
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller Portal Sessions Table (for analytics and security)
CREATE TABLE seller_portal_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Session details
  session_token VARCHAR(64) NOT NULL,
  secure_link_id UUID REFERENCES seller_secure_links(id) ON DELETE SET NULL,
  
  -- Access information
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Session activity
  pages_viewed TEXT[],
  actions_taken JSONB DEFAULT '{}'::jsonb,
  documents_viewed TEXT[],
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Session lifecycle
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Security flags
  is_suspicious BOOLEAN DEFAULT false,
  security_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller Property Interactions Table (specific property actions)
CREATE TABLE seller_property_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Interaction details
  interaction_type VARCHAR(50) NOT NULL, -- 'pricing_approved', 'pricing_rejected', 'feedback_provided', etc.
  interaction_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Decision tracking (for pricing approvals)
  decision VARCHAR(20), -- 'approved', 'rejected', 'counter_offer'
  decision_reason TEXT,
  counter_offer_amount DECIMAL(12,2),
  counter_offer_terms TEXT,
  
  -- Communication preferences
  preferred_contact_method VARCHAR(20), -- 'email', 'phone', 'text'
  best_contact_time VARCHAR(50),
  
  -- Follow-up requirements
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_type VARCHAR(50),
  follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_completed BOOLEAN DEFAULT false,
  
  -- Audit fields
  created_by_session UUID REFERENCES seller_portal_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller Communication Log Table (all communications)
CREATE TABLE seller_communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Communication details
  communication_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'text', 'portal_message'
  direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
  subject VARCHAR(200),
  content TEXT,
  
  -- Delivery information
  sent_to VARCHAR(255),
  sent_from VARCHAR(255),
  delivery_status delivery_status DEFAULT 'pending',
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Relationship tracking
  parent_communication_id UUID REFERENCES seller_communication_log(id),
  thread_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  attachments TEXT[],
  priority INTEGER DEFAULT 3,
  
  -- Internal tracking
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  is_internal_note BOOLEAN DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_seller_secure_links_seller ON seller_secure_links(seller_id);
CREATE INDEX idx_seller_secure_links_token ON seller_secure_links(token);
CREATE INDEX idx_seller_secure_links_expires ON seller_secure_links(expires_at);
CREATE INDEX idx_seller_secure_links_property ON seller_secure_links(property_id);

CREATE INDEX idx_seller_notifications_seller ON seller_notifications(seller_id);
CREATE INDEX idx_seller_notifications_property ON seller_notifications(property_id);
CREATE INDEX idx_seller_notifications_status ON seller_notifications(delivery_status);
CREATE INDEX idx_seller_notifications_type ON seller_notifications(notification_type);
CREATE INDEX idx_seller_notifications_scheduled ON seller_notifications(scheduled_for);

CREATE INDEX idx_seller_feedback_seller ON seller_feedback(seller_id);
CREATE INDEX idx_seller_feedback_property ON seller_feedback(property_id);
CREATE INDEX idx_seller_feedback_type ON seller_feedback(feedback_type);
CREATE INDEX idx_seller_feedback_processed ON seller_feedback(is_processed);

CREATE INDEX idx_seller_sessions_seller ON seller_portal_sessions(seller_id);
CREATE INDEX idx_seller_sessions_active ON seller_portal_sessions(is_active);
CREATE INDEX idx_seller_sessions_started ON seller_portal_sessions(started_at);

CREATE INDEX idx_seller_interactions_seller_property ON seller_property_interactions(seller_id, property_id);
CREATE INDEX idx_seller_interactions_type ON seller_property_interactions(interaction_type);
CREATE INDEX idx_seller_interactions_decision ON seller_property_interactions(decision);

CREATE INDEX idx_seller_communication_seller ON seller_communication_log(seller_id);
CREATE INDEX idx_seller_communication_property ON seller_communication_log(property_id);
CREATE INDEX idx_seller_communication_type ON seller_communication_log(communication_type);
CREATE INDEX idx_seller_communication_thread ON seller_communication_log(thread_id);

-- Add updated_at triggers
CREATE TRIGGER update_seller_secure_links_updated_at BEFORE UPDATE ON seller_secure_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_notifications_updated_at BEFORE UPDATE ON seller_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_feedback_updated_at BEFORE UPDATE ON seller_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_interactions_updated_at BEFORE UPDATE ON seller_property_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_communication_updated_at BEFORE UPDATE ON seller_communication_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for seller portal management

-- Function to clean up expired secure links
CREATE OR REPLACE FUNCTION cleanup_expired_seller_links()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM seller_secure_links 
  WHERE expires_at < NOW() - INTERVAL '7 days'
  AND (used_at IS NOT NULL OR is_revoked = true);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track seller portal activity
CREATE OR REPLACE FUNCTION track_seller_activity(
  p_session_id UUID,
  p_action VARCHAR,
  p_page VARCHAR DEFAULT NULL,
  p_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Update session activity
  UPDATE seller_portal_sessions 
  SET 
    last_activity_at = NOW(),
    actions_taken = COALESCE(actions_taken, '{}'::jsonb) || jsonb_build_object(
      to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      jsonb_build_object('action', p_action, 'page', p_page, 'data', p_data)
    ),
    pages_viewed = CASE 
      WHEN p_page IS NOT NULL AND NOT (p_page = ANY(pages_viewed)) 
      THEN array_append(pages_viewed, p_page)
      ELSE pages_viewed
    END
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send seller notification
CREATE OR REPLACE FUNCTION create_seller_notification(
  p_seller_id UUID,
  p_property_id UUID,
  p_type notification_type,
  p_subject VARCHAR,
  p_content TEXT,
  p_secure_link VARCHAR DEFAULT NULL,
  p_priority INTEGER DEFAULT 3
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  seller_email VARCHAR;
BEGIN
  -- Get seller email
  SELECT email INTO seller_email
  FROM seller_profiles
  WHERE id = p_seller_id;
  
  IF seller_email IS NULL THEN
    RAISE EXCEPTION 'Seller not found';
  END IF;
  
  -- Create notification
  INSERT INTO seller_notifications (
    seller_id,
    property_id,
    notification_type,
    subject,
    content,
    seller_email,
    secure_link,
    priority
  ) VALUES (
    p_seller_id,
    p_property_id,
    p_type,
    p_subject,
    p_content,
    seller_email,
    p_secure_link,
    p_priority
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seller portal analytics
CREATE OR REPLACE FUNCTION get_seller_portal_analytics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (
  total_links_generated BIGINT,
  total_sessions BIGINT,
  unique_sellers BIGINT,
  avg_session_duration NUMERIC,
  total_interactions BIGINT,
  pricing_approvals BIGINT,
  pricing_rejections BIGINT,
  feedback_submissions BIGINT,
  notification_delivery_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH link_stats AS (
    SELECT COUNT(*) as links_generated
    FROM seller_secure_links
    WHERE created_at BETWEEN p_start_date AND p_end_date
  ),
  session_stats AS (
    SELECT 
      COUNT(*) as sessions,
      COUNT(DISTINCT seller_id) as unique_sellers,
      AVG(time_spent_seconds) as avg_duration
    FROM seller_portal_sessions
    WHERE started_at BETWEEN p_start_date AND p_end_date
  ),
  interaction_stats AS (
    SELECT 
      COUNT(*) as interactions,
      COUNT(*) FILTER (WHERE decision = 'approved') as approvals,
      COUNT(*) FILTER (WHERE decision = 'rejected') as rejections
    FROM seller_property_interactions
    WHERE created_at BETWEEN p_start_date AND p_end_date
  ),
  feedback_stats AS (
    SELECT COUNT(*) as feedback_count
    FROM seller_feedback
    WHERE created_at BETWEEN p_start_date AND p_end_date
  ),
  notification_stats AS (
    SELECT 
      COUNT(*) as total_notifications,
      COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'opened', 'clicked')) as delivered_notifications
    FROM seller_notifications
    WHERE created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    l.links_generated,
    s.sessions,
    s.unique_sellers,
    COALESCE(s.avg_duration, 0),
    i.interactions,
    i.approvals,
    i.rejections,
    f.feedback_count,
    CASE 
      WHEN n.total_notifications > 0 
      THEN ROUND((n.delivered_notifications::NUMERIC / n.total_notifications * 100), 2)
      ELSE 0 
    END as delivery_rate
  FROM link_stats l
  CROSS JOIN session_stats s
  CROSS JOIN interaction_stats i
  CROSS JOIN feedback_stats f
  CROSS JOIN notification_stats n;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RLS Policies

-- Enable RLS on all seller portal tables
ALTER TABLE seller_secure_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_property_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_communication_log ENABLE ROW LEVEL SECURITY;

-- Seller secure links policies
CREATE POLICY "Sellers can view own secure links" ON seller_secure_links
  FOR SELECT USING (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage secure links" ON seller_secure_links
  FOR ALL USING (true); -- Will be controlled by service role

-- Seller notifications policies  
CREATE POLICY "Sellers can view own notifications" ON seller_notifications
  FOR SELECT USING (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

-- Seller feedback policies
CREATE POLICY "Sellers can manage own feedback" ON seller_feedback
  FOR ALL USING (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can view all feedback" ON seller_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'support', 'sales')
    )
  );

-- Seller sessions policies
CREATE POLICY "System can manage sessions" ON seller_portal_sessions
  FOR ALL USING (true);

-- Property interactions policies
CREATE POLICY "Sellers can manage own property interactions" ON seller_property_interactions
  FOR ALL USING (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can view property interactions" ON seller_property_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'support', 'sales')
    )
  );

-- Communication log policies
CREATE POLICY "Sellers can view own communications" ON seller_communication_log
  FOR SELECT USING (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can manage all communications" ON seller_communication_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'support', 'sales')
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_seller_links TO authenticated;
GRANT EXECUTE ON FUNCTION track_seller_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_seller_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_portal_analytics TO authenticated;

-- Add seller portal permissions
INSERT INTO permissions (name, description, resource_type) VALUES
('seller.portal.access', 'Access seller portal', 'seller'),
('seller.notifications.send', 'Send notifications to sellers', 'seller'),
('seller.feedback.view', 'View seller feedback', 'seller'),
('seller.analytics.view', 'View seller portal analytics', 'seller')
ON CONFLICT (name) DO NOTHING;

-- Add permissions to support and admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'support')
AND p.name LIKE 'seller.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;