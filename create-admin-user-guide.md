# Creating a Default Admin User for QuicklyClose

## Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to Authentication > Users

2. **Create a new user**
   - Click "Invite user" or "Add user"
   - Use these credentials:
     - Email: `admin@quicklyclose.com`
     - Password: `Admin123!@#` (change this in production!)

3. **Run the SQL script**
   - Go to SQL Editor in Supabase
   - Run this script to set up the admin profile:

```sql
-- Set up admin profile for the created user
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@quicklyclose.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Update user metadata
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
            'role', 'admin',
            'full_name', 'QuicklyClose Admin',
            'admin_role', 'super_admin',
            'department', 'Administration'
        ),
        updated_at = NOW()
        WHERE id = admin_user_id;
        
        -- Create admin profile
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
            'QuicklyClose Admin',
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
            full_name = 'QuicklyClose Admin',
            department = 'Administration',
            is_active = true,
            updated_at = NOW();
            
        RAISE NOTICE 'Admin profile created successfully!';
    ELSE
        RAISE EXCEPTION 'User not found. Please create the user first.';
    END IF;
END $$;

-- Verify the admin was created
SELECT 
    au.email,
    ap.full_name,
    ap.role,
    ap.is_active
FROM auth.users au
JOIN admin_profiles ap ON ap.user_id = au.id
WHERE au.email = 'admin@quicklyclose.com';
```

## Method 2: Using Supabase Client (JavaScript)

If you prefer to create the user programmatically, you can use this approach:

```javascript
// Run this in a Node.js environment or browser console
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY' // Use service role key for admin operations
)

async function createAdminUser() {
  // Create the user
  const { data: user, error: signUpError } = await supabase.auth.admin.createUser({
    email: 'admin@quicklyclose.com',
    password: 'Admin123!@#',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name: 'QuicklyClose Admin',
      admin_role: 'super_admin',
      department: 'Administration'
    }
  })

  if (signUpError) {
    console.error('Error creating user:', signUpError)
    return
  }

  console.log('Admin user created:', user)
  
  // The admin profile will be created automatically by the trigger
}

createAdminUser()
```

## Default Admin Credentials

- **Email**: `admin@quicklyclose.com`
- **Password**: `Admin123!@#`

⚠️ **IMPORTANT**: Change these credentials immediately after first login in production!

## Testing the Admin Login

1. Navigate to `/admin` in your QuicklyClose application
2. Click "Sign In"
3. Use the admin credentials above
4. You should be redirected to the admin dashboard

## Troubleshooting

If the admin user creation fails:

1. **Check if the user already exists**:
   ```sql
   SELECT * FROM auth.users WHERE email = 'admin@quicklyclose.com';
   ```

2. **Check if the admin profile exists**:
   ```sql
   SELECT * FROM admin_profiles WHERE user_id IN (
     SELECT id FROM auth.users WHERE email = 'admin@quicklyclose.com'
   );
   ```

3. **Delete existing user if needed** (be careful!):
   ```sql
   DELETE FROM auth.users WHERE email = 'admin@quicklyclose.com';
   ```

4. **Make sure the admin schema is properly set up**:
   - Run the `supabase-admin-schema.sql` file first
   - Ensure all tables and triggers are created

## Security Notes

1. Always change the default password immediately after creation
2. Use strong, unique passwords in production
3. Consider implementing 2FA for admin accounts
4. Regularly audit admin access logs
5. Limit the number of super_admin accounts
