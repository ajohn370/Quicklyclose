-- Check if the admin user exists and get their ID
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as metadata_role,
    created_at
FROM auth.users
WHERE email = 'admin@quicklyclose.com';

-- Check if admin profile exists with the correct fields
SELECT 
    ap.id,
    ap.user_id,
    ap.full_name,
    ap.role,
    ap.permissions,
    ap.is_active,
    ap.created_at,
    au.email
FROM admin_profiles ap
LEFT JOIN auth.users au ON au.id = ap.user_id
WHERE au.email = 'admin@quicklyclose.com' OR ap.role = 'super_admin';

-- Check if there are any analysis records to display
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    MAX(created_at) as latest_record
FROM comp_vision_analyses;

-- Check the latest 3 analysis records
SELECT 
    id,
    address || ', ' || city || ', ' || state || ' ' || zip_code as full_address,
    estimated_value,
    confidence,
    status,
    created_at
FROM comp_vision_analyses
ORDER BY created_at DESC
LIMIT 3;