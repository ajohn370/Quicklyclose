-- Final Admin Fix - Clean version without type conflicts
-- Fix admin@quicklyclose.com access to admin dashboard

-- Step 1: Update user metadata to admin role
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'admin_role', 'super_admin',
    'full_name', 'QuicklyClose Admin'
),
updated_at = NOW()
WHERE email = 'admin@quicklyclose.com';

-- Step 2: Delete any existing admin profile for this user (to avoid duplicates)
DELETE FROM admin_profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@quicklyclose.com');

-- Step 3: Insert new admin profile
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

-- Step 4: Verify user metadata was updated
SELECT 
    'User metadata updated:' as status,
    au.email,
    au.raw_user_meta_data->>'role' as user_role,
    au.raw_user_meta_data->>'admin_role' as admin_role
FROM auth.users au
WHERE au.email = 'admin@quicklyclose.com';

-- Step 5: Verify admin profile was created
SELECT 
    'Admin profile created:' as status,
    ap.full_name,
    ap.role,
    ap.is_active
FROM admin_profiles ap
JOIN auth.users au ON au.id = ap.user_id
WHERE au.email = 'admin@quicklyclose.com';

-- Step 6: Final success check
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Admin access configured! You can now access the admin dashboard.'
        ELSE 'ERROR: Admin profile not found. Please check the steps above.'
    END as final_result
FROM admin_profiles ap
JOIN auth.users au ON au.id = ap.user_id
WHERE au.email = 'admin@quicklyclose.com' AND ap.is_active = true;