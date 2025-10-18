-- Sample data for testing the admin dashboard seller submissions tab
-- This script creates sample sellers and properties with various states

-- First, ensure we have some seller profiles
-- Note: These users need to exist in auth.users first, or we use existing ones

-- Insert sample properties with different states
-- We'll use a subquery to get an existing seller_id from the database
INSERT INTO properties (
    seller_id,
    address,
    city,
    state,
    zip_code,
    bedrooms,
    bathrooms,
    square_feet,
    lot_size,
    property_type,
    year_built,
    description,
    asking_price,
    listing_price,
    estimated_value,
    status,
    current_state,
    confidence_score,
    submitted_at
) 
SELECT 
    seller_id,
    address,
    city,
    state_code,
    zip,
    bedrooms,
    bathrooms,
    square_feet,
    lot_size,
    property_type,
    year_built,
    description,
    asking_price,
    listing_price,
    estimated_value,
    status,
    current_state,
    confidence_score,
    submitted_at
FROM (
    VALUES 
    (
        (SELECT id FROM seller_profiles LIMIT 1),
        '123 Main Street',
        'Los Angeles',
        'CA',
        '90001',
        3,
        2.0,
        1500,
        6000.00,
        'single_family',
        1985,
        'Beautiful single family home in quiet neighborhood',
        450000.00,
        450000.00,
        440000.00,
        'active',
        'submitted',
        85,
        NOW() - INTERVAL '2 days'
    ),
    (
        (SELECT id FROM seller_profiles LIMIT 1),
        '456 Oak Avenue',
        'San Francisco',
        'CA',
        '94102',
        2,
        1.5,
        1200,
        3500.00,
        'condo',
        2005,
        'Modern condo with city views',
        650000.00,
        650000.00,
        640000.00,
        'active',
        'under_review',
        90,
        NOW() - INTERVAL '3 days'
    ),
    (
        (SELECT id FROM seller_profiles LIMIT 1),
        '789 Pine Road',
        'San Diego',
        'CA',
        '92101',
        4,
        3.0,
        2200,
        8000.00,
        'single_family',
        1995,
        'Spacious family home with pool',
        750000.00,
        750000.00,
        730000.00,
        'active',
        'analysis_pending',
        NULL,
        NOW() - INTERVAL '1 day'
    ),
    (
        (SELECT id FROM seller_profiles LIMIT 1),
        '321 Elm Street',
        'Sacramento',
        'CA',
        '95814',
        3,
        2.5,
        1800,
        5500.00,
        'townhouse',
        2010,
        'Modern townhouse in downtown',
        520000.00,
        520000.00,
        510000.00,
        'active',
        'analysis_completed',
        95,
        NOW() - INTERVAL '5 days'
    ),
    (
        (SELECT id FROM seller_profiles LIMIT 1),
        '654 Maple Drive',
        'Oakland',
        'CA',
        '94601',
        2,
        1.0,
        950,
        2500.00,
        'condo',
        1975,
        'Cozy condo near BART station',
        380000.00,
        380000.00,
        375000.00,
        'active',
        'pricing_review',
        88,
        NOW() - INTERVAL '7 days'
    )
) AS sample_properties(
    seller_id, address, city, state_code, zip, bedrooms, bathrooms, 
    square_feet, lot_size, property_type, year_built, description,
    asking_price, listing_price, estimated_value, status, current_state,
    confidence_score, submitted_at
)
WHERE seller_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add some sample comp_vision_analyses for properties that have completed analysis
INSERT INTO comp_vision_analyses (
    address,
    city,
    state,
    zip_code,
    property_type,
    bedrooms,
    bathrooms,
    square_feet,
    year_built,
    estimated_value,
    confidence,
    confidence_score,
    comparable_properties,
    market_trends,
    property_features,
    neighborhood_stats,
    status,
    created_at
)
SELECT 
    address,
    city,
    state,
    zip_code,
    property_type,
    bedrooms,
    bathrooms,
    square_feet,
    year_built,
    estimated_value,
    confidence_score,
    confidence_score,
    '[]'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    CASE 
        WHEN current_state IN ('analysis_completed', 'pricing_review') THEN 'completed'
        WHEN current_state = 'analysis_in_progress' THEN 'processing'
        ELSE 'pending'
    END,
    submitted_at
FROM properties
WHERE current_state IN ('analysis_completed', 'pricing_review', 'analysis_in_progress')
ON CONFLICT DO NOTHING;

-- Add some sample state transitions
INSERT INTO state_transitions (
    property_id,
    previous_state,
    new_state,
    triggered_by,
    reason,
    created_at
)
SELECT 
    p.id,
    'submitted',
    p.current_state,
    (SELECT user_id FROM admin_profiles WHERE role = 'super_admin' LIMIT 1),
    'Initial review completed',
    p.submitted_at + INTERVAL '1 hour'
FROM properties p
WHERE p.current_state != 'submitted'
ON CONFLICT DO NOTHING;

-- Output summary of inserted data
SELECT 
    'Properties' as table_name,
    COUNT(*) as count,
    STRING_AGG(DISTINCT current_state, ', ') as states
FROM properties
UNION ALL
SELECT 
    'Comp Vision Analyses' as table_name,
    COUNT(*) as count,
    STRING_AGG(DISTINCT status, ', ') as states
FROM comp_vision_analyses
UNION ALL
SELECT 
    'State Transitions' as table_name,
    COUNT(*) as count,
    STRING_AGG(DISTINCT new_state, ', ') as states
FROM state_transitions;