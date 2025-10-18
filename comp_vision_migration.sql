-- Computer Vision Analysis Integration
-- Phase 1.4: Integrate comp vision results with property workflow

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analysis status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status') THEN
        CREATE TYPE analysis_status AS ENUM (
          'pending',
          'processing',
          'completed',
          'failed',
          'admin_review',
          'approved',
          'rejected'
        );
    END IF;
END $$;

-- Drop existing table if it exists (backup data first if needed)
DROP TABLE IF EXISTS comp_vision_analyses CASCADE;

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

-- Enable RLS
ALTER TABLE comp_vision_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own analyses" ON comp_vision_analyses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage analyses" ON comp_vision_analyses
  FOR ALL USING (true); -- Will be controlled by service role

-- Grant permissions
GRANT ALL ON comp_vision_analyses TO authenticated;
GRANT ALL ON comp_vision_analyses TO service_role;