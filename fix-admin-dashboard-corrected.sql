-- Fix Admin Dashboard Seller Submissions Tab - CORRECTED VERSION
-- This script adds missing fields and sample data to make the seller submissions tab work

-- Step 1: Add missing columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_price DECIMAL(12,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE properties ADD COLUMN IF NOT EXISTS current_state TEXT DEFAULT 'submitted';

-- Step 2: Update existing properties with default values
UPDATE properties 
SET 
    listing_price = COALESCE(listing_price, asking_price, 0),
    submitted_at = COALESCE(submitted_at, created_at),
    current_state = COALESCE(current_state, 'submitted')
WHERE listing_price IS NULL OR submitted_at IS NULL OR current_state IS NULL;

-- Step 3: Create state_transitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS state_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    previous_state TEXT,
    new_state TEXT,
    triggered_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_listing_price ON properties(listing_price);
CREATE INDEX IF NOT EXISTS idx_properties_confidence_score ON properties(confidence_score);
CREATE INDEX IF NOT EXISTS idx_properties_submitted_at ON properties(submitted_at);
CREATE INDEX IF NOT EXISTS idx_properties_current_state ON properties(current_state);
CREATE INDEX IF NOT EXISTS idx_state_transitions_property_id ON state_transitions(property_id);

-- Step 5: Enable RLS for state_transitions
ALTER TABLE state_transitions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies if they don't exist
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can view all state transitions" ON state_transitions;
    DROP POLICY IF EXISTS "Sellers can view their property state transitions" ON state_transitions;
    
    -- Create new policies
    CREATE POLICY "Admins can view all state transitions" ON state_transitions
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM admin_profiles 
                WHERE admin_profiles.user_id = auth.uid() 
                AND admin_profiles.is_active = true
            )
        );

    CREATE POLICY "Sellers can view their property state transitions" ON state_transitions
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM properties p
                JOIN seller_profiles sp ON p.seller_id = sp.id
                WHERE p.id = state_transitions.property_id
                AND sp.user_id = auth.uid()
            )
        );
END $$;

-- Step 7: Grant permissions
GRANT ALL ON state_transitions TO authenticated;
GRANT ALL ON state_transitions TO service_role;

-- Step 8: Insert sample data for testing (only if no properties exist)
DO $$
DECLARE
    v_seller_id UUID;
    v_admin_id UUID;
BEGIN
    -- Get a seller ID (create one if none exists)
    SELECT id INTO v_seller_id FROM seller_profiles LIMIT 1;
    
    -- If no seller exists, check if there's a user we can use
    IF v_seller_id IS NULL THEN
        -- Get any authenticated user
        SELECT id INTO v_seller_id FROM auth.users WHERE email IS NOT NULL LIMIT 1;
        
        -- Create a seller profile for this user if we found one
        IF v_seller_id IS NOT NULL THEN
            INSERT INTO seller_profiles (id, user_id, full_name, email, phone, created_at)
            VALUES (
                gen_random_uuid(),
                v_seller_id,
                'Sample Seller',
                (SELECT email FROM auth.users WHERE id = v_seller_id),
                '555-0100',
                NOW()
            )
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_seller_id;
        END IF;
    END IF;
    
    -- Get an admin user ID
    SELECT user_id INTO v_admin_id FROM admin_profiles WHERE is_active = true LIMIT 1;
    
    -- Only insert sample properties if we have a seller and there are no properties
    IF v_seller_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM properties LIMIT 1) THEN
        -- Insert sample properties with different states
        INSERT INTO properties (
            seller_id, address, city, state, zip_code,
            bedrooms, bathrooms, square_feet,
            property_type, year_built, description,
            asking_price, listing_price, status,
            current_state, confidence_score, submitted_at
        ) VALUES 
        (
            v_seller_id, '123 Main Street', 'Los Angeles', 'CA', '90001',
            3, 2.0, 1500, 'single_family', 1985,
            'Beautiful single family home in quiet neighborhood',
            450000, 450000, 'active', 'submitted', NULL, NOW() - INTERVAL '2 days'
        ),
        (
            v_seller_id, '456 Oak Avenue', 'San Francisco', 'CA', '94102',
            2, 1.5, 1200, 'condo', 2005,
            'Modern condo with city views',
            650000, 650000, 'active', 'under_review', 85, NOW() - INTERVAL '3 days'
        ),
        (
            v_seller_id, '789 Pine Road', 'San Diego', 'CA', '92101',
            4, 3.0, 2200, 'single_family', 1995,
            'Spacious family home with pool',
            750000, 750000, 'active', 'analysis_pending', NULL, NOW() - INTERVAL '1 day'
        ),
        (
            v_seller_id, '321 Elm Street', 'Sacramento', 'CA', '95814',
            3, 2.5, 1800, 'townhouse', 2010,
            'Modern townhouse in downtown',
            520000, 520000, 'active', 'analysis_completed', 95, NOW() - INTERVAL '5 days'
        ),
        (
            v_seller_id, '654 Maple Drive', 'Oakland', 'CA', '94601',
            2, 1.0, 950, 'condo', 1975,
            'Cozy condo near BART station',
            380000, 380000, 'active', 'pricing_review', 88, NOW() - INTERVAL '7 days'
        );
        
        -- Add sample state transitions if we have an admin user
        IF v_admin_id IS NOT NULL THEN
            INSERT INTO state_transitions (property_id, previous_state, new_state, triggered_by, reason)
            SELECT 
                id, 
                'submitted', 
                current_state,
                v_admin_id,
                'Initial review'
            FROM properties 
            WHERE current_state != 'submitted';
        END IF;
        
        RAISE NOTICE 'Sample data inserted successfully';
    ELSIF v_seller_id IS NULL THEN
        RAISE NOTICE 'No seller profiles found. Please create a seller profile first.';
    ELSE
        RAISE NOTICE 'Properties already exist. Skipping sample data insertion.';
    END IF;
END $$;

-- Step 9: Verify the changes
SELECT 
    'Properties Table' as check_item,
    COUNT(*) as count,
    COUNT(DISTINCT current_state) as unique_states,
    COUNT(listing_price) as has_listing_price,
    COUNT(confidence_score) as has_confidence_score
FROM properties

UNION ALL

SELECT 
    'State Transitions' as check_item,
    COUNT(*) as count,
    COUNT(DISTINCT new_state) as unique_states,
    0 as has_listing_price,
    0 as has_confidence_score
FROM state_transitions

UNION ALL

SELECT 
    'Seller Profiles' as check_item,
    COUNT(*) as count,
    0 as unique_states,
    0 as has_listing_price,
    0 as has_confidence_score
FROM seller_profiles;

-- Display sample properties for verification
SELECT 
    p.id,
    p.address || ', ' || p.city || ', ' || p.state as full_address,
    p.current_state,
    p.listing_price,
    p.confidence_score,
    p.submitted_at,
    sp.full_name as seller_name,
    sp.email as seller_email
FROM properties p
LEFT JOIN seller_profiles sp ON p.seller_id = sp.id
ORDER BY p.submitted_at DESC
LIMIT 5;