# Complete Admin Dashboard Fix

## Issue Summary
The admin user `admin@quicklyclose.com` can log in but cannot access the admin dashboard because they don't have a proper `admin_profiles` record in the database.

## Step-by-Step Fix

### Step 1: Run Database Fix in Supabase SQL Editor

Copy and paste this SQL script into your Supabase SQL Editor (production database):

```sql
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
```

### Step 2: Test the Fix

1. **Log out** of the current session
2. **Navigate** to https://quickly-close-app.vercel.app/admin
3. **Log in** with:
   - Email: `admin@quicklyclose.com`
   - Password: `Admin123!@#`
4. **Click** on the "Submissions" tab
5. **Verify** that property submissions are now displayed

### Step 3: Expected Results

After running the fix:
- ✅ Admin user has proper `admin_profiles` record
- ✅ AdminProtectedRoute will recognize the user as admin
- ✅ `/api/admin/properties/submissions` will return data
- ✅ Submissions tab will show property listings
- ✅ All admin dashboard features will be accessible

## Troubleshooting

### If the submissions tab is still empty after the fix:
1. **Check the browser console** for API errors
2. **Verify the database has properties** by running:
   ```sql
   SELECT COUNT(*) FROM properties;
   ```
3. **Check if sample data was inserted** by the previous fix:
   ```sql
   SELECT address, current_state, listing_price FROM properties LIMIT 5;
   ```

### If the admin still can't access:
1. **Clear browser cache** and cookies
2. **Log out and log back in**
3. **Check that the admin_profiles record exists**:
   ```sql
   SELECT * FROM admin_profiles WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'admin@quicklyclose.com'
   );
   ```

## Summary

This fix addresses the authentication issue by:
1. Ensuring the user has admin role in metadata
2. Creating a proper admin_profiles record
3. Setting up correct RLS policies
4. Granting necessary permissions

The submissions tab should now work properly with the sample data that was previously inserted.