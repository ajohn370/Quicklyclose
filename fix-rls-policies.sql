-- Fix RLS Policies: Update user profile creation to handle both investor and seller roles
-- Run this SQL in your Supabase SQL Editor to fix the user insertion issue

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function to handle both investor and seller profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_email TEXT;
BEGIN
    -- Extract user role from metadata, default to 'investor' if not specified
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'investor');
    
    -- Extract user information with fallbacks
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    user_email := COALESCE(NEW.email, '');

    -- Create profile based on user role
    IF user_role = 'seller' THEN
        -- Create seller profile
        INSERT INTO public.seller_profiles (
            user_id,
            full_name,
            email,
            phone,
            preferred_communication,
            marketing_consent
        )
        VALUES (
            NEW.id,
            user_full_name,
            user_email,
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            'email',
            COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
        );
        
    ELSIF user_role = 'investor' THEN
        -- Create investor profile
        INSERT INTO public.investor_profiles (
            user_id,
            full_name,
            investment_focus,
            minimum_investment,
            maximum_investment,
            preferred_locations,
            phone
        )
        VALUES (
            NEW.id,
            user_full_name,
            '{}',
            0,
            0,
            '{}',
            COALESCE(NEW.raw_user_meta_data->>'phone', '')
        );
        
    ELSIF user_role = 'admin' THEN
        -- Create both profiles for admin users
        INSERT INTO public.investor_profiles (
            user_id,
            full_name,
            investment_focus,
            minimum_investment,
            maximum_investment,
            preferred_locations,
            phone
        )
        VALUES (
            NEW.id,
            user_full_name,
            '{}',
            0,
            0,
            '{}',
            COALESCE(NEW.raw_user_meta_data->>'phone', '')
        );
        
        INSERT INTO public.seller_profiles (
            user_id,
            full_name,
            email,
            phone,
            preferred_communication,
            marketing_consent
        )
        VALUES (
            NEW.id,
            user_full_name,
            user_email,
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            'email',
            COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
        );
        
    ELSE
        -- Default case: create investor profile
        INSERT INTO public.investor_profiles (
            user_id,
            full_name,
            investment_focus,
            minimum_investment,
            maximum_investment,
            preferred_locations,
            phone
        )
        VALUES (
            NEW.id,
            user_full_name,
            '{}',
            0,
            0,
            '{}',
            COALESCE(NEW.raw_user_meta_data->>'phone', '')
        );
    END IF;

    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to be more permissive for profile creation
-- This allows users to create their initial profiles even if they don't exist yet

-- Update seller_profiles policies
DROP POLICY IF EXISTS "Users can insert own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can insert own seller profile" ON public.seller_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT user_id FROM public.seller_profiles WHERE user_id = auth.uid()
        )
    );

-- Update investor_profiles policies  
DROP POLICY IF EXISTS "Users can insert own profile" ON public.investor_profiles;
CREATE POLICY "Users can insert own profile" ON public.investor_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT user_id FROM public.investor_profiles WHERE user_id = auth.uid()
        )
    );

-- Add policies for service role to bypass RLS for admin operations
CREATE POLICY "Service role can manage all seller profiles" ON public.seller_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all investor profiles" ON public.investor_profiles  
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all properties" ON public.properties
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all leads" ON public.leads
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
