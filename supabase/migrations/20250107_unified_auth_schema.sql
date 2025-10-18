-- =====================================================================
-- Unified Authentication Schema Migration
-- =====================================================================
-- This migration transforms the authentication system to support
-- single email with multiple roles (seller, investor, admin)
-- =====================================================================

-- Create new unified user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user roles junction table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('seller', 'investor', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create role-specific data tables
CREATE TABLE IF NOT EXISTS public.seller_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    company_name TEXT,
    license_number TEXT,
    preferred_regions JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    investment_range JSONB DEFAULT '{}',
    property_preferences JSONB DEFAULT '{}',
    accreditation_status TEXT,
    investment_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    admin_level TEXT DEFAULT 'admin' CHECK (admin_level IN ('super_admin', 'admin', 'analyst', 'support')),
    department TEXT,
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session context table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    active_role TEXT NOT NULL CHECK (active_role IN ('seller', 'investor', 'admin')),
    portal_context TEXT NOT NULL CHECK (portal_context IN ('seller_portal', 'investor_portal', 'admin_portal')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

-- =====================================================================
-- Migrate existing data to new schema
-- =====================================================================

-- Migrate investor profiles
INSERT INTO user_profiles (user_id, email, full_name, phone)
SELECT 
    ip.user_id,
    COALESCE(au.email, ''),
    ip.full_name,
    ip.phone
FROM investor_profiles ip
JOIN auth.users au ON ip.user_id = au.id
ON CONFLICT (user_id) DO UPDATE
SET 
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone);

-- Create investor roles
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'investor' 
FROM investor_profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Create investor data
INSERT INTO investor_data (user_id)
SELECT user_id 
FROM investor_profiles
ON CONFLICT (user_id) DO NOTHING;

-- Migrate seller profiles
INSERT INTO user_profiles (user_id, email, full_name, phone)
SELECT 
    sp.user_id,
    COALESCE(sp.email, au.email, ''),
    sp.full_name,
    sp.phone
FROM seller_profiles sp
JOIN auth.users au ON sp.user_id = au.id
ON CONFLICT (user_id) DO UPDATE
SET 
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    email = COALESCE(EXCLUDED.email, user_profiles.email);

-- Create seller roles
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'seller' 
FROM seller_profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Create seller data
INSERT INTO seller_data (user_id)
SELECT user_id 
FROM seller_profiles
ON CONFLICT (user_id) DO NOTHING;

-- Migrate admin profiles
INSERT INTO user_profiles (user_id, email, full_name, phone)
SELECT 
    ap.user_id,
    COALESCE(au.email, ''),
    ap.full_name,
    NULL -- admins don't have phone in old schema
FROM admin_profiles ap
JOIN auth.users au ON ap.user_id = au.id
ON CONFLICT (user_id) DO UPDATE
SET 
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    email = COALESCE(EXCLUDED.email, user_profiles.email);

-- Create admin roles
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'admin' 
FROM admin_profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Create admin data with existing permissions
INSERT INTO admin_data (user_id, admin_level, permissions)
SELECT 
    user_id,
    CASE 
        WHEN role = 'super_admin' THEN 'super_admin'
        WHEN role = 'admin' THEN 'admin'
        WHEN role = 'analyst' THEN 'analyst'
        WHEN role = 'support' THEN 'support'
        ELSE 'admin'
    END,
    COALESCE(permissions, '{}')
FROM admin_profiles
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================================
-- Create backward compatibility views
-- =====================================================================

-- Create view for investor profiles compatibility
CREATE OR REPLACE VIEW investor_profiles_compat AS
SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.phone,
    up.created_at,
    up.updated_at
FROM user_profiles up
JOIN user_roles ur ON up.user_id = ur.user_id
WHERE ur.role = 'investor' AND ur.is_active = true;

-- Create view for seller profiles compatibility
CREATE OR REPLACE VIEW seller_profiles_compat AS
SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.email,
    up.phone,
    up.created_at,
    up.updated_at
FROM user_profiles up
JOIN user_roles ur ON up.user_id = ur.user_id
WHERE ur.role = 'seller' AND ur.is_active = true;

-- Create view for admin profiles compatibility
CREATE OR REPLACE VIEW admin_profiles_compat AS
SELECT 
    up.id,
    up.user_id,
    up.full_name,
    ad.admin_level as role,
    ad.department,
    ad.permissions,
    ur.is_active,
    up.created_at,
    up.updated_at
FROM user_profiles up
JOIN user_roles ur ON up.user_id = ur.user_id
JOIN admin_data ad ON up.user_id = ad.user_id
WHERE ur.role = 'admin';

-- =====================================================================
-- Update trigger for new user registration
-- =====================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new user registration function
CREATE OR REPLACE FUNCTION public.handle_new_user_unified()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_email TEXT;
BEGIN
    -- Extract metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'investor');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_email := COALESCE(NEW.email, '');

    -- Create unified profile
    INSERT INTO public.user_profiles (user_id, email, full_name)
    VALUES (NEW.id, user_email, user_full_name)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create initial role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create role-specific data
    IF user_role = 'admin' THEN
        INSERT INTO public.admin_data (user_id, admin_level)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'admin_level', 'admin'))
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'seller' THEN
        INSERT INTO public.seller_data (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    ELSE -- Default to investor
        INSERT INTO public.investor_data (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_unified();

-- =====================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users read own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users read own roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages roles"
ON user_roles FOR ALL
TO service_role
USING (true);

-- Seller data policies
CREATE POLICY "Sellers read own data"
ON seller_data FOR SELECT
USING (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'seller' 
        AND is_active = true
    )
);

CREATE POLICY "Sellers update own data"
ON seller_data FOR UPDATE
USING (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'seller' 
        AND is_active = true
    )
);

-- Investor data policies
CREATE POLICY "Investors read own data"
ON investor_data FOR SELECT
USING (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'investor' 
        AND is_active = true
    )
);

CREATE POLICY "Investors update own data"
ON investor_data FOR UPDATE
USING (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'investor' 
        AND is_active = true
    )
);

-- Admin data policies
CREATE POLICY "Admins read own data"
ON admin_data FOR SELECT
USING (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
);

-- Admin read all profiles policy
CREATE POLICY "Admins read all profiles"
ON user_profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN admin_data ad ON ur.user_id = ad.user_id
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin' 
        AND ur.is_active = true
        AND ad.admin_level IN ('super_admin', 'admin')
    )
);

-- Session policies
CREATE POLICY "Users manage own sessions"
ON user_sessions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages all sessions"
ON user_sessions FOR ALL
TO service_role
USING (true);

-- =====================================================================
-- Helper Functions
-- =====================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(
    p_user_id UUID,
    p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = p_user_id
        AND role = p_role
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active roles
CREATE OR REPLACE FUNCTION public.get_user_roles(
    p_user_id UUID
) RETURNS TABLE(role TEXT, is_active BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.role, ur.is_active
    FROM user_roles ur
    WHERE ur.user_id = p_user_id
    ORDER BY ur.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add role to user
CREATE OR REPLACE FUNCTION public.add_user_role(
    p_user_id UUID,
    p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET is_active = true;
    
    -- Create role-specific data if needed
    IF p_role = 'seller' THEN
        INSERT INTO seller_data (user_id)
        VALUES (p_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF p_role = 'investor' THEN
        INSERT INTO investor_data (user_id)
        VALUES (p_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF p_role = 'admin' THEN
        INSERT INTO admin_data (user_id)
        VALUES (p_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_role TO authenticated;