-- Comprehensive Database Fix: Combines RLS Policy Fix + Admin System
-- This replaces both fix-rls-policies.sql and integrates with admin schema
-- Run this SQL in your Supabase SQL Editor

-- First, ensure admin schema types exist
DO $$ 
BEGIN
    -- Create admin role type if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_type') THEN
        CREATE TYPE admin_role_type AS ENUM ('super_admin', 'admin', 'analyst', 'support');
    END IF;
END $$;

-- Drop existing conflicting triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_admin_user();

-- Create comprehensive user profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_email TEXT;
    admin_role_val admin_role_type;
BEGIN
    -- Extract user role from metadata, default to 'investor' if not specified
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'investor');
    
    -- Extract user information with fallbacks
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    user_email := COALESCE(NEW.email, '');

    -- Create profile based on user role
    IF user_role = 'seller' THEN
        BEGIN
            INSERT INTO public.seller_profiles (user_id, full_name, email, phone, preferred_communication, marketing_consent)
            VALUES (NEW.id, user_full_name, user_email, COALESCE(NEW.raw_user_meta_data->>'phone', ''), 'email', COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false));
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create seller profile for user_id %: %', NEW.id, SQLERRM;
        END;
        
    ELSIF user_role = 'investor' THEN
        BEGIN
            INSERT INTO public.investor_profiles (user_id, full_name, investment_focus, minimum_investment, maximum_investment, preferred_locations, phone)
            VALUES (NEW.id, user_full_name, '{}', 0, 0, '{}', COALESCE(NEW.raw_user_meta_data->>'phone', ''));
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create investor profile for user_id %: %', NEW.id, SQLERRM;
        END;
        
    ELSIF user_role = 'admin' THEN
        BEGIN
            admin_role_val := COALESCE((NEW.raw_user_meta_data->>'admin_role')::admin_role_type, 'admin');
            
            INSERT INTO public.admin_profiles (user_id, full_name, role, department, permissions, is_active)
            VALUES (NEW.id, user_full_name, admin_role_val, COALESCE(NEW.raw_user_meta_data->>'department', 'Administration'),
                    COALESCE(NEW.raw_user_meta_data->'permissions', CASE admin_role_val WHEN 'super_admin' THEN jsonb_build_object('can_manage_users', true, 'can_manage_pricing', true, 'can_view_all_data', true, 'can_export_data', true) ELSE jsonb_build_object('can_manage_users', false, 'can_manage_pricing', true, 'can_view_all_data', true, 'can_export_data', false) END), true);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create admin profile for user_id %: %', NEW.id, SQLERRM;
        END;
        
        BEGIN
            INSERT INTO public.investor_profiles (user_id, full_name, investment_focus, minimum_investment, maximum_investment, preferred_locations, phone)
            VALUES (NEW.id, user_full_name, '{}', 0, 0, '{}', COALESCE(NEW.raw_user_meta_data->>'phone', ''));
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create investor profile (for admin) for user_id %: %', NEW.id, SQLERRM;
        END;
        
        BEGIN
            INSERT INTO public.seller_profiles (user_id, full_name, email, phone, preferred_communication, marketing_consent)
            VALUES (NEW.id, user_full_name, user_email, COALESCE(NEW.raw_user_meta_data->>'phone', ''), 'email', false);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create seller profile (for admin) for user_id %: %', NEW.id, SQLERRM;
        END;
        
    ELSE
        BEGIN
            INSERT INTO public.investor_profiles (user_id, full_name, investment_focus, minimum_investment, maximum_investment, preferred_locations, phone)
            VALUES (NEW.id, user_full_name, '{}', 0, 0, '{}', COALESCE(NEW.raw_user_meta_data->>'phone', ''));
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not create default investor profile for user_id %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to allow SECURITY DEFINER functions to work
-- Seller profiles policies
DROP POLICY IF EXISTS "Users can insert own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can insert own seller profile" ON public.seller_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id OR (SELECT rolsuper FROM pg_roles WHERE rolname = current_user));

-- Investor profiles policies  
DROP POLICY IF EXISTS "Users can insert own profile" ON public.investor_profiles;
CREATE POLICY "Users can insert own profile" ON public.investor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id OR (SELECT rolsuper FROM pg_roles WHERE rolname = current_user));

-- Add service role policies for bypassing RLS
DROP POLICY IF EXISTS "Service role can manage all seller profiles" ON public.seller_profiles;
CREATE POLICY "Service role can manage all seller profiles" ON public.seller_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all investor profiles" ON public.investor_profiles;
CREATE POLICY "Service role can manage all investor profiles" ON public.investor_profiles  
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Only create these policies if the tables exist
DO $$
BEGIN
    -- Check if properties table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'properties') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Service role can manage all properties" ON public.properties;';
        EXECUTE 'CREATE POLICY "Service role can manage all properties" ON public.properties
            FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
    END IF;
    
    -- Check if leads table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Service role can manage all leads" ON public.leads;';
        EXECUTE 'CREATE POLICY "Service role can manage all leads" ON public.leads
            FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
    END IF;
    
    -- Check if admin_profiles table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_profiles') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Service role can manage all admin profiles" ON public.admin_profiles;';
        EXECUTE 'CREATE POLICY "Service role can manage all admin profiles" ON public.admin_profiles
            FOR ALL USING (auth.jwt() ->> ''role'' = ''service_role'')';
            
        EXECUTE 'DROP POLICY IF EXISTS "Admins can insert their own profile" ON public.admin_profiles;';
        EXECUTE 'CREATE POLICY "Admins can insert their own profile" ON public.admin_profiles
            FOR INSERT WITH CHECK (user_id = auth.uid() OR (SELECT rolsuper FROM pg_roles WHERE rolname = current_user))';
    END IF;

    -- Check if admin_activity_log table exists and add insert policy
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_activity_log') THEN
        EXECUTE 'DROP POLICY IF EXISTS "System can insert into activity log" ON public.admin_activity_log;';
        EXECUTE 'CREATE POLICY "System can insert into activity log" ON public.admin_activity_log
            FOR INSERT WITH CHECK ((SELECT rolsuper FROM pg_roles WHERE rolname = current_user))';
    END IF;
END $$;

-- Quick admin user setup function (replaces quick-admin-setup.sql functionality)
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT, admin_name TEXT DEFAULT 'QuicklyClose Admin')
RETURNS TEXT AS $$
DECLARE
    admin_user_id UUID;
    result_message TEXT;
BEGIN
    -- Get the user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Update user metadata to mark as admin
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
            'role', 'admin',
            'full_name', admin_name,
            'admin_role', 'super_admin',
            'department', 'Administration'
        ),
        updated_at = NOW()
        WHERE id = admin_user_id;
        
        -- Create/update admin profile (with conflict resolution)
        INSERT INTO public.admin_profiles (
            user_id,
            full_name,
            role,
            department,
            permissions,
            is_active
        )
        VALUES (
            admin_user_id,
            admin_name,
            'super_admin',
            'Administration',
            jsonb_build_object(
                'can_manage_users', true,
                'can_manage_pricing', true,
                'can_view_all_data', true,
                'can_export_data', true
            ),
            true
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            role = 'super_admin',
            full_name = admin_name,
            department = 'Administration',
            is_active = true,
            updated_at = NOW();
            
        result_message := 'Admin profile created/updated successfully for user: ' || admin_user_id;
    ELSE
        result_message := 'ERROR: User with email ' || admin_email || ' not found. Please create the user first in Authentication > Users.';
    END IF;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Usage example (commented out - uncomment and modify email as needed):
-- SELECT create_admin_user('admin@quicklyclose.com', 'QuicklyClose Admin');
