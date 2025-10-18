-- Enhanced Admin Portal Database Schema
-- Run this SQL in your Supabase SQL Editor after the existing schema

-- Admin role types
CREATE TYPE admin_role_type AS ENUM ('super_admin', 'admin', 'analyst', 'support');
CREATE TYPE message_type AS ENUM ('chat', 'pricing_update', 'analysis_update', 'system_notification');
CREATE TYPE comm_method AS ENUM ('in_app', 'email', 'both');
CREATE TYPE pricing_revision_type AS ENUM ('admin_suggestion', 'admin_final', 'ai_automated');
CREATE TYPE revision_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied');
CREATE TYPE note_type AS ENUM ('general', 'pricing', 'follow_up', 'issue', 'opportunity');
CREATE TYPE comm_type AS ENUM ('initial_contact', 'follow_up', 'pricing_discussion', 'analysis_review');
CREATE TYPE comm_status AS ENUM ('sent', 'delivered', 'read', 'responded');

-- Admin profiles with role hierarchy
CREATE TABLE admin_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role admin_role_type DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced messaging system (both in-app and email)
CREATE TABLE admin_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admin_profiles(id),
    seller_id UUID REFERENCES seller_profiles(id),
    message TEXT NOT NULL,
    message_type message_type DEFAULT 'chat',
    communication_method comm_method DEFAULT 'in_app',
    email_sent_at TIMESTAMPTZ NULL,
    read_at TIMESTAMPTZ NULL,
    reply_to_message_id UUID REFERENCES admin_messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-level pricing revision system
CREATE TABLE pricing_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES seller_profiles(id),
    admin_id UUID REFERENCES admin_profiles(id),
    property_analysis_id UUID REFERENCES comp_vision_analyses(id),
    revision_type pricing_revision_type,
    original_price DECIMAL(12,2),
    suggested_price DECIMAL(12,2),
    final_price DECIMAL(12,2) NULL,
    revision_notes TEXT,
    ai_confidence_score DECIMAL(3,2),
    market_data JSONB DEFAULT '{}',
    status revision_status DEFAULT 'pending',
    seller_response TEXT NULL,
    approved_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin notes and seller relationship management
CREATE TABLE admin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES seller_profiles(id),
    admin_id UUID REFERENCES admin_profiles(id),
    note_content TEXT NOT NULL,
    note_type note_type DEFAULT 'general',
    is_private BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication tracking and analytics
CREATE TABLE seller_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES seller_profiles(id),
    admin_id UUID REFERENCES admin_profiles(id),
    communication_type comm_type,
    content TEXT,
    response_time_hours INTEGER,
    status comm_status DEFAULT 'sent',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin activity logging for audit trail
CREATE TABLE admin_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admin_profiles(id),
    action TEXT NOT NULL,
    target_type TEXT, -- 'seller', 'pricing', 'message', etc.
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates for automated communications
CREATE TABLE email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    template_variables TEXT[] DEFAULT '{}',
    template_type TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing automation rules
CREATE TABLE pricing_automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    conditions JSONB NOT NULL, -- JSON conditions for when to apply
    pricing_adjustment JSONB NOT NULL, -- How to adjust pricing
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_admin_profiles_user_id ON admin_profiles(user_id);
CREATE INDEX idx_admin_profiles_role ON admin_profiles(role) WHERE is_active = true;
CREATE INDEX idx_admin_messages_admin_id ON admin_messages(admin_id);
CREATE INDEX idx_admin_messages_seller_id ON admin_messages(seller_id);
CREATE INDEX idx_admin_messages_created_at ON admin_messages(created_at DESC);
CREATE INDEX idx_pricing_revisions_seller_id ON pricing_revisions(seller_id);
CREATE INDEX idx_pricing_revisions_status ON pricing_revisions(status);
CREATE INDEX idx_admin_notes_seller_id ON admin_notes(seller_id);
CREATE INDEX idx_seller_communications_seller_id ON seller_communications(seller_id);
CREATE INDEX idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);

-- Row Level Security (RLS) Policies

-- Admin profiles - only admins can read other admin profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view admin profiles" ON admin_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
        )
    );

CREATE POLICY "Admins can update their own profile" ON admin_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Admin messages - admins can see messages they sent or received
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage their messages" ON admin_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.id = admin_messages.admin_id
        )
    );

-- Pricing revisions - admins can see all revisions
ALTER TABLE pricing_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pricing revisions" ON pricing_revisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
        )
    );

-- Admin notes - private notes only visible to creator, public notes to all admins
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view admin notes" ON admin_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
            AND (admin_notes.is_private = false OR admin_notes.admin_id = ap.id)
        )
    );

CREATE POLICY "Admins can create notes" ON admin_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.id = admin_notes.admin_id
        )
    );

-- Seller communications - all admins can view
ALTER TABLE seller_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage seller communications" ON seller_communications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
        )
    );

-- Admin activity log - all admins can read, only system can write
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view activity log" ON admin_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
        )
    );

-- Email templates - all admins can read, create, and update
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage email templates" ON email_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
        )
    );

-- Pricing automation rules - all admins can read, super_admin can modify
ALTER TABLE pricing_automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view pricing rules" ON pricing_automation_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.is_active = true
        )
    );

CREATE POLICY "Super admins can manage pricing rules" ON pricing_automation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap 
            WHERE ap.user_id = auth.uid() AND ap.role = 'super_admin' AND ap.is_active = true
        )
    );

-- Function to automatically log admin activities
CREATE OR REPLACE FUNCTION log_admin_activity()
    RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, details)
    SELECT 
        ap.id,
        TG_OP || ' on ' || TG_TABLE_NAME,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
            WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
            WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
        END
    FROM admin_profiles ap
    WHERE ap.user_id = auth.uid();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for activity logging on sensitive tables
CREATE TRIGGER admin_activity_pricing_revisions
    AFTER INSERT OR UPDATE OR DELETE ON pricing_revisions
    FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

CREATE TRIGGER admin_activity_admin_notes
    AFTER INSERT OR UPDATE OR DELETE ON admin_notes
    FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

-- Function to create admin profile when admin user is created
CREATE OR REPLACE FUNCTION handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has admin role in metadata
  IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    INSERT INTO public.admin_profiles (
      user_id,
      full_name,
      role,
      department
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'admin_role')::admin_role_type, 'admin'),
      COALESCE(NEW.raw_user_meta_data->>'department', '')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Update the existing user creation trigger to handle admin users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the user role from metadata
  DECLARE
    user_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'investor');
    user_full_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  BEGIN
    -- Create admin profile if role is admin
    IF user_role = 'admin' THEN
      INSERT INTO public.admin_profiles (
        user_id,
        full_name,
        role,
        department
      )
      VALUES (
        NEW.id,
        user_full_name,
        COALESCE((NEW.raw_user_meta_data->>'admin_role')::admin_role_type, 'admin'),
        COALESCE(NEW.raw_user_meta_data->>'department', '')
      );
    
    -- Create investor profile if role is investor (default)
    ELSIF user_role = 'investor' THEN
      INSERT INTO public.investor_profiles (
        user_id,
        full_name,
        investment_focus,
        minimum_investment,
        maximum_investment,
        preferred_locations
      )
      VALUES (
        NEW.id,
        user_full_name,
        '{}',
        0,
        0,
        '{}'
      );
    
    -- Create seller profile if role is seller
    ELSIF user_role = 'seller' THEN
      INSERT INTO public.seller_profiles (
        user_id,
        full_name,
        email,
        marketing_consent
      )
      VALUES (
        NEW.id,
        user_full_name,
        COALESCE(NEW.email, ''),
        false
      );
    END IF;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default email templates
INSERT INTO email_templates (name, subject, body_template, template_variables, template_type) VALUES
('pricing_suggestion', 'Updated Property Valuation - {{property_address}}', 
 'Dear {{seller_name}},

We have completed a comprehensive analysis of your property at {{property_address}}. Based on current market conditions and our AI-powered evaluation, we suggest updating your property pricing.

Current Analysis:
- Original Price: ${{original_price}}
- Suggested Price: ${{suggested_price}}
- Market Confidence: {{confidence_score}}%

Reasoning: {{revision_notes}}

Please review this suggestion and let us know your thoughts. You can respond directly to this email or log into your seller portal.

Best regards,
{{admin_name}}
QuicklyClose Team', 
 ARRAY['seller_name', 'property_address', 'original_price', 'suggested_price', 'confidence_score', 'revision_notes', 'admin_name'], 
 'pricing'),

('analysis_complete', 'Property Analysis Complete - {{property_address}}',
 'Dear {{seller_name}},

Great news! We have completed the AI analysis of your property at {{property_address}}.

Analysis Summary:
- Estimated Market Value: ${{estimated_value}}
- Analysis Confidence: {{confidence_score}}%
- Property Features Identified: {{features_count}} key features
- Comparable Properties Found: {{comps_count}} recent sales

You can view the complete analysis report in your seller portal or by clicking the link below.

Next Steps:
Our team will review these results and may contact you with pricing recommendations or additional questions.

Best regards,
{{admin_name}}
QuicklyClose Team',
 ARRAY['seller_name', 'property_address', 'estimated_value', 'confidence_score', 'features_count', 'comps_count', 'admin_name'],
 'analysis'),

('welcome_admin_contact', 'Welcome to QuicklyClose - Let''s Get Started!',
 'Dear {{seller_name}},

Welcome to QuicklyClose! I''m {{admin_name}} and I''ll be your dedicated representative throughout the property evaluation process.

What happens next:
1. Our AI will analyze your property photos and details
2. I''ll review the analysis personally
3. We''ll provide you with a comprehensive market evaluation
4. If you''re interested, we''ll connect you with qualified investors

Feel free to reach out to me directly with any questions. I''m here to make this process as smooth as possible for you.

Best regards,
{{admin_name}}
{{admin_email}}
QuicklyClose Team',
 ARRAY['seller_name', 'admin_name', 'admin_email'],
 'welcome');

-- Insert default pricing automation rules (example)
INSERT INTO pricing_automation_rules (rule_name, conditions, pricing_adjustment, created_by) 
SELECT 
  'High Confidence Auto-Adjust',
  jsonb_build_object(
    'min_confidence_score', 0.85,
    'max_price_difference_percent', 0.15,
    'market_trend', 'stable'
  ),
  jsonb_build_object(
    'action', 'auto_apply',
    'max_adjustment_percent', 0.10
  ),
  ap.id
FROM admin_profiles ap 
WHERE ap.role = 'super_admin' 
LIMIT 1;

-- Create some utility functions for admin operations

-- Function to get seller summary for admin dashboard
CREATE OR REPLACE FUNCTION get_seller_summary_for_admin()
RETURNS TABLE (
  seller_id UUID,
  seller_name TEXT,
  email TEXT,
  properties_count BIGINT,
  analyses_count BIGINT,
  last_activity TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.full_name,
    sp.email,
    COUNT(DISTINCT p.id) as properties_count,
    COUNT(DISTINCT cva.id) as analyses_count,
    GREATEST(sp.updated_at, MAX(cva.created_at)) as last_activity,
    CASE 
      WHEN COUNT(cva.id) = 0 THEN 'No Analysis'
      WHEN EXISTS(SELECT 1 FROM pricing_revisions pr WHERE pr.seller_id = sp.id AND pr.status = 'pending') THEN 'Pending Pricing'
      ELSE 'Active'
    END as status
  FROM seller_profiles sp
  LEFT JOIN properties p ON p.seller_id = sp.id
  LEFT JOIN comp_vision_analyses cva ON cva.user_id = sp.user_id
  GROUP BY sp.id, sp.full_name, sp.email, sp.updated_at
  ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
