-- Create Default Admin User for QuicklyClose
-- Run this script in your Supabase SQL Editor to create a default admin user

-- IMPORTANT: Change these credentials before running in production!
-- Default credentials:
-- Email: admin@quicklyclose.com
-- Password: Admin123!@#

-- First, we need to create the user in the auth.users table
-- Note: This uses Supabase's internal functions

DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create the admin user in auth.users
    -- You'll need to use Supabase Dashboard or API to create the user first
    -- Then run this to set up the admin profile
    
    -- Get the user ID (assuming the user was created via Supabase Auth)
    SELECT id INTO new_user_id 
    FROM auth.users 
    WHERE email = 'admin@quicklyclose.com'
    LIMIT 1;
    
    -- If user exists, create/update the admin profile
    IF new_user_id IS NOT NULL THEN
        -- Update user metadata to include admin role
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
            'role', 'admin',
            'full_name', 'QuicklyClose Admin',
            'admin_role', 'super_admin',
            'department', 'Administration'
        )
        WHERE id = new_user_id;
        
        -- Create admin profile if it doesn't exist
        INSERT INTO public.admin_profiles (
            user_id,
            full_name,
            role,
            department,
            permissions
        )
        VALUES (
            new_user_id,
            'QuicklyClose Admin',
            'super_admin',
            'Administration',
            jsonb_build_object(
                'can_manage_users', true,
                'can_manage_pricing', true,
                'can_view_all_data', true,
                'can_export_data', true
            )
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            role = 'super_admin',
            full_name = 'QuicklyClose Admin',
            department = 'Administration',
            is_active = true,
            updated_at = NOW();
            
        RAISE NOTICE 'Admin profile created/updated successfully for user ID: %', new_user_id;
    ELSE
        RAISE NOTICE 'User not found. Please create the user first using Supabase Auth.';
    END IF;
END $$;

-- Alternative: Direct user creation (requires elevated privileges)
-- This approach creates the user directly in the database
-- WARNING: Only use this for development/testing

/*
-- Uncomment and run this block if you have the necessary privileges
-- and want to create the user directly

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Insert directly into auth.users (requires special permissions)
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        aud,
        role
    )
    VALUES (
        new_user_id,
        'admin@quicklyclose.com',
        crypt('Admin123!@#', gen_salt('bf')), -- Password: Admin123!@#
        NOW(),
        jsonb_build_object(
            'role', 'admin',
            'full_name', 'QuicklyClose Admin',
            'admin_role', 'super_admin',
            'department', 'Administration'
        ),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Create admin profile
    INSERT INTO public.admin_profiles (
        user_id,
        full_name,
        role,
        department,
        permissions
    )
    VALUES (
        new_user_id,
        'QuicklyClose Admin',
        'super_admin',
        'Administration',
        jsonb_build_object(
            'can_manage_users', true,
            'can_manage_pricing', true,
            'can_view_all_data', true,
            'can_export_data', true
        )
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Admin user created successfully with email: admin@quicklyclose.com';
END $$;
*/

-- Verify the admin user was created
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data,
    ap.full_name,
    ap.role,
    ap.department,
    ap.is_active
FROM auth.users au
LEFT JOIN admin_profiles ap ON ap.user_id = au.id
WHERE au.email = 'admin@quicklyclose.com';
