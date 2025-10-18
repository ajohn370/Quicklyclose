-- Check if RLS is enabled on admin_profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'admin_profiles';

-- Check what RLS policies exist on admin_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'admin_profiles';

-- Test if we can query admin_profiles as the admin user
-- This simulates what the API is trying to do
SELECT 
    id,
    user_id,
    role,
    is_active
FROM admin_profiles
WHERE role = 'super_admin';