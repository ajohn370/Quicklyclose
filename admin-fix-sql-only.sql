-- Fix Admin Authentication for Production
-- Ensure admin@quicklyclose.com has proper admin access

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

-- Step 3: Ensure admin_profiles table exists (create if missing)
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can view admin profiles" ON admin_profiles;
    DROP POLICY IF EXISTS "Admins can update admin profiles" ON admin_profiles;
    
    -- Create new policies
    CREATE POLICY "Admins can view admin profiles" ON admin_profiles
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM admin_profiles ap 
                WHERE ap.user_id = auth.uid() AND ap.is_active = true
            )
        );
        
    CREATE POLICY "Admins can update admin profiles" ON admin_profiles
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM admin_profiles ap 
                WHERE ap.user_id = auth.uid() AND ap.is_active = true
            )
        );
END $$;

-- Step 4: Insert/Update admin profile
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
WHERE au.email = 'admin@quicklyclose.com'
ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    permissions = EXCLUDED.permissions,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 5: Grant permissions
GRANT ALL ON admin_profiles TO authenticated;
GRANT ALL ON admin_profiles TO service_role;

-- Step 6: Verify the fix
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

-- Success message
SELECT 'Admin authentication fix complete! User should now have proper admin access.' as result;