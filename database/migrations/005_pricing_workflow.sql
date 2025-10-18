-- Pricing Workflow and Revision Management System
-- Phase 1.2d: Add pricing history tracking and audit trail

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Approval levels for pricing revisions
CREATE TYPE approval_level AS ENUM (
  'analyst',
  'senior_analyst', 
  'pricing_manager',
  'director'
);

-- Approval status for pricing revisions
CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'escalated'
);

-- Market position types
CREATE TYPE market_position AS ENUM (
  'aggressive',
  'competitive',
  'conservative'
);

-- Pricing Revisions Table
CREATE TABLE pricing_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Pricing details
  previous_offer DECIMAL(12,2) NOT NULL,
  new_offer DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  
  -- Adjustments applied
  confidence_adjustment DECIMAL(5,2), -- Percentage adjustment
  market_adjustment DECIMAL(5,2), -- Percentage adjustment  
  profit_margin_override DECIMAL(5,4), -- Override margin as decimal
  
  -- Approval workflow
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approval_level_required approval_level NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  escalation_reason TEXT,
  
  -- Risk and validation
  business_rules_validated BOOLEAN NOT NULL DEFAULT false,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 10),
  
  -- Impact analysis (stored as JSONB for flexibility)
  impact_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (new_offer > 0),
  CHECK (previous_offer > 0),
  CHECK (new_offer != previous_offer)
);

-- Pricing Analysis History Table
CREATE TABLE pricing_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Analysis results
  estimated_value DECIMAL(12,2) NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  recommended_offer DECIMAL(12,2) NOT NULL,
  
  -- Margin calculations
  base_margin DECIMAL(5,4) NOT NULL,
  adjusted_margin DECIMAL(5,4) NOT NULL,
  final_margin DECIMAL(5,4) NOT NULL,
  
  -- Detailed breakdown (stored as JSONB)
  margin_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  business_rules_validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenario_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Market data snapshot
  market_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  property_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Analysis metadata
  analysis_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  calculation_method VARCHAR(50) NOT NULL DEFAULT 'standard',
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (estimated_value > 0),
  CHECK (recommended_offer > 0),
  CHECK (base_margin >= 0 AND base_margin <= 1),
  CHECK (adjusted_margin >= 0 AND adjusted_margin <= 1),
  CHECK (final_margin >= 0 AND final_margin <= 1)
);

-- Pricing Approval Tasks Table (for workflow management)
CREATE TABLE pricing_approval_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_id UUID NOT NULL REFERENCES pricing_revisions(id) ON DELETE CASCADE,
  
  -- Task details
  approval_level approval_level NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Task status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Due date calculation
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Task metadata
  notification_sent BOOLEAN DEFAULT false,
  reminder_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Activity Log Table (detailed audit trail)
CREATE TABLE pricing_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES pricing_revisions(id) ON DELETE SET NULL,
  
  -- Activity details
  activity_type VARCHAR(50) NOT NULL, -- 'revision_created', 'revision_approved', 'analysis_run', etc.
  description TEXT NOT NULL,
  
  -- User and system information
  user_id UUID REFERENCES auth.users(id),
  user_role VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  
  -- Before/after state
  before_state JSONB,
  after_state JSONB,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  automated BOOLEAN DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_pricing_activity_property (property_id),
  INDEX idx_pricing_activity_user (user_id),
  INDEX idx_pricing_activity_type (activity_type),
  INDEX idx_pricing_activity_created (created_at)
);

-- Pricing Business Rules Cache Table (for performance)
CREATE TABLE pricing_business_rules_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Rule identification
  rule_key VARCHAR(100) NOT NULL UNIQUE,
  rule_category VARCHAR(50) NOT NULL,
  
  -- Rule value and metadata
  rule_value JSONB NOT NULL,
  rule_description TEXT,
  
  -- Validation rules
  validation_schema JSONB,
  min_value DECIMAL(15,4),
  max_value DECIMAL(15,4),
  allowed_values JSONB,
  
  -- Cache metadata
  source_config_id UUID,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_pricing_revisions_property ON pricing_revisions(property_id);
CREATE INDEX idx_pricing_revisions_status ON pricing_revisions(approval_status);
CREATE INDEX idx_pricing_revisions_level ON pricing_revisions(approval_level_required);
CREATE INDEX idx_pricing_revisions_created ON pricing_revisions(created_at);
CREATE INDEX idx_pricing_revisions_approved_by ON pricing_revisions(approved_by);

CREATE INDEX idx_pricing_analyses_property ON pricing_analyses(property_id);
CREATE INDEX idx_pricing_analyses_created ON pricing_analyses(created_at);
CREATE INDEX idx_pricing_analyses_confidence ON pricing_analyses(confidence_score);

CREATE INDEX idx_approval_tasks_revision ON pricing_approval_tasks(revision_id);
CREATE INDEX idx_approval_tasks_assigned ON pricing_approval_tasks(assigned_to);
CREATE INDEX idx_approval_tasks_status ON pricing_approval_tasks(status);
CREATE INDEX idx_approval_tasks_due ON pricing_approval_tasks(due_date);

CREATE INDEX idx_pricing_activity_property_created ON pricing_activity_log(property_id, created_at);
CREATE INDEX idx_pricing_activity_user_created ON pricing_activity_log(user_id, created_at);

CREATE UNIQUE INDEX idx_business_rules_cache_key ON pricing_business_rules_cache(rule_key);
CREATE INDEX idx_business_rules_cache_category ON pricing_business_rules_cache(rule_category);

-- Add updated_at triggers
CREATE TRIGGER update_pricing_revisions_updated_at BEFORE UPDATE ON pricing_revisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_tasks_updated_at BEFORE UPDATE ON pricing_approval_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create pricing analysis record
CREATE OR REPLACE FUNCTION create_pricing_analysis(
  p_property_id UUID,
  p_estimated_value DECIMAL,
  p_confidence_score INTEGER,
  p_recommended_offer DECIMAL,
  p_base_margin DECIMAL,
  p_adjusted_margin DECIMAL,
  p_final_margin DECIMAL,
  p_margin_breakdown JSONB,
  p_risk_assessment JSONB,
  p_business_rules_validation JSONB,
  p_scenario_analysis JSONB,
  p_market_conditions JSONB,
  p_property_factors JSONB,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  analysis_id UUID;
BEGIN
  INSERT INTO pricing_analyses (
    property_id,
    estimated_value,
    confidence_score,
    recommended_offer,
    base_margin,
    adjusted_margin,
    final_margin,
    margin_breakdown,
    risk_assessment,
    business_rules_validation,
    scenario_analysis,
    market_conditions,
    property_factors,
    created_by
  ) VALUES (
    p_property_id,
    p_estimated_value,
    p_confidence_score,
    p_recommended_offer,
    p_base_margin,
    p_adjusted_margin,
    p_final_margin,
    p_margin_breakdown,
    p_risk_assessment,
    p_business_rules_validation,
    p_scenario_analysis,
    p_market_conditions,
    p_property_factors,
    p_created_by
  ) RETURNING id INTO analysis_id;
  
  -- Log the analysis creation
  INSERT INTO pricing_activity_log (
    property_id,
    activity_type,
    description,
    user_id,
    after_state,
    automated
  ) VALUES (
    p_property_id,
    'analysis_created',
    'Pricing analysis generated',
    p_created_by,
    jsonb_build_object(
      'analysis_id', analysis_id,
      'recommended_offer', p_recommended_offer,
      'confidence_score', p_confidence_score,
      'final_margin', p_final_margin
    ),
    true
  );
  
  RETURN analysis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log pricing activity
CREATE OR REPLACE FUNCTION log_pricing_activity(
  p_property_id UUID,
  p_activity_type VARCHAR,
  p_description TEXT,
  p_user_id UUID DEFAULT NULL,
  p_revision_id UUID DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_automated BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO pricing_activity_log (
    property_id,
    revision_id,
    activity_type,
    description,
    user_id,
    before_state,
    after_state,
    metadata,
    automated
  ) VALUES (
    p_property_id,
    p_revision_id,
    p_activity_type,
    p_description,
    p_user_id,
    p_before_state,
    p_after_state,
    p_metadata,
    p_automated
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pricing statistics
CREATE OR REPLACE FUNCTION get_pricing_statistics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (
  total_revisions BIGINT,
  pending_approvals BIGINT,
  auto_approved BIGINT,
  manually_approved BIGINT,
  rejected BIGINT,
  escalated BIGINT,
  avg_approval_time_hours NUMERIC,
  avg_margin_change NUMERIC,
  avg_risk_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH revision_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
      COUNT(*) FILTER (WHERE approval_status = 'approved' AND approved_by = created_by) as auto_approved,
      COUNT(*) FILTER (WHERE approval_status = 'approved' AND approved_by != created_by) as manual_approved,
      COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE approval_status = 'escalated') as escalated,
      AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600) FILTER (WHERE approved_at IS NOT NULL) as avg_approval_hours,
      AVG(ABS(new_offer - previous_offer) / previous_offer * 100) as avg_margin_change,
      AVG(risk_score) as avg_risk
    FROM pricing_revisions
    WHERE created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    total,
    pending,
    auto_approved,
    manual_approved,
    rejected,
    escalated,
    COALESCE(avg_approval_hours, 0),
    COALESCE(avg_margin_change, 0),
    COALESCE(avg_risk, 0)
  FROM revision_stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RLS Policies
ALTER TABLE pricing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_approval_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_business_rules_cache ENABLE ROW LEVEL SECURITY;

-- Pricing revisions policies
CREATE POLICY "Users with pricing permissions can view revisions" ON pricing_revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.name IN ('pricing.view', 'pricing.manage', 'pricing.approve')
    )
  );

CREATE POLICY "Users with pricing permissions can create revisions" ON pricing_revisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.name IN ('pricing.revise', 'pricing.manage')
    )
  );

CREATE POLICY "Users with approval permissions can update revisions" ON pricing_revisions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.name LIKE 'pricing.approve%'
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users with pricing permissions can view analyses" ON pricing_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.name IN ('pricing.view', 'pricing.manage')
    )
  );

CREATE POLICY "System can create analyses" ON pricing_analyses
  FOR INSERT WITH CHECK (true);

-- Approval tasks policies
CREATE POLICY "Users can view assigned approval tasks" ON pricing_approval_tasks
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.name IN ('pricing.manage', 'admin.dashboard.view')
    )
  );

-- Activity log policies
CREATE POLICY "Users with pricing permissions can view activity log" ON pricing_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.name IN ('pricing.view', 'pricing.manage', 'admin.dashboard.view')
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_pricing_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION log_pricing_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_pricing_statistics TO authenticated;

-- Insert default business rules cache
INSERT INTO pricing_business_rules_cache (rule_key, rule_category, rule_value, rule_description) VALUES
('base_margin', 'profit_margins', '0.15', 'Base profit margin percentage'),
('minimum_margin', 'profit_margins', '0.10', 'Minimum allowed profit margin'),
('maximum_margin', 'profit_margins', '0.30', 'Maximum allowed profit margin'),
('confidence_threshold_high', 'analysis', '90', 'High confidence threshold'),
('confidence_threshold_medium', 'analysis', '70', 'Medium confidence threshold'),
('auto_approval_max_change', 'approval', '5', 'Maximum percentage change for auto approval'),
('escalation_threshold_amount', 'approval', '25000', 'Dollar amount threshold for escalation'),
('risk_score_escalation', 'approval', '7', 'Risk score threshold for escalation');

-- Add pricing-related permissions to existing roles
INSERT INTO permissions (name, description, resource_type) VALUES
('pricing.view', 'View pricing analyses and revisions', 'pricing'),
('pricing.revise', 'Create pricing revisions', 'pricing'),
('pricing.approve.analyst', 'Approve pricing at analyst level', 'pricing'),
('pricing.approve.senior_analyst', 'Approve pricing at senior analyst level', 'pricing'),
('pricing.approve.manager', 'Approve pricing at manager level', 'pricing'),
('pricing.approve.director', 'Approve pricing at director level', 'pricing'),
('pricing.auto_approve', 'Auto-approve low-risk pricing changes', 'pricing'),
('pricing.manage', 'Full pricing management access', 'pricing')
ON CONFLICT (name) DO NOTHING;

-- Add pricing permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name LIKE 'pricing.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;