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
-- NEXT STEPS:
-- ============================================
-- 1. Execute this entire script in Supabase SQL Editor
-- 2. Test user registration - should work now!
-- 3. Verify referral system functionality
-- 4. Check that points are being awarded correctly
-- 5. Test the mobile verification flow
-- ============================================

-- IMPORTANT NOTES:
-- - All passwords should be hashed with bcrypt before production
-- - Stripe webhooks needed for automatic subscription updates
-- - Twilio integration needed for real SMS verification
-- - Consider adding more indexes for performance at scale
-- ============================================
