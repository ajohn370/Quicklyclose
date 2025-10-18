-- First, check if the admin user exists
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'admin@quicklyclose.com';

-- Check if admin profile exists
SELECT * FROM admin_profiles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@quicklyclose.com'
);

-- If no admin profile exists, create one
-- Replace 'YOUR_ADMIN_USER_ID' with the actual ID from the first query
INSERT INTO admin_profiles (
  user_id,
  full_name,
  role,
  permissions,
  is_active
) 
SELECT 
  id as user_id,
  'QuicklyClose Admin' as full_name,
  'super_admin' as role,
  '["all"]'::jsonb as permissions,
  true as is_active
FROM auth.users 
WHERE email = 'admin@quicklyclose.com'
  AND NOT EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE user_id = auth.users.id
  );

-- Verify the admin profile was created
SELECT * FROM admin_profiles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@quicklyclose.com'
);