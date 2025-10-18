-- Property Images Table
-- Add this to your Supabase SQL Editor

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Create policies for property_images
CREATE POLICY "Users can view own property images" ON public.property_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own property images" ON public.property_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own property images" ON public.property_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own property images" ON public.property_images
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER on_property_images_updated
    BEFORE UPDATE ON public.property_images
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.property_images TO authenticated;
GRANT ALL ON public.property_images TO service_role;

-- Create storage bucket for property images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload property images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'property-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view property images" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Users can update own property images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'property-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own property images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'property-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );