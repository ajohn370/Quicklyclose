-- Check if admin profile exists
SELECT 
    ap.*,
    au.email
FROM admin_profiles ap
JOIN auth.users au ON au.id = ap.user_id
WHERE au.email = 'admin@quicklyclose.com';

-- Check if there are any analysis records
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN estimated_value IS NOT NULL THEN 1 END) as with_value,
    COUNT(CASE WHEN confidence IS NOT NULL THEN 1 END) as with_confidence
FROM comp_vision_analyses;

-- Check latest 3 analysis records
SELECT 
    id,
    address || ', ' || city || ', ' || state || ' ' || zip_code as full_address,
    estimated_value,
    confidence,
    status,
    created_at,
    user_id,
    property_id
FROM comp_vision_analyses
ORDER BY created_at DESC
LIMIT 3;

-- Check if admin user exists in auth.users
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as metadata_role,
    created_at
FROM auth.users
WHERE email = 'admin@quicklyclose.com';