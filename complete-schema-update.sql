-- =============================================================================
-- Complete Schema Update for QuicklyClose n8n Integration
-- =============================================================================
-- Run this in your Supabase SQL Editor to add property images support
-- and ensure all required tables exist

-- First, let's ensure we have the properties table with proper structure
-- (This will not affect existing data if table already exists)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    bedrooms INTEGER,
    bathrooms DECIMAL,
    sqft INTEGER,
    property_type TEXT,
    description TEXT,
    estimated_value INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on properties if not already enabled
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create properties policies if they don't exist
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'properties' AND policyname = 'Users can view own properties'
    ) THEN
        CREATE POLICY "Users can view own properties" ON public.properties
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'properties' AND policyname = 'Users can insert own properties'
    ) THEN
        CREATE POLICY "Users can insert own properties" ON public.properties
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'properties' AND policyname = 'Users can update own properties'
    ) THEN
        CREATE POLICY "Users can update own properties" ON public.properties
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create property_images table
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    public_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security on property_images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Create policies for property_images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_images' AND policyname = 'Users can view own property images'
    ) THEN
        CREATE POLICY "Users can view own property images" ON public.property_images
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_images' AND policyname = 'Users can insert own property images'
    ) THEN
        CREATE POLICY "Users can insert own property images" ON public.property_images
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_images' AND policyname = 'Users can update own property images'
    ) THEN
        CREATE POLICY "Users can update own property images" ON public.property_images
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_images' AND policyname = 'Users can delete own property images'
    ) THEN
        CREATE POLICY "Users can delete own property images" ON public.property_images
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create updated_at trigger for property_images if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_property_images_updated'
    ) THEN
        CREATE TRIGGER on_property_images_updated
            BEFORE UPDATE ON public.property_images
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
GRANT ALL ON public.property_images TO authenticated;
GRANT ALL ON public.property_images TO service_role;

-- =============================================================================
-- Storage Setup for Property Images
-- =============================================================================

-- Create storage bucket for property images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'property-images', 
    'property-images', 
    true, 
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Create storage policies for property images
DO $$
BEGIN
    -- Policy for uploading images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' 
        AND policyname = 'Users can upload property images'
    ) THEN
        CREATE POLICY "Users can upload property images" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'property-images' AND
                auth.uid() IS NOT NULL
            );
    END IF;

    -- Policy for viewing images (public access)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' 
        AND policyname = 'Anyone can view property images'
    ) THEN
        CREATE POLICY "Anyone can view property images" ON storage.objects
            FOR SELECT USING (bucket_id = 'property-images');
    END IF;

    -- Policy for updating own images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' 
        AND policyname = 'Users can update own property images'
    ) THEN
        CREATE POLICY "Users can update own property images" ON storage.objects
            FOR UPDATE USING (
                bucket_id = 'property-images' AND
                auth.uid() IS NOT NULL
            );
    END IF;

    -- Policy for deleting own images
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' 
        AND policyname = 'Users can delete own property images'
    ) THEN
        CREATE POLICY "Users can delete own property images" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'property-images' AND
                auth.uid() IS NOT NULL
            );
    END IF;
END $$;

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_user_id ON public.property_images(user_id);
CREATE INDEX IF NOT EXISTS idx_property_images_created_at ON public.property_images(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);

-- =============================================================================
-- Completion Message
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Schema update completed successfully!';
    RAISE NOTICE 'Tables created/updated:';
    RAISE NOTICE '  - properties (with RLS policies)';
    RAISE NOTICE '  - property_images (with RLS policies)';
    RAISE NOTICE '  - storage bucket: property-images';
    RAISE NOTICE '  - storage policies for image access';
    RAISE NOTICE '  - performance indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test image upload functionality';
    RAISE NOTICE '  2. Activate n8n workflow';
    RAISE NOTICE '  3. Test end-to-end analysis flow';
END $$;