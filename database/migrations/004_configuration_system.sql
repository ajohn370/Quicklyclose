-- Centralized Configuration Management System
-- Phase 0.6: Implement centralized configuration management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configuration Types Enum
CREATE TYPE configuration_type AS ENUM (
  'system',
  'business_rule',
  'feature_flag',
  'api_key',
  'notification',
  'service_url',
  'rate_limit'
);

-- Configuration Scope Enum
CREATE TYPE configuration_scope AS ENUM (
  'global',
  'environment',
  'user',
  'tenant',
  'region'
);

-- System Configurations Table
CREATE TABLE system_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(200) NOT NULL,
  value JSONB NOT NULL,
  type configuration_type NOT NULL DEFAULT 'system',
  scope configuration_scope NOT NULL DEFAULT 'global',
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  environment VARCHAR(50) DEFAULT 'global',
  
  -- Validation rules
  validation_rule VARCHAR(500),
  min_value DECIMAL(15,4),
  max_value DECIMAL(15,4),
  allowed_values JSONB,
  
  -- Change tracking  
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  
  -- Metadata
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique keys per environment and scope
  CONSTRAINT unique_config_key_env_scope UNIQUE (key, environment, scope)
);

-- Configuration Change History Table
CREATE TABLE configuration_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configuration_id UUID NOT NULL REFERENCES system_configurations(id) ON DELETE CASCADE,
  key VARCHAR(200) NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  change_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'activate', 'deactivate', 'delete'
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Flag Overrides Table (for user/group specific flags)
CREATE TABLE feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_key VARCHAR(200) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_group VARCHAR(100),
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one override per user per flag
  CONSTRAINT unique_user_flag_override UNIQUE (flag_key, user_id),
  -- Ensure one override per group per flag  
  CONSTRAINT unique_group_flag_override UNIQUE (flag_key, user_group),
  -- Must have either user_id or user_group
  CONSTRAINT check_user_or_group CHECK (
    (user_id IS NOT NULL AND user_group IS NULL) OR
    (user_id IS NULL AND user_group IS NOT NULL)
  )
);

-- Configuration Templates Table (for easy deployment of common configs)
CREATE TABLE configuration_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  template_data JSONB NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_system_configurations_key ON system_configurations(key);
CREATE INDEX idx_system_configurations_type ON system_configurations(type);
CREATE INDEX idx_system_configurations_scope ON system_configurations(scope);
CREATE INDEX idx_system_configurations_environment ON system_configurations(environment);
CREATE INDEX idx_system_configurations_category ON system_configurations(category);
CREATE INDEX idx_system_configurations_active ON system_configurations(is_active);
CREATE INDEX idx_system_configurations_updated_at ON system_configurations(updated_at);

CREATE INDEX idx_configuration_history_config_id ON configuration_history(configuration_id);
CREATE INDEX idx_configuration_history_key ON configuration_history(key);
CREATE INDEX idx_configuration_history_created_at ON configuration_history(created_at);

CREATE INDEX idx_feature_flag_overrides_flag ON feature_flag_overrides(flag_key);
CREATE INDEX idx_feature_flag_overrides_user ON feature_flag_overrides(user_id);
CREATE INDEX idx_feature_flag_overrides_group ON feature_flag_overrides(user_group);

-- Insert default system configurations
INSERT INTO system_configurations (key, value, type, description, category, created_by) VALUES
-- Business Rules - Profit Margins
('profit_margins.base', '0.15', 'business_rule', 'Base profit margin percentage', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),
('profit_margins.minimum', '0.10', 'business_rule', 'Minimum allowed profit margin', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),
('profit_margins.maximum', '0.30', 'business_rule', 'Maximum allowed profit margin', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),
('profit_margins.single_family', '1.0', 'business_rule', 'Single family property multiplier', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),
('profit_margins.condo', '1.1', 'business_rule', 'Condo property multiplier', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),
('profit_margins.townhouse', '1.05', 'business_rule', 'Townhouse property multiplier', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),
('profit_margins.multi_family', '0.95', 'business_rule', 'Multi-family property multiplier', 'profit_margins', (SELECT id FROM auth.users LIMIT 1)),

-- Business Rules - Bidding
('bidding.duration_hours', '48', 'business_rule', 'Default bidding window duration in hours', 'bidding', (SELECT id FROM auth.users LIMIT 1)),
('bidding.minimum_increment', '1000', 'business_rule', 'Minimum bid increment amount', 'bidding', (SELECT id FROM auth.users LIMIT 1)),
('bidding.auto_extend_threshold_minutes', '10', 'business_rule', 'Auto-extend if bid placed within this many minutes of close', 'bidding', (SELECT id FROM auth.users LIMIT 1)),
('bidding.extension_duration_minutes', '30', 'business_rule', 'Extension duration when auto-extending', 'bidding', (SELECT id FROM auth.users LIMIT 1)),
('bidding.reserve_price_enabled', 'false', 'business_rule', 'Enable reserve pricing for auctions', 'bidding', (SELECT id FROM auth.users LIMIT 1)),

-- Business Rules - Analysis
('analysis.timeout_seconds', '30', 'business_rule', 'Analysis timeout in seconds', 'analysis', (SELECT id FROM auth.users LIMIT 1)),
('analysis.retry_attempts', '3', 'business_rule', 'Number of retry attempts for failed analysis', 'analysis', (SELECT id FROM auth.users LIMIT 1)),
('analysis.confidence_threshold', '70', 'business_rule', 'Minimum confidence threshold for analysis', 'analysis', (SELECT id FROM auth.users LIMIT 1)),
('analysis.max_image_age_days', '42', 'business_rule', 'Maximum age of property images in days', 'analysis', (SELECT id FROM auth.users LIMIT 1)),
('analysis.auto_approve_high_confidence', 'false', 'business_rule', 'Auto-approve analysis with high confidence', 'analysis', (SELECT id FROM auth.users LIMIT 1)),
('analysis.high_confidence_threshold', '90', 'business_rule', 'Threshold for high confidence auto-approval', 'analysis', (SELECT id FROM auth.users LIMIT 1)),

-- Business Rules - Notifications
('notifications.email_enabled', 'true', 'business_rule', 'Enable email notifications', 'notifications', (SELECT id FROM auth.users LIMIT 1)),
('notifications.sms_enabled', 'false', 'business_rule', 'Enable SMS notifications', 'notifications', (SELECT id FROM auth.users LIMIT 1)),
('notifications.digest_frequency_hours', '24', 'business_rule', 'Frequency of digest notifications in hours', 'notifications', (SELECT id FROM auth.users LIMIT 1)),
('notifications.immediate_notifications', '["bid_won", "bid_lost", "listing_approved"]', 'business_rule', 'Types of notifications sent immediately', 'notifications', (SELECT id FROM auth.users LIMIT 1)),

-- Feature Flags
('feature_flag.bidding_enabled', '{"enabled": true, "rollout_percentage": 100, "user_groups": [], "environment": "production"}', 'feature_flag', 'Enable bidding functionality', 'features', (SELECT id FROM auth.users LIMIT 1)),
('feature_flag.auto_analysis', '{"enabled": true, "rollout_percentage": 100, "user_groups": [], "environment": "production"}', 'feature_flag', 'Enable automatic property analysis', 'features', (SELECT id FROM auth.users LIMIT 1)),
('feature_flag.email_notifications', '{"enabled": true, "rollout_percentage": 100, "user_groups": [], "environment": "production"}', 'feature_flag', 'Enable email notifications', 'features', (SELECT id FROM auth.users LIMIT 1)),
('feature_flag.advanced_analytics', '{"enabled": false, "rollout_percentage": 10, "user_groups": ["admin", "analyst"], "environment": "production"}', 'feature_flag', 'Enable advanced analytics features', 'features', (SELECT id FROM auth.users LIMIT 1)),

-- System Settings
('system.debug_mode', 'false', 'system', 'Enable debug mode', 'system', (SELECT id FROM auth.users LIMIT 1)),
('system.log_level', '"info"', 'system', 'Application log level', 'system', (SELECT id FROM auth.users LIMIT 1)),
('system.maintenance_mode', 'false', 'system', 'Enable maintenance mode', 'system', (SELECT id FROM auth.users LIMIT 1)),
('system.max_concurrent_analyses', '5', 'system', 'Maximum concurrent property analyses', 'system', (SELECT id FROM auth.users LIMIT 1)),

-- Rate Limits
('rate_limits.api_requests_per_minute', '60', 'rate_limit', 'API requests per minute per user', 'limits', (SELECT id FROM auth.users LIMIT 1)),
('rate_limits.property_submissions_per_day', '10', 'rate_limit', 'Property submissions per day per user', 'limits', (SELECT id FROM auth.users LIMIT 1)),
('rate_limits.analysis_requests_per_hour', '5', 'rate_limit', 'Analysis requests per hour per user', 'limits', (SELECT id FROM auth.users LIMIT 1)),

-- Service Configuration
('services.comp_ai_timeout', '30000', 'system', 'Comp AI service timeout in milliseconds', 'services', (SELECT id FROM auth.users LIMIT 1)),
('services.redis_connection_timeout', '5000', 'system', 'Redis connection timeout in milliseconds', 'services', (SELECT id FROM auth.users LIMIT 1)),
('services.job_queue_concurrency', '10', 'system', 'Job queue concurrency limit', 'services', (SELECT id FROM auth.users LIMIT 1));

-- Insert configuration templates
INSERT INTO configuration_templates (name, description, template_data, category) VALUES
('Development Environment', 'Standard configuration for development environment', '{
  "debug_mode": true,
  "log_level": "debug",
  "analysis.auto_approve_high_confidence": false,
  "feature_flag.advanced_analytics": {"enabled": true, "rollout_percentage": 100},
  "rate_limits.api_requests_per_minute": 1000
}', 'environment'),

('Production Environment', 'Standard configuration for production environment', '{
  "debug_mode": false,
  "log_level": "info",
  "system.maintenance_mode": false,
  "analysis.auto_approve_high_confidence": false,
  "feature_flag.advanced_analytics": {"enabled": false, "rollout_percentage": 5}
}', 'environment'),

('High Volume Setup', 'Configuration for high-volume property processing', '{
  "system.max_concurrent_analyses": 20,
  "services.job_queue_concurrency": 50,
  "rate_limits.property_submissions_per_day": 100,
  "analysis.timeout_seconds": 60
}', 'performance');

-- Create function to get configuration value with caching hints
CREATE OR REPLACE FUNCTION get_config_value(
  config_key TEXT,
  config_environment TEXT DEFAULT 'global',
  config_scope TEXT DEFAULT 'global'
) RETURNS JSONB AS $$
DECLARE
  config_value JSONB;
BEGIN
  SELECT value INTO config_value
  FROM system_configurations
  WHERE key = config_key
  AND environment = config_environment
  AND scope = config_scope
  AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  RETURN COALESCE(config_value, 'null'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to check feature flag
CREATE OR REPLACE FUNCTION is_feature_enabled(
  flag_key TEXT,
  user_id UUID DEFAULT NULL,
  user_groups TEXT[] DEFAULT '{}'
) RETURNS BOOLEAN AS $$
DECLARE
  flag_config JSONB;
  user_override BOOLEAN;
  group_override BOOLEAN;
  rollout_percentage INTEGER;
  user_hash INTEGER;
BEGIN
  -- Check for user-specific override
  SELECT enabled INTO user_override
  FROM feature_flag_overrides
  WHERE flag_key = flag_key
  AND user_id = user_id
  AND (expires_at IS NULL OR expires_at > NOW());

  IF user_override IS NOT NULL THEN
    RETURN user_override;
  END IF;

  -- Check for group-specific override
  SELECT enabled INTO group_override
  FROM feature_flag_overrides
  WHERE flag_key = flag_key
  AND user_group = ANY(user_groups)
  AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF group_override IS NOT NULL THEN
    RETURN group_override;
  END IF;

  -- Get main feature flag configuration
  SELECT value INTO flag_config
  FROM system_configurations
  WHERE key = 'feature_flag.' || flag_key
  AND is_active = true;

  IF flag_config IS NULL OR (flag_config->>'enabled')::boolean = false THEN
    RETURN false;
  END IF;

  -- Check rollout percentage
  rollout_percentage := COALESCE((flag_config->>'rollout_percentage')::integer, 100);
  
  IF rollout_percentage < 100 AND user_id IS NOT NULL THEN
    -- Generate consistent hash for user
    user_hash := abs(('x' || substr(md5(user_id::text), 1, 8))::bit(32)::integer) % 100;
    IF user_hash >= rollout_percentage THEN
      RETURN false;
    END IF;
  END IF;

  -- Check user groups
  IF jsonb_array_length(flag_config->'user_groups') > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(flag_config->'user_groups') AS required_group
      WHERE required_group = ANY(user_groups)
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigger to log configuration changes
CREATE OR REPLACE FUNCTION log_configuration_change() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO configuration_history (
    configuration_id,
    key,
    old_value,
    new_value,
    change_type,
    changed_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.key, OLD.key),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.value END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.value END,
    LOWER(TG_OP),
    COALESCE(NEW.updated_by, OLD.updated_by)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER configuration_change_log
  AFTER INSERT OR UPDATE OR DELETE ON system_configurations
  FOR EACH ROW EXECUTE FUNCTION log_configuration_change();

-- RLS Policies
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_templates ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all configurations
CREATE POLICY "Super admins can manage configurations" ON system_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name = 'super_admin'
    )
  );

-- Admins can view most configurations (not encrypted ones)
CREATE POLICY "Admins can view configurations" ON system_configurations
  FOR SELECT USING (
    is_encrypted = false AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Super admins can view configuration history
CREATE POLICY "Super admins can view configuration history" ON configuration_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name = 'super_admin'
    )
  );

-- Admins can manage feature flag overrides
CREATE POLICY "Admins can manage feature flag overrides" ON feature_flag_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Users can view their own feature flag overrides
CREATE POLICY "Users can view own feature flag overrides" ON feature_flag_overrides
  FOR SELECT USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_system_configurations_updated_at BEFORE UPDATE ON system_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_templates_updated_at BEFORE UPDATE ON configuration_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();