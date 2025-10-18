-- QuicklyClose Supabase Schema
-- Run this SQL in your Supabase SQL Editor

-- Create investor_profiles table
CREATE TABLE public.investor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    investment_focus TEXT[] DEFAULT '{}',
    minimum_investment INTEGER DEFAULT 0,
    maximum_investment INTEGER DEFAULT 0,
    preferred_locations TEXT[] DEFAULT '{}',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for investor_profiles
CREATE POLICY "Users can view own profile" ON public.investor_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.investor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.investor_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER on_investor_profiles_updated
    BEFORE UPDATE ON public.investor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;

-- Function to automatically create investor profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '{}',
    0,
    0,
    '{}'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Trigger to automatically create investor profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create seller_profiles table
CREATE TABLE public.seller_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    preferred_communication TEXT DEFAULT 'email' CHECK (preferred_communication IN ('email', 'phone', 'both')),
    marketing_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for seller_profiles
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for seller_profiles
CREATE POLICY "Users can view own seller profile" ON public.seller_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seller profile" ON public.seller_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seller profile" ON public.seller_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp for seller_profiles
CREATE TRIGGER on_seller_profiles_updated
    BEFORE UPDATE ON public.seller_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions for seller_profiles
GRANT ALL ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;

-- Create properties table to store property listings
CREATE TABLE public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    lot_size DECIMAL(10,2),
    property_type TEXT DEFAULT 'single_family' CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial')),
    year_built INTEGER,
    description TEXT,
    asking_price DECIMAL(12,2),
    estimated_value DECIMAL(12,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'withdrawn')),
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies for properties
CREATE POLICY "Sellers can view own properties" ON public.properties
    FOR SELECT USING (
        seller_id IN (
            SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can view active properties" ON public.properties
    FOR SELECT USING (status = 'active');

CREATE POLICY "Sellers can insert own properties" ON public.properties
    FOR INSERT WITH CHECK (
        seller_id IN (
            SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can update own properties" ON public.properties
    FOR UPDATE USING (
        seller_id IN (
            SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()
        )
    );

-- Create trigger to automatically update updated_at timestamp for properties
CREATE TRIGGER on_properties_updated
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions for properties
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

-- Create leads table to track seller inquiries
CREATE TABLE public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE NOT NULL,
    investor_id UUID REFERENCES public.investor_profiles(id) ON DELETE SET NULL,
    lead_source TEXT DEFAULT 'website' CHECK (lead_source IN ('website', 'referral', 'advertisement', 'direct')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'scheduled', 'evaluated', 'offer_made', 'accepted', 'rejected', 'closed')),
    contact_method TEXT CHECK (contact_method IN ('email', 'phone', 'text')),
    notes TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Sellers can view own leads" ON public.leads
    FOR SELECT USING (
        seller_id IN (
            SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Investors can view assigned leads" ON public.leads
    FOR SELECT USING (
        investor_id IN (
            SELECT id FROM public.investor_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create leads" ON public.leads
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Investors can update assigned leads" ON public.leads
    FOR UPDATE USING (
        investor_id IN (
            SELECT id FROM public.investor_profiles WHERE user_id = auth.uid()
        )
    );

-- Create trigger to automatically update updated_at timestamp for leads
CREATE TRIGGER on_leads_updated
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions for leads
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;