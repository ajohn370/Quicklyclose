-- Fix RLS policies for admin_profiles table

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admin_profiles;

-- Create new, simpler policies without recursion

-- Policy 1: Users can read their own admin profile
CREATE POLICY "Users can read own admin profile" 
ON public.admin_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can update their own admin profile
CREATE POLICY "Users can update own admin profile" 
ON public.admin_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy 3: Service role can do everything (for admin management)
-- This is handled automatically by service role key, no policy needed

-- Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'admin_profiles';