-- Quick Admin User Setup
-- Run this after creating the user in Supabase Dashboard

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
        -- Update user metadata to mark as admin
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
            'role', 'admin',
            'full_name', 'QuicklyClose Admin',
            'admin_role', 'super_admin',
            'department', 'Administration'
        ),
        updated_at = NOW()
        WHERE id = admin_user_id;
        
        -- Create admin profile (this may already exist due to triggers)
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
            
        RAISE NOTICE 'Admin profile created/updated successfully for user: %', admin_user_id;
    ELSE
        RAISE EXCEPTION 'User with email admin@quicklyclose.com not found. Please create the user first in Authentication > Users.';
    END IF;
END $$;

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
