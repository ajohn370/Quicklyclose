-- Admin Profiles Table for QuicklyClose Admin Management System
-- Run this in your Supabase SQL Editor to create the missing admin_profiles table

-- Create the admin_profiles table
CREATE TABLE public.admin_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name text NOT NULL,
    role text NOT NULL DEFAULT 'admin',
    department text DEFAULT 'Administration',
    permissions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add constraints for role validation
ALTER TABLE public.admin_profiles 
ADD CONSTRAINT admin_profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'analyst', 'support'));

-- Create indexes for better performance
CREATE INDEX idx_admin_profiles_user_id ON public.admin_profiles(user_id);
CREATE INDEX idx_admin_profiles_role ON public.admin_profiles(role);
CREATE INDEX idx_admin_profiles_is_active ON public.admin_profiles(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_profiles_updated_at
    BEFORE UPDATE ON public.admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow service role to read/write all records (for API operations)
CREATE POLICY "Service role can manage all admin profiles"
ON public.admin_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read their own admin profile"
ON public.admin_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow super_admin to read all profiles
CREATE POLICY "Super admins can read all admin profiles"
ON public.admin_profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_profiles ap
        WHERE ap.user_id = auth.uid() 
        AND ap.role = 'super_admin' 
        AND ap.is_active = true
    )
);

-- Comment on table and columns
COMMENT ON TABLE public.admin_profiles IS 'Administrator user profiles and permissions for QuicklyClose admin panel';
COMMENT ON COLUMN public.admin_profiles.id IS 'Unique identifier for the admin profile';
COMMENT ON COLUMN public.admin_profiles.user_id IS 'Reference to auth.users table';
COMMENT ON COLUMN public.admin_profiles.full_name IS 'Full display name of the administrator';
COMMENT ON COLUMN public.admin_profiles.role IS 'Admin role: super_admin, admin, analyst, or support';
COMMENT ON COLUMN public.admin_profiles.department IS 'Department or team the admin belongs to';
COMMENT ON COLUMN public.admin_profiles.permissions IS 'JSON object containing specific permissions';
COMMENT ON COLUMN public.admin_profiles.is_active IS 'Whether the admin account is currently active';