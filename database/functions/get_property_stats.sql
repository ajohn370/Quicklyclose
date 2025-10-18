-- Function to get property statistics for admin dashboard
-- This function returns counts of properties by state for dashboard metrics

CREATE OR REPLACE FUNCTION get_property_stats()
RETURNS TABLE (
  submitted BIGINT,
  under_review BIGINT,
  analysis_pending BIGINT,
  analysis_in_progress BIGINT,
  analysis_completed BIGINT,
  analysis_failed BIGINT,
  pricing_review BIGINT,
  pricing_approved BIGINT,
  pricing_revision_requested BIGINT,
  seller_review BIGINT,
  seller_approved BIGINT,
  seller_rejected BIGINT,
  bidding_preparation BIGINT,
  bidding_active BIGINT,
  bidding_extended BIGINT,
  bidding_closed BIGINT,
  winner_selected BIGINT,
  contract_pending BIGINT,
  contract_signed BIGINT,
  funds_transfer BIGINT,
  completed BIGINT,
  cancelled BIGINT,
  archived BIGINT,
  total_properties BIGINT,
  avg_processing_time_hours NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH state_counts AS (
    SELECT 
      current_state,
      COUNT(*) as count
    FROM properties
    GROUP BY current_state
  ),
  processing_stats AS (
    SELECT 
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours,
      COUNT(CASE WHEN current_state IN ('completed', 'cancelled') THEN 1 END) as finished,
      COUNT(CASE WHEN current_state = 'completed' THEN 1 END) as successful
    FROM properties
    WHERE created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'submitted'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'under_review'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'analysis_pending'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'analysis_in_progress'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'analysis_completed'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'analysis_failed'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'pricing_review'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'pricing_approved'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'pricing_revision_requested'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'seller_review'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'seller_approved'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'seller_rejected'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'bidding_preparation'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'bidding_active'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'bidding_extended'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'bidding_closed'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'winner_selected'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'contract_pending'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'contract_signed'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'funds_transfer'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'completed'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'cancelled'), 0),
    COALESCE((SELECT count FROM state_counts WHERE current_state = 'archived'), 0),
    (SELECT COUNT(*) FROM properties),
    COALESCE((SELECT avg_hours FROM processing_stats), 0),
    CASE 
      WHEN (SELECT finished FROM processing_stats) > 0 
      THEN ROUND((SELECT successful::NUMERIC FROM processing_stats) / (SELECT finished FROM processing_stats) * 100, 2)
      ELSE 0 
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permission to authenticated users (will be filtered by RLS)
GRANT EXECUTE ON FUNCTION get_property_stats() TO authenticated;