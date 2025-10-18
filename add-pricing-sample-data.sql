-- Add sample pricing revision data for testing

-- First, get a property ID to use for testing
-- You can run: SELECT id FROM properties LIMIT 1;

-- For now, we'll use a placeholder property ID - update this with a real property ID from your database
-- REPLACE 'your-property-id-here' with an actual property ID

-- Insert sample pending pricing revisions
INSERT INTO pricing_revisions (
  property_id,
  previous_offer,
  new_offer,
  reason,
  approval_status,
  approval_level_required,
  risk_score,
  created_by
) VALUES 
  (
    (SELECT id FROM properties LIMIT 1),
    485000,
    502000,
    'Market analysis shows 3.5% appreciation in neighborhood',
    'pending',
    'senior_analyst',
    4,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1)
  ),
  (
    (SELECT id FROM properties LIMIT 1 OFFSET 1),
    320000,
    335000,
    'Updated comparable sales data shows higher market value',
    'pending',
    'analyst',
    2,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1)
  ),
  (
    (SELECT id FROM properties LIMIT 1 OFFSET 2),
    750000,
    715000,
    'Inspection revealed foundation issues requiring repairs',
    'pending',
    'pricing_manager',
    7,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1)
  );

-- Insert sample approved/rejected revisions for history
INSERT INTO pricing_revisions (
  property_id,
  previous_offer,
  new_offer,
  reason,
  approval_status,
  approval_level_required,
  approved_by,
  approved_at,
  risk_score,
  created_by,
  created_at
) VALUES 
  (
    (SELECT id FROM properties LIMIT 1 OFFSET 3),
    425000,
    440000,
    'Market conditions improved',
    'approved',
    'analyst',
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1),
    NOW() - INTERVAL '1 day',
    3,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1),
    NOW() - INTERVAL '2 days'
  ),
  (
    (SELECT id FROM properties LIMIT 1 OFFSET 4),
    650000,
    630000,
    'Property required additional repairs',
    'approved',
    'senior_analyst',
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1),
    NOW() - INTERVAL '2 days',
    5,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1),
    NOW() - INTERVAL '3 days'
  ),
  (
    (SELECT id FROM properties LIMIT 1 OFFSET 5),
    380000,
    365000,
    'Comparable sales analysis shows lower market value',
    'rejected',
    'pricing_manager',
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1),
    NOW() - INTERVAL '3 days',
    6,
    (SELECT id FROM auth.users WHERE email ILIKE '%admin%' LIMIT 1),
    NOW() - INTERVAL '4 days'
  );

-- Verify the data was inserted
SELECT 
  pr.id,
  pr.previous_offer,
  pr.new_offer,
  pr.reason,
  pr.approval_status,
  pr.approval_level_required,
  pr.risk_score,
  pr.created_at,
  p.address
FROM pricing_revisions pr
JOIN properties p ON pr.property_id = p.id
ORDER BY pr.created_at DESC;