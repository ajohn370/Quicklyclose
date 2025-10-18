-- Fix the constraints on comp_vision_analyses table
-- Remove the CHECK constraints that prevent null values

-- First, drop the existing constraints
ALTER TABLE comp_vision_analyses 
DROP CONSTRAINT IF EXISTS comp_vision_analyses_confidence_check;

ALTER TABLE comp_vision_analyses 
DROP CONSTRAINT IF EXISTS comp_vision_analyses_estimated_value_check;

-- Now the fields can be NULL or have any valid value
-- If you want to keep validation but allow NULL:
ALTER TABLE comp_vision_analyses 
ADD CONSTRAINT comp_vision_analyses_confidence_check 
CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100));

ALTER TABLE comp_vision_analyses 
ADD CONSTRAINT comp_vision_analyses_estimated_value_check 
CHECK (estimated_value IS NULL OR estimated_value > 0);

-- Verify the changes
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE 'comp_vision_analyses%';