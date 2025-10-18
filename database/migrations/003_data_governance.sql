-- Data Governance and Privacy System
-- Phase 0.5: Add data governance - PII encryption and retention policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Data Classification Enum
CREATE TYPE data_classification AS ENUM (
  'public',
  'internal',
  'confidential',
  'restricted',
  'pii'
);

-- Data Retention Policies Table
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  data_type VARCHAR(100) NOT NULL, -- 'user_data', 'property_data', 'analysis_data', 'logs'
  table_name VARCHAR(100),
  classification data_classification NOT NULL,
  retention_period_days INTEGER NOT NULL,
  auto_delete_enabled BOOLEAN DEFAULT true,
  anonymization_enabled BOOLEAN DEFAULT false,
  anonymization_fields JSONB DEFAULT '[]'::jsonb,
  legal_basis TEXT, -- GDPR legal basis
  geographical_scope VARCHAR(100) DEFAULT 'global',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Processing Activities Table (GDPR Article 30)
CREATE TABLE data_processing_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_name VARCHAR(200) NOT NULL,
  description TEXT,
  controller_name VARCHAR(200) DEFAULT 'QuicklyClose',
  controller_contact VARCHAR(500),
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(100) NOT NULL,
  data_categories TEXT[] DEFAULT '{}',
  data_subjects TEXT[] DEFAULT '{}',
  recipients TEXT[] DEFAULT '{}',
  third_country_transfers BOOLEAN DEFAULT false,
  third_country_details TEXT,
  retention_period TEXT,
  security_measures TEXT,
  dpo_consulted BOOLEAN DEFAULT false,
  dpia_required BOOLEAN DEFAULT false,
  dpia_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PII Audit Log Table
CREATE TABLE pii_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL, -- 'access', 'update', 'delete', 'export', 'anonymize'
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  pii_fields TEXT[] DEFAULT '{}',
  purpose TEXT,
  legal_basis VARCHAR(100),
  user_consent BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(200),
  performed_by UUID REFERENCES auth.users(id),
  automated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Subject Rights Requests Table (GDPR)
CREATE TABLE data_subject_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
  data_subject_email VARCHAR(500) NOT NULL,
  data_subject_name VARCHAR(500),
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_method VARCHAR(100),
  request_details TEXT,
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'rejected', 'extended')),
  assigned_to UUID REFERENCES auth.users(id),
  response_due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  response_method VARCHAR(50) DEFAULT 'email',
  response_details TEXT,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent Management Table
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  data_subject_email VARCHAR(500) NOT NULL,
  consent_type VARCHAR(100) NOT NULL, -- 'marketing', 'analytics', 'data_processing', 'cookies'
  purpose TEXT NOT NULL,
  given BOOLEAN NOT NULL,
  consent_method VARCHAR(100), -- 'explicit', 'implied', 'opt_in', 'opt_out'
  consent_evidence JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  withdraw_method VARCHAR(100),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  legal_basis VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Encryption Configuration Table
CREATE TABLE encryption_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100) NOT NULL,
  encryption_type VARCHAR(50) DEFAULT 'symmetric' CHECK (encryption_type IN ('symmetric', 'asymmetric', 'hash')),
  key_rotation_days INTEGER DEFAULT 90,
  last_key_rotation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_table_column UNIQUE (table_name, column_name)
);

-- Create indexes for performance
CREATE INDEX idx_data_retention_policies_type ON data_retention_policies(data_type);
CREATE INDEX idx_data_retention_policies_active ON data_retention_policies(is_active);
CREATE INDEX idx_pii_audit_log_user ON pii_audit_log(user_id);
CREATE INDEX idx_pii_audit_log_table_record ON pii_audit_log(table_name, record_id);
CREATE INDEX idx_pii_audit_log_created_at ON pii_audit_log(created_at);
CREATE INDEX idx_data_subject_requests_email ON data_subject_requests(data_subject_email);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_email ON consent_records(data_subject_email);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);

-- Insert default data retention policies
INSERT INTO data_retention_policies (policy_name, description, data_type, table_name, classification, retention_period_days, legal_basis) VALUES
('Active User Data', 'Data for active user accounts', 'user_data', 'auth.users', 'pii', 2555, 'Contract performance'), -- 7 years
('Inactive User Data', 'Data for inactive user accounts', 'user_data', 'auth.users', 'pii', 730, 'Legitimate interest'), -- 2 years
('Seller Profiles', 'Property seller information', 'user_data', 'seller_profiles', 'pii', 2555, 'Contract performance'),
('Investor Profiles', 'Property investor information', 'user_data', 'investor_profiles', 'pii', 2555, 'Contract performance'),
('Property Data', 'Property listings and details', 'property_data', 'properties', 'confidential', 2555, 'Contract performance'),
('Analysis Data', 'AI analysis results', 'analysis_data', 'comp_vision_analyses', 'internal', 1825, 'Legitimate interest'), -- 5 years
('Rejected Submissions', 'Rejected property submissions', 'property_data', 'properties', 'internal', 90, 'Legitimate interest'),
('System Logs', 'Application and audit logs', 'logs', 'admin_activity_logs', 'internal', 2555, 'Legal obligation'),
('Session Data', 'User session information', 'user_data', 'notification_logs', 'internal', 90, 'Legitimate interest'),
('Bidding History', 'Property bidding records', 'property_data', 'bids', 'confidential', 2555, 'Contract performance');

-- Insert data processing activities
INSERT INTO data_processing_activities (activity_name, description, purpose, legal_basis, data_categories, data_subjects, recipients) VALUES
('Property Valuation Service', 'AI-powered property analysis and valuation', 'Provide property valuation services to users', 'Contract performance', 
 ARRAY['Property images', 'Property addresses', 'Property characteristics'], 
 ARRAY['Property sellers', 'Property investors'], 
 ARRAY['Internal staff', 'AI analysis service providers']),
 
('User Account Management', 'Managing user registrations, profiles, and authentication', 'User account management and service delivery', 'Contract performance',
 ARRAY['Names', 'Email addresses', 'Phone numbers', 'Authentication data'],
 ARRAY['Property sellers', 'Property investors', 'Administrators'],
 ARRAY['Internal staff', 'Authentication service providers']),
 
('Investment Matching', 'Matching properties with interested investors', 'Connect property sellers with potential investors', 'Contract performance',
 ARRAY['Investment preferences', 'Property interests', 'Contact information'],
 ARRAY['Property investors', 'Property sellers'],
 ARRAY['Internal staff']),
 
('Marketing Communications', 'Sending marketing emails and notifications', 'Marketing and business development', 'Consent',
 ARRAY['Email addresses', 'Names', 'Communication preferences'],
 ARRAY['Property sellers', 'Property investors'],
 ARRAY['Internal marketing team', 'Email service providers']),
 
('Platform Analytics', 'Analyzing platform usage and performance', 'Service improvement and business analytics', 'Legitimate interest',
 ARRAY['Usage data', 'Performance metrics', 'Anonymized user behavior'],
 ARRAY['All platform users'],
 ARRAY['Internal staff', 'Analytics service providers']);

-- Insert encryption configuration for PII fields
INSERT INTO encryption_config (table_name, column_name, encryption_type) VALUES
('seller_profiles', 'full_name', 'symmetric'),
('seller_profiles', 'email', 'symmetric'),
('seller_profiles', 'phone', 'symmetric'),
('investor_profiles', 'full_name', 'symmetric'),
('investor_profiles', 'phone', 'symmetric'),
('properties', 'address', 'symmetric'),
('notification_logs', 'content', 'symmetric');

-- Create function to encrypt PII data
CREATE OR REPLACE FUNCTION encrypt_pii(data TEXT, key_id TEXT DEFAULT 'default') RETURNS TEXT AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN data;
  END IF;
  
  -- Use pgcrypto's encrypt function with a derived key
  -- In production, use proper key management
  RETURN encode(encrypt(data::bytea, derive_key(key_id)::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Create function to decrypt PII data
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_data TEXT, key_id TEXT DEFAULT 'default') RETURNS TEXT AS $$
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN encrypted_data;
  END IF;
  
  -- Decrypt using the same key derivation
  RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), derive_key(key_id)::bytea, 'aes'), 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    -- Return original data if decryption fails (for backwards compatibility)
    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql;

-- Create function to derive encryption key (simplified for demo)
CREATE OR REPLACE FUNCTION derive_key(key_id TEXT) RETURNS TEXT AS $$
BEGIN
  -- In production, integrate with proper key management service
  -- This is a simplified implementation for demonstration
  RETURN encode(digest(key_id || current_setting('app.encryption_salt', true), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create function to log PII access
CREATE OR REPLACE FUNCTION log_pii_access(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_table_name VARCHAR(100),
  p_record_id UUID,
  p_pii_fields TEXT[],
  p_purpose TEXT DEFAULT NULL,
  p_automated BOOLEAN DEFAULT false
) RETURNS VOID AS $$
BEGIN
  INSERT INTO pii_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    pii_fields,
    purpose,
    performed_by,
    automated,
    ip_address,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_pii_fields,
    p_purpose,
    COALESCE(current_setting('app.current_user_id', true)::UUID, p_user_id),
    p_automated,
    inet_client_addr(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to anonymize data based on retention policy
CREATE OR REPLACE FUNCTION anonymize_expired_data() RETURNS INTEGER AS $$
DECLARE
  policy RECORD;
  affected_rows INTEGER := 0;
  total_affected INTEGER := 0;
BEGIN
  -- Loop through active retention policies
  FOR policy IN 
    SELECT * FROM data_retention_policies 
    WHERE is_active = true 
    AND anonymization_enabled = true
  LOOP
    -- Execute anonymization based on policy
    CASE policy.table_name
      WHEN 'seller_profiles' THEN
        UPDATE seller_profiles 
        SET 
          full_name = 'Anonymized User',
          email = 'anonymized_' || id || '@example.com',
          phone = NULL,
          address = NULL,
          city = NULL,
          state = NULL,
          zip_code = NULL
        WHERE created_at < (NOW() - INTERVAL '1 day' * policy.retention_period_days)
        AND full_name != 'Anonymized User';
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        total_affected := total_affected + affected_rows;
        
      WHEN 'investor_profiles' THEN
        UPDATE investor_profiles 
        SET 
          full_name = 'Anonymized Investor',
          company_name = NULL,
          phone = NULL,
          investment_focus = '{}',
          preferred_locations = '{}',
          minimum_investment = 0,
          maximum_investment = 0
        WHERE created_at < (NOW() - INTERVAL '1 day' * policy.retention_period_days)
        AND full_name != 'Anonymized Investor';
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        total_affected := total_affected + affected_rows;
    END CASE;
  END LOOP;
  
  RETURN total_affected;
END;
$$ LANGUAGE plpgsql;

-- Create function to delete expired data
CREATE OR REPLACE FUNCTION delete_expired_data() RETURNS INTEGER AS $$
DECLARE
  policy RECORD;
  affected_rows INTEGER := 0;
  total_affected INTEGER := 0;
BEGIN
  -- Loop through active retention policies with auto-delete enabled
  FOR policy IN 
    SELECT * FROM data_retention_policies 
    WHERE is_active = true 
    AND auto_delete_enabled = true
    AND anonymization_enabled = false -- Don't delete if anonymization is preferred
  LOOP
    -- Execute deletion based on policy
    CASE policy.table_name
      WHEN 'properties' THEN
        -- Only delete rejected submissions
        DELETE FROM properties 
        WHERE status = 'rejected' 
        AND created_at < (NOW() - INTERVAL '1 day' * policy.retention_period_days);
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        total_affected := total_affected + affected_rows;
        
      WHEN 'notification_logs' THEN
        DELETE FROM notification_logs 
        WHERE created_at < (NOW() - INTERVAL '1 day' * policy.retention_period_days);
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        total_affected := total_affected + affected_rows;
        
      WHEN 'admin_activity_logs' THEN
        -- Keep important security events longer
        DELETE FROM admin_activity_logs 
        WHERE created_at < (NOW() - INTERVAL '1 day' * policy.retention_period_days)
        AND action NOT IN ('DELETE_USER', 'SECURITY_VIOLATION', 'PERMISSION_CHANGE');
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        total_affected := total_affected + affected_rows;
    END CASE;
  END LOOP;
  
  RETURN total_affected;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for data governance tables
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage data governance
CREATE POLICY "Super admins can manage data retention policies" ON data_retention_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name = 'super_admin'
    )
  );

CREATE POLICY "Admins can view data processing activities" ON data_processing_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can view PII audit logs" ON pii_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Users can view their own consent records
CREATE POLICY "Users can view own consent records" ON consent_records
  FOR SELECT USING (user_id = auth.uid());

-- Users can create data subject requests
CREATE POLICY "Anyone can create data subject requests" ON data_subject_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage data subject requests" ON data_subject_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_processing_activities_updated_at BEFORE UPDATE ON data_processing_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_subject_requests_updated_at BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();