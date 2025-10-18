-- Granular Role-Based Access Control (RBAC) System
-- Phase 0.4: Implement granular RBAC system with permissions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Permissions Table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource_type VARCHAR(50), -- 'property', 'user', 'analysis', 'bid', 'system'
  action VARCHAR(50), -- 'create', 'read', 'update', 'delete', 'approve', 'reject'
  scope VARCHAR(50) DEFAULT 'all', -- 'all', 'own', 'department', 'region'
  is_system_permission BOOLEAN DEFAULT false, -- Cannot be deleted/modified by users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles Table (enhanced from basic admin/seller/investor)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- Cannot be deleted/modified by users
  hierarchy_level INTEGER DEFAULT 0, -- For role hierarchy (higher = more permissions)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission Junction Table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate role-permission assignments
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

-- User-Role Junction Table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional role expiration
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Prevent duplicate user-role assignments
  CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

-- User-Permission Override Table (for specific permission grants/denials)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL, -- true = grant, false = deny (overrides role permissions)
  reason TEXT,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Prevent duplicate user-permission overrides
  CONSTRAINT unique_user_permission UNIQUE (user_id, permission_id)
);

-- Resource-Specific Permissions Table
CREATE TABLE resource_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL, -- 'property', 'seller', 'analysis'
  resource_id UUID NOT NULL, -- ID of the specific resource
  permission_name VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Index for performance
  CONSTRAINT unique_resource_permission UNIQUE (user_id, resource_type, resource_id, permission_name)
);

-- Create indexes for performance
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_resource_action ON permissions(resource_type, action);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_hierarchy ON roles(hierarchy_level);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_resource_permissions_user ON resource_permissions(user_id);
CREATE INDEX idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id);

-- Insert default permissions
INSERT INTO permissions (name, description, resource_type, action, is_system_permission) VALUES
-- Property permissions
('can_review_submissions', 'Can review property submissions', 'property', 'read', true),
('can_approve_properties', 'Can approve property listings', 'property', 'approve', true),
('can_reject_properties', 'Can reject property submissions', 'property', 'reject', true),
('can_revise_pricing', 'Can revise property pricing', 'property', 'update', true),
('can_manage_properties', 'Full property management access', 'property', 'all', true),
('can_withdraw_properties', 'Can withdraw property listings', 'property', 'delete', true),

-- Analysis permissions
('can_trigger_analysis', 'Can trigger property analysis', 'analysis', 'create', true),
('can_view_analysis', 'Can view analysis results', 'analysis', 'read', true),
('can_override_analysis', 'Can override analysis results', 'analysis', 'update', true),

-- Bidding permissions
('can_start_bidding', 'Can start bidding windows', 'bid', 'create', true),
('can_manage_bidding', 'Can manage bidding windows', 'bid', 'update', true),
('can_view_bids', 'Can view bid details', 'bid', 'read', true),
('can_accept_bids', 'Can accept winning bids', 'bid', 'approve', true),

-- User management permissions
('can_manage_users', 'Can manage user accounts', 'user', 'all', true),
('can_assign_roles', 'Can assign roles to users', 'user', 'update', true),
('can_view_users', 'Can view user information', 'user', 'read', true),

-- Investor permissions
('can_place_bids', 'Can place bids on properties', 'bid', 'create', false),
('can_view_listings', 'Can view property listings', 'property', 'read', false),
('can_save_properties', 'Can save properties to favorites', 'property', 'create', false),

-- Seller permissions
('can_submit_properties', 'Can submit properties for sale', 'property', 'create', false),
('can_approve_pricing', 'Can approve/reject pricing proposals', 'property', 'approve', false),
('can_view_own_properties', 'Can view own property submissions', 'property', 'read', false),

-- System permissions
('can_access_admin_panel', 'Can access admin dashboard', 'system', 'read', true),
('can_manage_configuration', 'Can manage system configuration', 'system', 'update', true),
('can_view_logs', 'Can view system logs', 'system', 'read', true),
('can_manage_jobs', 'Can manage background jobs', 'system', 'update', true);

-- Insert default roles
INSERT INTO roles (name, display_name, description, hierarchy_level, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', 100, true),
('admin', 'Administrator', 'Property and user management access', 80, true),
('analyst', 'Property Analyst', 'Property review and analysis access', 60, true),
('seller', 'Property Seller', 'Can submit and manage own properties', 20, true),
('investor', 'Property Investor', 'Can view listings and place bids', 40, true),
('viewer', 'Read-Only User', 'Can view basic information only', 10, true);

-- Assign permissions to roles
WITH role_permission_assignments AS (
  SELECT 
    r.id as role_id,
    p.id as permission_id
  FROM roles r
  CROSS JOIN permissions p
  WHERE 
    -- Super Admin gets all permissions
    (r.name = 'super_admin') OR
    
    -- Admin gets most permissions except system management
    (r.name = 'admin' AND p.name IN (
      'can_review_submissions', 'can_approve_properties', 'can_reject_properties',
      'can_revise_pricing', 'can_manage_properties', 'can_withdraw_properties',
      'can_trigger_analysis', 'can_view_analysis', 'can_override_analysis',
      'can_start_bidding', 'can_manage_bidding', 'can_view_bids', 'can_accept_bids',
      'can_view_users', 'can_assign_roles', 'can_access_admin_panel', 'can_view_logs'
    )) OR
    
    -- Analyst gets property and analysis permissions
    (r.name = 'analyst' AND p.name IN (
      'can_review_submissions', 'can_revise_pricing', 'can_trigger_analysis',
      'can_view_analysis', 'can_view_bids', 'can_access_admin_panel'
    )) OR
    
    -- Seller gets seller-specific permissions
    (r.name = 'seller' AND p.name IN (
      'can_submit_properties', 'can_approve_pricing', 'can_view_own_properties'
    )) OR
    
    -- Investor gets investor-specific permissions
    (r.name = 'investor' AND p.name IN (
      'can_place_bids', 'can_view_listings', 'can_save_properties'
    )) OR
    
    -- Viewer gets read-only permissions
    (r.name = 'viewer' AND p.name IN (
      'can_view_listings'
    ))
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_assignments;

-- RLS Policies for RBAC tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_permissions ENABLE ROW LEVEL SECURITY;

-- Admin can view and manage all RBAC data
CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Users can view their own roles and permissions
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own permission overrides" ON user_permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own resource permissions" ON resource_permissions
  FOR SELECT USING (user_id = auth.uid());

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION has_permission(
  user_id UUID,
  permission_name TEXT,
  resource_type TEXT DEFAULT NULL,
  resource_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN := false;
  role_perm BOOLEAN := false;
  user_override BOOLEAN := NULL;
  resource_perm BOOLEAN := NULL;
BEGIN
  -- Check role-based permissions
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    AND p.name = permission_name
    AND (resource_type IS NULL OR p.resource_type = resource_type OR p.resource_type = 'all')
  ) INTO role_perm;
  
  -- Check user-specific permission overrides
  SELECT up.granted INTO user_override
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = user_id
  AND p.name = permission_name
  AND (up.expires_at IS NULL OR up.expires_at > NOW());
  
  -- Check resource-specific permissions
  IF resource_type IS NOT NULL AND resource_id IS NOT NULL THEN
    SELECT rp.granted INTO resource_perm
    FROM resource_permissions rp
    WHERE rp.user_id = user_id
    AND rp.resource_type = resource_type
    AND rp.resource_id = resource_id
    AND rp.permission_name = permission_name
    AND (rp.expires_at IS NULL OR rp.expires_at > NOW());
  END IF;
  
  -- Determine final permission (user override > resource permission > role permission)
  IF user_override IS NOT NULL THEN
    has_perm := user_override;
  ELSIF resource_perm IS NOT NULL THEN
    has_perm := resource_perm;
  ELSE
    has_perm := role_perm;
  END IF;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's highest role level
CREATE OR REPLACE FUNCTION get_user_role_level(user_id UUID) RETURNS INTEGER AS $$
DECLARE
  max_level INTEGER := 0;
BEGIN
  SELECT COALESCE(MAX(r.hierarchy_level), 0) INTO max_level
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id
  AND ur.is_active = true
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
  
  RETURN max_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger for roles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();