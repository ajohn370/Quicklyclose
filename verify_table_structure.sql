-- Verify the comp_vision_analyses table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comp_vision_analyses'
ORDER BY ordinal_position;

-- Check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'comp_vision_analyses'
) as table_exists;

-- Count existing records (if any)
SELECT COUNT(*) as record_count FROM comp_vision_analyses;