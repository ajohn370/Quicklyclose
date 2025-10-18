-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'seller', 'investor')),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role TEXT CHECK (recipient_role IN ('admin', 'seller', 'investor')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Conversations Table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_1_role TEXT NOT NULL CHECK (participant_1_role IN ('admin', 'seller', 'investor')),
  participant_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_role TEXT NOT NULL CHECK (participant_2_role IN ('admin', 'seller', 'investor')),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1_id, participant_2_id, property_id)
);

-- Property Bids Table
CREATE TABLE IF NOT EXISTS property_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  bid_amount DECIMAL(10, 2) NOT NULL CHECK (bid_amount > 0),
  bid_type TEXT DEFAULT 'cash' CHECK (bid_type IN ('cash', 'financing', 'mixed')),
  financing_amount DECIMAL(10, 2),
  financing_approved BOOLEAN DEFAULT FALSE,
  bid_status TEXT DEFAULT 'pending' CHECK (bid_status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
  bid_message TEXT,
  counter_offer_amount DECIMAL(10, 2),
  counter_offer_message TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bid History Table (for tracking bid changes)
CREATE TABLE IF NOT EXISTS bid_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES property_bids(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'modified', 'countered', 'accepted', 'rejected', 'withdrawn')),
  previous_amount DECIMAL(10, 2),
  new_amount DECIMAL(10, 2),
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_property ON chat_messages(property_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants ON chat_conversations(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_property ON chat_conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);

CREATE INDEX IF NOT EXISTS idx_property_bids_property ON property_bids(property_id);
CREATE INDEX IF NOT EXISTS idx_property_bids_investor ON property_bids(investor_id);
CREATE INDEX IF NOT EXISTS idx_property_bids_status ON property_bids(bid_status);
CREATE INDEX IF NOT EXISTS idx_property_bids_expires ON property_bids(expires_at);

-- Row Level Security Policies for Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages where they are sender or recipient
CREATE POLICY "Users can view their own messages" ON chat_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Users can insert messages as sender
CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update their own messages (for read status)
CREATE POLICY "Users can mark messages as read" ON chat_messages
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Row Level Security Policies for Chat Conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can see conversations they're part of
CREATE POLICY "Users can view their conversations" ON chat_conversations
  FOR SELECT USING (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id
  );

-- Row Level Security Policies for Property Bids
ALTER TABLE property_bids ENABLE ROW LEVEL SECURITY;

-- Investors can see all bids on properties, sellers can see bids on their properties
CREATE POLICY "View bids policy" ON property_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investor_profiles 
      WHERE investor_profiles.id = property_bids.investor_id 
      AND investor_profiles.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM properties p
      JOIN seller_profiles s ON p.seller_id = s.id
      WHERE p.id = property_bids.property_id 
      AND s.user_id = auth.uid()
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Investors can create bids
CREATE POLICY "Investors can create bids" ON property_bids
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investor_profiles 
      WHERE investor_profiles.id = property_bids.investor_id 
      AND investor_profiles.user_id = auth.uid()
    )
  );

-- Investors can update their own bids
CREATE POLICY "Investors can update their bids" ON property_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM investor_profiles 
      WHERE investor_profiles.id = property_bids.investor_id 
      AND investor_profiles.user_id = auth.uid()
    )
  );

-- Sellers can update bid status on their properties
CREATE POLICY "Sellers can respond to bids" ON property_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN seller_profiles s ON p.seller_id = s.id
      WHERE p.id = property_bids.property_id 
      AND s.user_id = auth.uid()
    )
  );

-- Enable Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE property_bids;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_bids_updated_at BEFORE UPDATE ON property_bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();