-- ============================================
-- SUPABASE COMPLETE SETUP WITH RLS POLICIES
-- ============================================
-- Execute this in Supabase SQL Editor to fix RLS error
-- Date: 2025-11-13
-- Project: BetAI - Sistema de Referral e Pontos

-- ============================================
-- 1. UPDATE USERS TABLE STRUCTURE
-- ============================================

-- Add referral columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- ============================================
-- 2. ENABLE RLS ON USERS TABLE
-- ============================================

-- Enable Row-Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public user registration" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Allow reading referral codes" ON users;

-- Policy 1: Allow anyone to INSERT new users (registration)
CREATE POLICY "Allow public user registration" ON users
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Policy 2: Allow users to read their own data
CREATE POLICY "Users can read own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 3: Allow users to update their own data
CREATE POLICY "Users can update own data" ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow reading public referral info (for validation)
CREATE POLICY "Allow reading referral codes" ON users
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- 3. CREATE REFERRALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_id, referred_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow inserting referrals" ON referrals;
DROP POLICY IF EXISTS "Allow reading own referrals" ON referrals;
DROP POLICY IF EXISTS "Allow updating own referrals" ON referrals;

-- Policies for referrals
CREATE POLICY "Allow inserting referrals" ON referrals
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow reading own referrals" ON referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Allow updating own referrals" ON referrals
FOR UPDATE
TO authenticated
USING (auth.uid() = referrer_id);

-- ============================================
-- 4. CREATE REFERRAL POINTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_paid INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_referral_points_user ON referral_points(user_id);

-- Enable RLS
ALTER TABLE referral_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow inserting points" ON referral_points;
DROP POLICY IF EXISTS "Users can read own points" ON referral_points;
DROP POLICY IF EXISTS "Allow updating points" ON referral_points;

-- Policies
CREATE POLICY "Allow inserting points" ON referral_points
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can read own points" ON referral_points
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow updating points" ON referral_points
FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- 5. CREATE POINTS TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_referral ON points_transactions(referral_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON points_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow inserting transactions" ON points_transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON points_transactions;

-- Policies
CREATE POLICY "Allow inserting transactions" ON points_transactions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can read own transactions" ON points_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 6. CREATE FUNCTION TO ADD REFERRAL POINTS
-- ============================================

-- Drop function if exists
DROP FUNCTION IF EXISTS add_referral_points(UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION add_referral_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_referral_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update referral_points
  INSERT INTO referral_points (user_id, points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    points = referral_points.points + p_points,
    total_earned = referral_points.total_earned + p_points,
    last_updated = NOW();
  
  -- Record transaction
  INSERT INTO points_transactions (user_id, points, reason, referral_id)
  VALUES (p_user_id, p_points, p_reason, p_referral_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. CREATE VERIFICATION CODES TABLE (OPTIONAL)
-- ============================================

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow inserting verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Allow reading verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Allow updating verification codes" ON verification_codes;

-- Policies
CREATE POLICY "Allow inserting verification codes" ON verification_codes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow reading verification codes" ON verification_codes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow updating verification codes" ON verification_codes
FOR UPDATE
TO anon, authenticated
USING (true);

-- ============================================
-- 8. UTILITY FUNCTIONS
-- ============================================

-- Function to get user's total points
CREATE OR REPLACE FUNCTION get_user_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  SELECT COALESCE(points, 0) INTO v_points
  FROM referral_points
  WHERE user_id = p_user_id;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral statistics
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE(
  total_referrals BIGINT,
  pending_referrals BIGINT,
  completed_referrals BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_referrals,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_referrals
  FROM referrals
  WHERE referrer_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Uncomment to insert sample data for testing
/*
-- Insert test user with referral code
INSERT INTO users (name, email, password, referral_code)
VALUES ('Test User', 'test@example.com', 'test123', 'TEST1234')
ON CONFLICT (email) DO NOTHING;

-- Get user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'test@example.com';
  
  -- Add some test points
  PERFORM add_referral_points(
    v_user_id,
    10,
    'Test points',
    NULL
  );
END $$;
*/

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Verify setup
SELECT 'Users table' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Referrals table', COUNT(*) FROM referrals
UNION ALL
SELECT 'Referral Points table', COUNT(*) FROM referral_points
UNION ALL
SELECT 'Points Transactions table', COUNT(*) FROM points_transactions
UNION ALL
SELECT 'Verification Codes table', COUNT(*) FROM verification_codes;

-- ============================================
-- 10. CREATE REDEMPTIONS TABLE (Sistema de Resgate)
-- ============================================

CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_redeemed INTEGER NOT NULL CHECK (points_redeemed IN (20, 50, 100)),
  amount_euro DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payment_method TEXT NOT NULL, -- MB WAY, PayPal, Transferência
  payment_details JSONB NOT NULL, -- {phone: "912345678"} ou {email: "user@example.com"} ou {iban: "PT50..."}
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id),
  CONSTRAINT valid_redemption CHECK (
    (points_redeemed = 20 AND amount_euro = 5) OR
    (points_redeemed = 50 AND amount_euro = 15) OR
    (points_redeemed = 100 AND amount_euro = 35)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_requested ON redemptions(requested_at DESC);

-- Enable RLS
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own redemptions" ON redemptions;
DROP POLICY IF EXISTS "Users can read own redemptions" ON redemptions;
DROP POLICY IF EXISTS "Allow reading all redemptions" ON redemptions;
DROP POLICY IF EXISTS "Allow updating redemptions" ON redemptions;

-- Policies
CREATE POLICY "Users can insert own redemptions" ON redemptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can read own redemptions" ON redemptions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow reading all redemptions" ON redemptions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow updating redemptions" ON redemptions
FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- 11. FUNCTION TO REQUEST REDEMPTION
-- ============================================

CREATE OR REPLACE FUNCTION request_redemption(
  p_user_id UUID,
  p_points INTEGER,
  p_payment_method TEXT,
  p_payment_details JSONB
)
RETURNS UUID AS $$
DECLARE
  v_current_points INTEGER;
  v_amount_euro DECIMAL(10,2);
  v_redemption_id UUID;
BEGIN
  -- Get current points
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM referral_points
  WHERE user_id = p_user_id;
  
  -- Check if user has enough points
  IF v_current_points < p_points THEN
    RAISE EXCEPTION 'Pontos insuficientes. Atual: %, Necessário: %', v_current_points, p_points;
  END IF;
  
  -- Validate points and calculate amount
  CASE p_points
    WHEN 20 THEN v_amount_euro := 5;
    WHEN 50 THEN v_amount_euro := 15;
    WHEN 100 THEN v_amount_euro := 35;
    ELSE RAISE EXCEPTION 'Pontos inválidos. Deve ser 20, 50 ou 100';
  END CASE;
  
  -- Create redemption request
  INSERT INTO redemptions (
    user_id,
    points_redeemed,
    amount_euro,
    payment_method,
    payment_details,
    status
  ) VALUES (
    p_user_id,
    p_points,
    v_amount_euro,
    p_payment_method,
    p_payment_details,
    'pending'
  ) RETURNING id INTO v_redemption_id;
  
  -- Deduct points immediately
  UPDATE referral_points
  SET 
    points = points - p_points,
    total_paid = total_paid + v_amount_euro,
    last_updated = NOW()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO points_transactions (user_id, points, reason, referral_id)
  VALUES (p_user_id, -p_points, 'Resgate de ' || p_points || ' pontos (€' || v_amount_euro || ')', NULL);
  
  RETURN v_redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. FUNCTION TO PROCESS REDEMPTION (ADMIN)
-- ============================================

CREATE OR REPLACE FUNCTION process_redemption(
  p_redemption_id UUID,
  p_new_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_points INTEGER;
  v_amount DECIMAL(10,2);
  v_old_status TEXT;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('approved', 'paid', 'rejected') THEN
    RAISE EXCEPTION 'Status inválido. Deve ser: approved, paid ou rejected';
  END IF;
  
  -- Get redemption details
  SELECT user_id, points_redeemed, amount_euro, status
  INTO v_user_id, v_points, v_amount, v_old_status
  FROM redemptions
  WHERE id = p_redemption_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resgate não encontrado';
  END IF;
  
  -- If rejected, refund points
  IF p_new_status = 'rejected' AND v_old_status = 'pending' THEN
    UPDATE referral_points
    SET 
      points = points + v_points,
      total_paid = total_paid - v_amount,
      last_updated = NOW()
    WHERE user_id = v_user_id;
    
    -- Record refund transaction
    INSERT INTO points_transactions (user_id, points, reason, referral_id)
    VALUES (v_user_id, v_points, 'Reembolso de resgate rejeitado (€' || v_amount || ')', NULL);
  END IF;
  
  -- Update redemption
  UPDATE redemptions
  SET 
    status = p_new_status,
    admin_notes = p_admin_notes,
    processed_at = NOW()
  WHERE id = p_redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Execute this entire script in Supabase SQL Editor
-- 2. Test user registration - should work now!
-- 3. Verify referral system functionality
-- 4. Check that points are being awarded correctly
-- 5. Test the mobile verification flow
-- 6. Test redemption system
-- ============================================

-- IMPORTANT NOTES:
-- - All passwords should be hashed with bcrypt before production
-- - Stripe webhooks needed for automatic subscription updates
-- - Twilio integration needed for real SMS verification
-- - Consider adding more indexes for performance at scale
-- - Redemptions require manual approval (admin dashboard)
-- ============================================
