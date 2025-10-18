-- Check the actual analysis data in the table
SELECT 
    id,
    address,
    city,
    state,
    zip_code,
    estimated_value,
    confidence,
    status,
    created_at,
    features,
    flip_comps,
    rental_comps
FROM comp_vision_analyses
ORDER BY created_at DESC
LIMIT 10;

-- Check for any recent analyses (last 24 hours)
SELECT 
    id,
    address || ', ' || city || ', ' || state || ' ' || zip_code as full_address,
    estimated_value,
    confidence,
    status,
    created_at
FROM comp_vision_analyses
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;