-- Role-Based Authentication Enhancements
-- Run this SQL in your Supabase SQL Editor

-- Update the user creation trigger to handle both investor and seller profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the user role from metadata
  DECLARE
    user_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'investor');
    user_full_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  BEGIN
    -- Create investor profile if role is investor (default)
    IF user_role = 'investor' THEN
      INSERT INTO public.investor_profiles (
        user_id,
        full_name,
        investment_focus,
        minimum_investment,
        maximum_investment,
        preferred_locations
      )
      VALUES (
        NEW.id,
        user_full_name,
        '{}',
        0,
        0,
        '{}'
      );
    
    -- Create seller profile if role is seller
    ELSIF user_role = 'seller' THEN
      INSERT INTO public.seller_profiles (
        user_id,
        full_name,
        email,
        marketing_consent
      )
      VALUES (
        NEW.id,
        user_full_name,
        COALESCE(NEW.email, ''),
        false
      );
    END IF;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Drop the existing trigger and recreate with the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add indexes for better performance on role-based queries
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id ON public.investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles(user_id);

-- Ensure RLS policies are properly configured for cross-role access prevention
-- Investors should not be able to access seller data and vice versa

-- Additional policy to prevent cross-role data access
CREATE POLICY "Prevent cross-role investor access" ON public.investor_profiles
    FOR ALL USING (
        auth.uid() = user_id AND 
        auth.jwt()::jsonb->'user_metadata'->>'role' = 'investor'
    );

CREATE POLICY "Prevent cross-role seller access" ON public.seller_profiles
    FOR ALL USING (
        auth.uid() = user_id AND 
        (auth.jwt()::jsonb->'user_metadata'->>'role' = 'seller' OR 
         auth.jwt()::jsonb->'user_metadata'->>'role' IS NULL) -- fallback for existing users
    );
