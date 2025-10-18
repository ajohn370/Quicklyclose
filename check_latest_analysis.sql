-- Check the latest analysis records (last 2)
SELECT 
    id,
    address || ', ' || city || ', ' || state || ' ' || zip_code as full_address,
    estimated_value,
    confidence,
    status,
    created_at,
    image_url
FROM comp_vision_analyses
ORDER BY created_at DESC
LIMIT 2;

-- Count total records
SELECT COUNT(*) as total_records FROM comp_vision_analyses;