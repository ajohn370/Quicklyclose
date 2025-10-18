-- Add Sample Property Data for Testing Admin Dashboard
-- This script adds sample properties to test the submissions tab

-- First, ensure we have a seller profile
DO $$
DECLARE
    v_seller_id UUID;
    v_user_id UUID;
BEGIN
    -- Get or create a test seller user
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.seller@example.com' LIMIT 1;
    
    -- If no test user exists, we'll use the admin user as the seller for testing
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@quicklyclose.com' LIMIT 1;
    END IF;
    
    -- Get or create seller profile
    SELECT id INTO v_seller_id FROM seller_profiles WHERE user_id = v_user_id LIMIT 1;
    
    IF v_seller_id IS NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO seller_profiles (user_id, full_name, email, phone, created_at, updated_at)
        VALUES (
            v_user_id,
            'Test Property Seller',
            COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'test@example.com'),
            '(555) 123-4567',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_seller_id;
    END IF;
    
    -- Clear existing test properties to avoid duplicates
    DELETE FROM properties WHERE address LIKE '%Test Property%';
    
    -- Insert sample properties if we have a seller
    IF v_seller_id IS NOT NULL THEN
        INSERT INTO properties (
            seller_id, 
            address, 
            city, 
            state, 
            zip_code,
            property_type, 
            bedrooms, 
            bathrooms, 
            square_feet,
            year_built,
            asking_price, 
            listing_price,
            description,
            status,
            current_state,
            confidence_score,
            submitted_at,
            created_at,
            updated_at
        ) VALUES 
        (
            v_seller_id,
            '123 Test Property Lane',
            'Los Angeles',
            'CA',
            '90210',
            'single_family',
            3,
            2.0,
            1800,
            2005,
            450000,
            450000,
            'Beautiful test property for admin dashboard testing',
            'active',
            'submitted',
            NULL,
            NOW() - INTERVAL '2 days',
            NOW() - INTERVAL '2 days',
            NOW()
        ),
        (
            v_seller_id,
            '456 Sample House Drive',
            'San Francisco',
            'CA',
            '94102',
            'condo',
            2,
            1.5,
            1200,
            2010,
            650000,
            650000,
            'Modern condo with city views - test submission',
            'active',
            'under_review',
            85,
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '3 days',
            NOW()
        ),
        (
            v_seller_id,
            '789 Demo Property Street',
            'San Diego',
            'CA',
            '92101',
            'townhouse',
            4,
            2.5,
            2200,
            2000,
            520000,
            520000,
            'Spacious townhouse for testing purposes',
            'active',
            'analysis_completed',
            92,
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day',
            NOW()
        );
        
        RAISE NOTICE 'Sample properties inserted successfully for seller_id: %', v_seller_id;
    ELSE
        RAISE NOTICE 'No seller found. Unable to insert sample properties.';
    END IF;
END $$;

-- Verify the data was inserted
SELECT 
    'Verification' as status,
    p.id,
    p.address,
    p.current_state,
    p.listing_price,
    p.confidence_score,
    sp.full_name as seller_name,
    sp.email as seller_email
FROM properties p
JOIN seller_profiles sp ON p.seller_id = sp.id
WHERE p.address LIKE '%Test%' OR p.address LIKE '%Sample%' OR p.address LIKE '%Demo%'
ORDER BY p.created_at DESC;