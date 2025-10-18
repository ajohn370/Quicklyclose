-- Computer Vision Analysis Integration
-- Phase 1.4: Integrate comp vision results with property workflow

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analysis status enum
CREATE TYPE analysis_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'admin_review',
  'approved',
  'rejected'
);

-- Computer Vision Analyses Table
CREATE TABLE comp_vision_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic property information
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  image_url TEXT NOT NULL,
  
  -- AI Analysis Results
  features JSONB DEFAULT '[]'::jsonb, -- Array of {name, confidence}
  estimated_value DECIMAL(12,2),
  confidence DECIMAL(5,2), -- Confidence percentage 0-100
  
  -- Flip Analysis Data
  flip_comps JSONB DEFAULT '{}'::jsonb, -- FlipComps interface data
  
  -- Rental Analysis Data  
  rental_comps JSONB DEFAULT '{}'::jsonb, -- RentalComps interface data
  
  -- Similar Properties
  similar_properties JSONB DEFAULT '[]'::jsonb, -- Array of SimilarProperty objects
  
  -- Status and approval
  status analysis_status DEFAULT 'pending',
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by UUID REFERENCES auth.users(id),
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin notes
  admin_notes TEXT,
  seller_visible_notes TEXT,
  internal_notes TEXT,
  
  -- Processing metadata
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  processing_duration_seconds INTEGER,
  ai_model_version TEXT DEFAULT 'v1.0',
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (confidence >= 0 AND confidence <= 100),
  CHECK (estimated_value > 0)
);

-- Create indexes for performance
CREATE INDEX idx_comp_vision_analyses_property ON comp_vision_analyses(property_id);
CREATE INDEX idx_comp_vision_analyses_user ON comp_vision_analyses(user_id);
CREATE INDEX idx_comp_vision_analyses_status ON comp_vision_analyses(status);
CREATE INDEX idx_comp_vision_analyses_created ON comp_vision_analyses(created_at);
CREATE INDEX idx_comp_vision_analyses_admin_approved ON comp_vision_analyses(admin_approved);

-- Property Analysis Relationship Table
CREATE TABLE property_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES comp_vision_analyses(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL DEFAULT 'comp_vision',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one primary analysis per property type
  UNIQUE(property_id, analysis_type, is_primary) WHERE is_primary = true
);

-- Analysis Processing Queue Table
CREATE TABLE analysis_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES comp_vision_analyses(id) ON DELETE CASCADE,
  queue_priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  processing_node VARCHAR(100),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  error_details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for queue management
CREATE INDEX idx_analysis_queue_status ON analysis_processing_queue(status);
CREATE INDEX idx_analysis_queue_priority ON analysis_processing_queue(queue_priority, scheduled_for);
CREATE INDEX idx_analysis_queue_node ON analysis_processing_queue(processing_node);

-- Add updated_at trigger
CREATE TRIGGER update_comp_vision_analyses_updated_at BEFORE UPDATE ON comp_vision_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for analysis workflow

-- Function to create analysis from property submission
CREATE OR REPLACE FUNCTION create_comp_vision_analysis(
  p_property_id UUID,
  p_image_url TEXT,
  p_priority INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
  analysis_id UUID;
  property_record RECORD;
BEGIN
  -- Get property information
  SELECT p.*, sp.user_id INTO property_record
  FROM properties p
  JOIN seller_profiles sp ON p.seller_id = sp.id
  WHERE p.id = p_property_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  
  -- Create analysis record
  INSERT INTO comp_vision_analyses (
    property_id,
    user_id,
    address,
    city,
    state,
    zip_code,
    image_url,
    status
  ) VALUES (
    p_property_id,
    property_record.user_id,
    property_record.address,
    property_record.city,
    property_record.state,
    property_record.zip_code,
    p_image_url,
    'pending'
  ) RETURNING id INTO analysis_id;
  
  -- Create property analysis relationship
  INSERT INTO property_analyses (
    property_id,
    analysis_id,
    analysis_type,
    is_primary
  ) VALUES (
    p_property_id,
    analysis_id,
    'comp_vision',
    true
  );
  
  -- Queue for processing
  INSERT INTO analysis_processing_queue (
    analysis_id,
    queue_priority,
    scheduled_for
  ) VALUES (
    analysis_id,
    p_priority,
    NOW()
  );
  
  RETURN analysis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update analysis with AI results
CREATE OR REPLACE FUNCTION update_analysis_results(
  p_analysis_id UUID,
  p_features JSONB,
  p_estimated_value DECIMAL,
  p_confidence DECIMAL,
  p_flip_comps JSONB DEFAULT NULL,
  p_rental_comps JSONB DEFAULT NULL,
  p_similar_properties JSONB DEFAULT NULL,
  p_processing_duration INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE comp_vision_analyses 
  SET 
    features = p_features,
    estimated_value = p_estimated_value,
    confidence = p_confidence,
    flip_comps = COALESCE(p_flip_comps, flip_comps),
    rental_comps = COALESCE(p_rental_comps, rental_comps),
    similar_properties = COALESCE(p_similar_properties, similar_properties),
    status = 'completed',
    processing_completed_at = NOW(),
    processing_duration_seconds = p_processing_duration,
    updated_at = NOW()
  WHERE id = p_analysis_id;
  
  -- Update queue status
  UPDATE analysis_processing_queue
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE analysis_id = p_analysis_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark analysis as failed
CREATE OR REPLACE FUNCTION mark_analysis_failed(
  p_analysis_id UUID,
  p_error_message TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE comp_vision_analyses 
  SET 
    status = 'failed',
    error_message = p_error_message,
    retry_count = retry_count + 1,
    updated_at = NOW()
  WHERE id = p_analysis_id;
  
  -- Update queue status
  UPDATE analysis_processing_queue
  SET 
    status = 'failed',
    error_details = p_error_message,
    completed_at = NOW()
  WHERE analysis_id = p_analysis_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analysis for property pricing workflow
CREATE OR REPLACE FUNCTION get_property_analysis(p_property_id UUID)
RETURNS TABLE (
  analysis_id UUID,
  estimated_value DECIMAL,
  confidence DECIMAL,
  features JSONB,
  flip_comps JSONB,
  rental_comps JSONB,
  similar_properties JSONB,
  admin_approved BOOLEAN,
  status analysis_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cva.id,
    cva.estimated_value,
    cva.confidence,
    cva.features,
    cva.flip_comps,
    cva.rental_comps,
    cva.similar_properties,
    cva.admin_approved,
    cva.status
  FROM comp_vision_analyses cva
  JOIN property_analyses pa ON cva.id = pa.analysis_id
  WHERE pa.property_id = p_property_id 
    AND pa.is_primary = true
    AND cva.status IN ('completed', 'approved')
  ORDER BY cva.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE comp_vision_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_processing_queue ENABLE ROW LEVEL SECURITY;

-- Comp vision analyses policies
CREATE POLICY "Users can view own analyses" ON comp_vision_analyses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage analyses" ON comp_vision_analyses
  FOR ALL USING (true); -- Will be controlled by service role

-- Property analyses policies
CREATE POLICY "Users can view own property analyses" ON property_analyses
  FOR SELECT USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN seller_profiles sp ON p.seller_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage property analyses" ON property_analyses
  FOR ALL USING (true);

-- Analysis queue policies (admin only)
CREATE POLICY "Admins can manage analysis queue" ON analysis_processing_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'analyst')
    )
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_comp_vision_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION update_analysis_results TO authenticated;
GRANT EXECUTE ON FUNCTION mark_analysis_failed TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_analysis TO authenticated;

-- Add analysis permissions to the system
INSERT INTO permissions (name, description, resource_type) VALUES
('analysis.create', 'Create new property analyses', 'analysis'),
('analysis.view', 'View analysis results', 'analysis'),
('analysis.approve', 'Approve analysis results', 'analysis'),
('analysis.reject', 'Reject analysis results', 'analysis')
ON CONFLICT (name) DO NOTHING;

-- Grant analysis permissions to appropriate roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'analyst')
AND p.name LIKE 'analysis.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;