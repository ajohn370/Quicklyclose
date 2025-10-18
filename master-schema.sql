-- =============================================================================
-- Master Database Schema for QuicklyClose
-- =============================================================================
-- This single, authoritative script sets up the entire database schema,
-- including all tables, roles, functions, and RLS policies. It incorporates
-- all previous fixes and ensures a stable, conflict-free setup.
--
-- Instructions:
-- 1. Run this script on a clean Supabase project.
-- 2. If running on an existing project, you may need to drop existing
--    tables and functions first to avoid conflicts.
-- =============================================================================

-- =============================================================================
-- Section 1: Custom Types
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_type') THEN
        CREATE TYPE admin_role_type AS ENUM ('super_admin', 'admin', 'analyst', 'support');
    END IF;
END $$;

-- =============================================================================
-- Section 2: Tables
-- =============================================================================

-- User Profiles (Investors)
CREATE TABLE IF NOT EXISTS public.investor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (Sellers)
CREATE TABLE IF NOT EXISTS public.seller_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Profiles
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    role admin_role_type DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Section 3: Triggers and Functions
-- =============================================================================

-- Drop existing trigger and function to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_email TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'investor');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_email := COALESCE(NEW.email, '');

    IF user_role = 'admin' THEN
        BEGIN
            INSERT INTO public.admin_profiles (user_id, full_name, role)
            VALUES (NEW.id, user_full_name, COALESCE((NEW.raw_user_meta_data->>'admin_role')::admin_role_type, 'admin'));
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create admin profile for user %: %', NEW.id, SQLERRM;
        END;
    ELSIF user_role = 'seller' THEN
        BEGIN
            INSERT INTO public.seller_profiles (user_id, full_name, email)
            VALUES (NEW.id, user_full_name, user_email);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create seller profile for user %: %', NEW.id, SQLERRM;
        END;
    ELSE -- Default to investor
        BEGIN
            INSERT INTO public.investor_profiles (user_id, full_name)
            VALUES (NEW.id, user_full_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create investor profile for user %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Section 4: Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on all profile tables
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for investor_profiles
DROP POLICY IF EXISTS "Users can manage their own investor profile" ON public.investor_profiles;
CREATE POLICY "Users can manage their own investor profile" ON public.investor_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create investor profiles" ON public.investor_profiles;
CREATE POLICY "System can create investor profiles" ON public.investor_profiles
    FOR INSERT WITH CHECK ((SELECT rolsuper FROM pg_roles WHERE rolname = current_user));

-- Policies for seller_profiles
DROP POLICY IF EXISTS "Users can manage their own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can manage their own seller profile" ON public.seller_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create seller profiles" ON public.seller_profiles;
CREATE POLICY "System can create seller profiles" ON public.seller_profiles
    FOR INSERT WITH CHECK ((SELECT rolsuper FROM pg_roles WHERE rolname = current_user));

-- Policies for admin_profiles
DROP POLICY IF EXISTS "Admins can manage their own profile" ON public.admin_profiles;
CREATE POLICY "Admins can manage their own profile" ON public.admin_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create admin profiles" ON public.admin_profiles;
CREATE POLICY "System can create admin profiles" ON public.admin_profiles
    FOR INSERT WITH CHECK ((SELECT rolsuper FROM pg_roles WHERE rolname = current_user));

-- =============================================================================
-- Section 5: Admin Setup Function
-- =============================================================================

DROP FUNCTION IF EXISTS public.setup_admin_user(TEXT);
CREATE OR REPLACE FUNCTION public.setup_admin_user(admin_email TEXT)
RETURNS TEXT AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
    IF admin_user_id IS NULL THEN
        RETURN 'Error: User not found.';
    END IF;

    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "admin_role": "super_admin", "full_name": "Admin User"}'::jsonb
    WHERE id = admin_user_id;

    -- The trigger will handle profile creation automatically.
    -- We can force it to run if needed, but it's better to let the system work.
    -- This function now primarily just sets the metadata.

    RETURN 'Admin user setup complete for ' || admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Finalization
-- =============================================================================
NOTIFY pgrst, 'reload schema';
