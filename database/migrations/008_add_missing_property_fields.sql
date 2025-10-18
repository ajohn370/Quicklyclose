-- Add missing fields to properties table for admin dashboard
-- This migration adds fields that the admin dashboard expects

-- Add listing_price column (rename from asking_price or create new)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_price DECIMAL(12,2);

-- If asking_price exists, copy data to listing_price
UPDATE properties SET listing_price = asking_price WHERE listing_price IS NULL AND asking_price IS NOT NULL;

-- Add confidence_score column for property-level confidence
ALTER TABLE properties ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Add submitted_at timestamp (using created_at as fallback)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Copy existing created_at to submitted_at for existing records
UPDATE properties SET submitted_at = created_at WHERE submitted_at IS NULL;

-- Create state_transitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS state_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    previous_state TEXT,
    new_state TEXT,
    triggered_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_listing_price ON properties(listing_price);
CREATE INDEX IF NOT EXISTS idx_properties_confidence_score ON properties(confidence_score);
CREATE INDEX IF NOT EXISTS idx_properties_submitted_at ON properties(submitted_at);
CREATE INDEX IF NOT EXISTS idx_state_transitions_property_id ON state_transitions(property_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_created_at ON state_transitions(created_at DESC);

-- Enable RLS for state_transitions
ALTER TABLE state_transitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin access to state_transitions
CREATE POLICY "Admins can view all state transitions" ON state_transitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_profiles 
            WHERE admin_profiles.user_id = auth.uid() 
            AND admin_profiles.is_active = true
        )
    );

-- Create RLS policy for sellers to view their property state transitions
CREATE POLICY "Sellers can view their property state transitions" ON state_transitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM properties p
            JOIN seller_profiles sp ON p.seller_id = sp.id
            WHERE p.id = state_transitions.property_id
            AND sp.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON state_transitions TO authenticated;
GRANT ALL ON state_transitions TO service_role;