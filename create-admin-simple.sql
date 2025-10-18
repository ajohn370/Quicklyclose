-- Simple Admin User Creation
-- Run this after creating the user in Supabase Dashboard and after running comprehensive-db-fix.sql

-- Replace 'admin@quicklyclose.com' with your actual admin email
SELECT create_admin_user('admin@quicklyclose.com', 'QuicklyClose Admin');

-- Verify the setup worked
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    au.raw_user_meta_data,
    ap.full_name,
    ap.role,
    ap.is_active,
    ap.created_at
FROM auth.users au
LEFT JOIN admin_profiles ap ON ap.user_id = au.id
WHERE au.email = 'admin@quicklyclose.com';
