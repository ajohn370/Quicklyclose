-- Property State Machine and Audit Trail System
-- Phase 0.3: Create property state machine and audit trail tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Property States Enum
CREATE TYPE property_state AS ENUM (
  'submitted',
  'analyzing',
  'analysis_failed',
  'pending_admin_review',
  'admin_rejected',
  'pending_seller_approval',
  'seller_rejected',
  'seller_approved',
  'calculating_investor_price',
  'pricing_failed',
  'priced_for_investors',
  'listed',
  'bidding_active',
  'bidding_ended',
  'bidding_cancelled',
  'bid_accepted',
  'under_contract',
  'sold',
  'withdrawn'
);

-- Property Transitions Table
CREATE TABLE property_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  from_state property_state NOT NULL,
  to_state property_state NOT NULL,
  triggered_by VARCHAR(50) NOT NULL, -- 'system', 'admin', 'seller', 'investor'
  triggered_by_user UUID REFERENCES auth.users(id),
  transition_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraint to prevent duplicate transitions
  CONSTRAINT unique_property_transition UNIQUE (property_id, from_state, to_state, created_at)
);

-- Create indexes for performance
CREATE INDEX idx_property_transitions_property_id ON property_transitions(property_id);
CREATE INDEX idx_property_transitions_created_at ON property_transitions(created_at);
CREATE INDEX idx_property_transitions_states ON property_transitions(from_state, to_state);

-- Pricing Revisions Table
CREATE TABLE pricing_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES comp_vision_analyses(id),
  revision_number INTEGER NOT NULL DEFAULT 1,
  seller_price DECIMAL(12,2),
  admin_suggested_price DECIMAL(12,2),
  investor_price DECIMAL(12,2),
  quicklyclose_margin DECIMAL(5,4), -- Stored as decimal (e.g., 0.1500 for 15%)
  calculation_method VARCHAR(100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  market_factors JSONB DEFAULT '{}'::jsonb,
  admin_notes TEXT,
  seller_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'admin_approved', 'seller_approved', 'seller_rejected', 'expired')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pricing revisions
CREATE INDEX idx_pricing_revisions_property_id ON pricing_revisions(property_id);
CREATE INDEX idx_pricing_revisions_status ON pricing_revisions(status);
CREATE INDEX idx_pricing_revisions_created_at ON pricing_revisions(created_at);

-- Bidding Windows Table
CREATE TABLE bidding_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  starting_price DECIMAL(12,2) NOT NULL,
  reserve_price DECIMAL(12,2),
  increment_amount DECIMAL(12,2) DEFAULT 1000.00,
  duration_hours INTEGER DEFAULT 48,
  scheduled_open_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_close_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_open_time TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'closed', 'cancelled', 'extended')),
  winning_bid_id UUID, -- References bids(id), added later to avoid circular dependency
  total_bids INTEGER DEFAULT 0,
  highest_bid DECIMAL(12,2),
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for bidding windows
CREATE INDEX idx_bidding_windows_property_id ON bidding_windows(property_id);
CREATE INDEX idx_bidding_windows_status ON bidding_windows(status);
CREATE INDEX idx_bidding_windows_scheduled_close ON bidding_windows(scheduled_close_time);

-- Bids Table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bidding_window_id UUID NOT NULL REFERENCES bidding_windows(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investor_profiles(id),
  amount DECIMAL(12,2) NOT NULL,
  bid_type VARCHAR(50) DEFAULT 'standard' CHECK (bid_type IN ('standard', 'proxy', 'auto_increment')),
  proxy_max_amount DECIMAL(12,2), -- For proxy bids
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'won', 'lost', 'cancelled', 'expired')),
  result_reason VARCHAR(100),
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure bid amount meets minimum requirements
  CONSTRAINT valid_bid_amount CHECK (amount > 0)
);

-- Create indexes for bids
CREATE INDEX idx_bids_bidding_window_id ON bids(bidding_window_id);
CREATE INDEX idx_bids_investor_id ON bids(investor_id);
CREATE INDEX idx_bids_amount ON bids(amount DESC);
CREATE INDEX idx_bids_placed_at ON bids(placed_at);

-- Bid Results Table (for historical tracking)
CREATE TABLE bid_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bidding_window_id UUID NOT NULL REFERENCES bidding_windows(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investor_profiles(id),
  amount DECIMAL(12,2) NOT NULL,
  rank INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('won', 'lost')),
  result_reason VARCHAR(100),
  result_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for bid results
CREATE INDEX idx_bid_results_bidding_window_id ON bid_results(bidding_window_id);
CREATE INDEX idx_bid_results_property_id ON bid_results(property_id);
CREATE INDEX idx_bid_results_investor_id ON bid_results(investor_id);

-- Notification Logs Table (for tracking communications)
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('seller', 'investor', 'admin')),
  recipient_id UUID NOT NULL, -- References seller_profiles(id) or investor_profiles(id)
  notification_type VARCHAR(100) NOT NULL,
  subject TEXT,
  content TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  delivery_method VARCHAR(50) DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'push', 'in_app')),
  external_id VARCHAR(200), -- External service message ID
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notification logs
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient_type, recipient_id);
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);

-- Add foreign key constraint to bidding_windows for winning_bid_id
-- (Done after bids table is created to avoid circular dependency)
-- ALTER TABLE bidding_windows ADD CONSTRAINT fk_bidding_windows_winning_bid 
-- FOREIGN KEY (winning_bid_id) REFERENCES bids(id);

-- Update existing properties table to include current_state
ALTER TABLE properties ADD COLUMN IF NOT EXISTS current_state property_state DEFAULT 'submitted';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS investor_price DECIMAL(12,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for property state
CREATE INDEX IF NOT EXISTS idx_properties_current_state ON properties(current_state);

-- RLS Policies for new tables

-- Property Transitions: Admins can see all, sellers/investors can see their own properties
ALTER TABLE property_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all property transitions" ON property_transitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.user_id = auth.uid() 
      AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Sellers can view their property transitions" ON property_transitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN seller_profiles sp ON p.seller_id = sp.id
      WHERE p.id = property_transitions.property_id
      AND sp.user_id = auth.uid()
    )
  );

-- Pricing Revisions: Similar access patterns
ALTER TABLE pricing_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pricing revisions" ON pricing_revisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.user_id = auth.uid() 
      AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Sellers can view pricing for their properties" ON pricing_revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN seller_profiles sp ON p.seller_id = sp.id
      WHERE p.id = pricing_revisions.property_id
      AND sp.user_id = auth.uid()
    )
  );

-- Bidding Windows and Bids: Investors can see active bidding, admins see all
ALTER TABLE bidding_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage bidding windows" ON bidding_windows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.user_id = auth.uid() 
      AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Investors can view active bidding windows" ON bidding_windows
  FOR SELECT USING (
    status = 'active' OR EXISTS (
      SELECT 1 FROM investor_profiles ip
      WHERE ip.user_id = auth.uid()
    )
  );

CREATE POLICY "Investors can manage their own bids" ON bids
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM investor_profiles ip
      WHERE ip.id = bids.investor_id
      AND ip.user_id = auth.uid()
    )
  );

-- Notification Logs: Users can see their own notifications, admins see all
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all notifications" ON notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.user_id = auth.uid() 
      AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Users can view their own notifications" ON notification_logs
  FOR SELECT USING (
    (recipient_type = 'seller' AND EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = notification_logs.recipient_id::UUID
      AND sp.user_id = auth.uid()
    )) OR
    (recipient_type = 'investor' AND EXISTS (
      SELECT 1 FROM investor_profiles ip
      WHERE ip.id = notification_logs.recipient_id::UUID
      AND ip.user_id = auth.uid()
    ))
  );