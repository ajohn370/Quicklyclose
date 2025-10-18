-- Simple Admin Fix - No ON CONFLICT needed
-- Fix admin@quicklyclose.com access to admin dashboard

-- Step 1: Check current status
SELECT 
    'Current Status' as check_type,
    au.id,
    au.email,
    au.raw_user_meta_data->>'role' as user_role,
    au.confirmed_at IS NOT NULL as email_confirmed
FROM auth.users au
WHERE au.email = 'admin@quicklyclose.com';

-- Step 2: Update user metadata to admin role
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'admin_role', 'super_admin',
    'full_name', 'QuicklyClose Admin'
),
updated_at = NOW()
WHERE email = 'admin@quicklyclose.com';

-- Step 3: Check if admin_profiles table exists
SELECT 
    'Table Check' as check_type,
    table_name,
    table_schema,
    'exists' as status
FROM information_schema.tables 
WHERE table_name = 'admin_profiles' AND table_schema = 'public';

-- Step 4: Delete any existing admin profile for this user (to avoid duplicates)
DELETE FROM admin_profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@quicklyclose.com');

-- Step 5: Insert new admin profile
INSERT INTO admin_profiles (
    user_id,
    full_name,
    role,
    department,
    permissions,
    is_active
)
SELECT 
    au.id,
    'QuicklyClose Admin',
    'super_admin',
    'Administration',
    '{
        "properties.view": true,
        "properties.edit": true,
        "properties.delete": true,
        "users.view": true,
        "users.edit": true,
        "system.admin": true,
        "pricing.manage": true,
        "reports.view": true,
        "admin.dashboard": true
    }'::jsonb,
    true
FROM auth.users au
WHERE au.email = 'admin@quicklyclose.com';

-- Step 6: Verify the fix worked
SELECT 
    'After Fix - User' as check_type,
    au.id,
    au.email,
    au.raw_user_meta_data->>'role' as user_role,
    au.raw_user_meta_data->>'admin_role' as admin_role
FROM auth.users au
WHERE au.email = 'admin@quicklyclose.com'

UNION ALL

SELECT 
    'After Fix - Admin Profile' as check_type,
    ap.id::text,
    ap.full_name,
    ap.role,
    ap.is_active::text
FROM admin_profiles ap
JOIN auth.users au ON au.id = ap.user_id
WHERE au.email = 'admin@quicklyclose.com';

-- Final verification - check if we can find the admin profile
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Admin profile created successfully!'
        ELSE 'ERROR: Admin profile not found'
    END as result
FROM admin_profiles ap
JOIN auth.users au ON au.id = ap.user_id
WHERE au.email = 'admin@quicklyclose.com' AND ap.is_active = true;