-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- 1. users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text UNIQUE,
    name text,
    upi_id text,
    pan_number text,
    neighborhood text,
    latitude float,
    longitude float,
    kyc_status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- 2. creators table
CREATE TABLE IF NOT EXISTS creators (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    bio text,
    category text,
    follower_count int DEFAULT 0,
    total_earnings numeric DEFAULT 0,
    is_verified boolean DEFAULT false,
    digital_store_url text
);

-- 3. merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id uuid PRIMARY KEY,
    name text,
    category text,
    address text,
    neighborhood text,
    latitude float,
    longitude float,
    gstin text,
    upi_id text,
    wallet_balance numeric DEFAULT 0,
    credit_limit numeric DEFAULT 5000,
    is_active boolean DEFAULT true
);

-- 4. campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id uuid PRIMARY KEY,
    merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
    title text,
    description text,
    cashback_amount numeric,
    min_purchase numeric,
    total_budget numeric,
    spent_budget numeric DEFAULT 0,
    start_date timestamptz,
    end_date timestamptz,
    status text DEFAULT 'active'
);

-- 5. drops table
CREATE TABLE IF NOT EXISTS drops (
    id uuid PRIMARY KEY,
    campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES creators(id) ON DELETE CASCADE,
    video_id text,
    code text UNIQUE,
    claimed_count int DEFAULT 0,
    verified_count int DEFAULT 0,
    expires_at timestamptz
);

-- 6. drop_claims table
CREATE TABLE IF NOT EXISTS drop_claims (
    id uuid PRIMARY KEY,
    drop_id uuid REFERENCES drops(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    status text DEFAULT 'claimed',
    qr_token text,
    claimed_at timestamptz DEFAULT now(),
    verified_at timestamptz,
    expires_at timestamptz
);

-- 7. transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY,
    claim_id uuid REFERENCES drop_claims(id) ON DELETE CASCADE,
    amount numeric,
    merchant_debit numeric,
    user_credit numeric,
    creator_credit numeric,
    platform_revenue numeric,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- 8. karma_transactions table
CREATE TABLE IF NOT EXISTS karma_transactions (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    stream_id text,
    prediction_id uuid,
    amount_staked int,
    amount_won int,
    created_at timestamptz DEFAULT now()
);

-- 9. predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id uuid PRIMARY KEY,
    creator_id uuid REFERENCES creators(id) ON DELETE CASCADE,
    stream_id text,
    title text,
    options jsonb,
    correct_option text,
    closes_at timestamptz,
    total_karma_staked int DEFAULT 0
);

-- 10. karma_wallets table
CREATE TABLE IF NOT EXISTS karma_wallets (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    balance int DEFAULT 100,
    lifetime_earned int DEFAULT 0
);

-- 11. leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    neighborhood text,
    badge_name text,
    score int DEFAULT 0,
    rank int,
    updated_at timestamptz DEFAULT now()
);

-- 12. team_slashes table
CREATE TABLE IF NOT EXISTS team_slashes (
    id uuid PRIMARY KEY,
    drop_id uuid REFERENCES drops(id) ON DELETE CASCADE,
    inviter_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    invitee_count int DEFAULT 0,
    bonus_multiplier numeric DEFAULT 1,
    expires_at timestamptz
);

-- 13. tips table
CREATE TABLE IF NOT EXISTS tips (
    id uuid PRIMARY KEY,
    from_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    to_creator_id uuid REFERENCES creators(id) ON DELETE CASCADE,
    amount numeric,
    upi_txn_id text,
    created_at timestamptz DEFAULT now()
);

-- 14. payouts table
CREATE TABLE IF NOT EXISTS payouts (
    id uuid PRIMARY KEY,
    transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
    recipient_type text,
    recipient_id uuid,
    amount numeric,
    upi_id text,
    status text DEFAULT 'pending',
    idempotency_key text UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- 15. risk_scores table
CREATE TABLE IF NOT EXISTS risk_scores (
    id uuid PRIMARY KEY,
    claim_id uuid REFERENCES drop_claims(id) ON DELETE CASCADE,
    gps_match boolean,
    device_velocity int,
    invoice_hash text,
    upi_match boolean,
    total_score int,
    verdict text,
    created_at timestamptz DEFAULT now()
);

-- 16. verification_providers table
CREATE TABLE IF NOT EXISTS verification_providers (
    id uuid PRIMARY KEY,
    name text,
    country text,
    type text,
    config jsonb,
    is_active boolean DEFAULT true
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_drops_code ON drops(code);
CREATE INDEX IF NOT EXISTS idx_drop_claims_user_id ON drop_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_drop_claims_status ON drop_claims(status);
CREATE INDEX IF NOT EXISTS idx_transactions_claim_id ON transactions(claim_id);
CREATE INDEX IF NOT EXISTS idx_payouts_idempotency_key ON payouts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_leaderboards_neighborhood_score ON leaderboards(neighborhood, score DESC);

-- Additional useful indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_merchant_id ON campaigns(merchant_id);
CREATE INDEX IF NOT EXISTS idx_drops_campaign_id ON drops(campaign_id);
CREATE INDEX IF NOT EXISTS idx_drops_creator_id ON drops(creator_id);
CREATE INDEX IF NOT EXISTS idx_drop_claims_drop_id ON drop_claims(drop_id);
CREATE INDEX IF NOT EXISTS idx_karma_transactions_user_id ON karma_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_creator_id ON predictions(creator_id);
CREATE INDEX IF NOT EXISTS idx_karma_wallets_user_id ON karma_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user_id ON leaderboards(user_id);
CREATE INDEX IF NOT EXISTS idx_team_slashes_drop_id ON team_slashes(drop_id);
CREATE INDEX IF NOT EXISTS idx_team_slashes_inviter_user_id ON team_slashes(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_from_user_id ON tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to_creator_id ON tips(to_creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_transaction_id ON payouts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_claim_id ON risk_scores(claim_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_slashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_providers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Helper: Admin/service role bypass is automatic in Supabase when using service_role key

-- users table policies
CREATE POLICY "Users can read their own data"
    ON users FOR SELECT
    USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert their own data"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

-- creators table policies
CREATE POLICY "Creators can read their own data"
    ON creators FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert their own creator profile"
    ON creators FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Creators can update their own data"
    ON creators FOR UPDATE
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- merchants table policies
CREATE POLICY "Merchants are readable by authenticated users"
    ON merchants FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins can insert merchants"
    ON merchants FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins can update merchants"
    ON merchants FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- campaigns table policies
CREATE POLICY "Campaigns are readable by authenticated users"
    ON campaigns FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Merchants can insert their own campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM merchants WHERE id = merchant_id AND auth.uid() IN (SELECT user_id FROM users WHERE users.id = merchants.id))
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Merchants can update their own campaigns"
    ON campaigns FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM merchants WHERE id = merchant_id)
        OR auth.jwt()->>'role' = 'service_role'
    );

-- drops table policies
CREATE POLICY "Drops are readable by authenticated users"
    ON drops FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Creators can insert drops"
    ON drops FOR INSERT
    WITH CHECK (auth.uid() = creator_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Creators can update their own drops"
    ON drops FOR UPDATE
    USING (auth.uid() = creator_id OR auth.jwt()->>'role' = 'service_role');

-- drop_claims table policies
CREATE POLICY "Users can read their own drop claims"
    ON drop_claims FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert their own drop claims"
    ON drop_claims FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update their own drop claims"
    ON drop_claims FOR UPDATE
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- transactions table policies
CREATE POLICY "Users can read transactions related to their claims"
    ON transactions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM drop_claims WHERE drop_claims.id = claim_id AND drop_claims.user_id = auth.uid())
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "System can insert transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can update transactions"
    ON transactions FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- karma_transactions table policies
CREATE POLICY "Users can read their own karma transactions"
    ON karma_transactions FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can insert karma transactions"
    ON karma_transactions FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- predictions table policies
CREATE POLICY "Predictions are readable by authenticated users"
    ON predictions FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Creators can insert their own predictions"
    ON predictions FOR INSERT
    WITH CHECK (auth.uid() = creator_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Creators can update their own predictions"
    ON predictions FOR UPDATE
    USING (auth.uid() = creator_id OR auth.jwt()->>'role' = 'service_role');

-- karma_wallets table policies
CREATE POLICY "Users can read their own karma wallets"
    ON karma_wallets FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can insert karma wallets"
    ON karma_wallets FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can update karma wallets"
    ON karma_wallets FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- leaderboards table policies
CREATE POLICY "Leaderboards are readable by authenticated users"
    ON leaderboards FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can insert leaderboards"
    ON leaderboards FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can update leaderboards"
    ON leaderboards FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- team_slashes table policies
CREATE POLICY "Users can read their own team slashes"
    ON team_slashes FOR SELECT
    USING (auth.uid() = inviter_user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert their own team slashes"
    ON team_slashes FOR INSERT
    WITH CHECK (auth.uid() = inviter_user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update their own team slashes"
    ON team_slashes FOR UPDATE
    USING (auth.uid() = inviter_user_id OR auth.jwt()->>'role' = 'service_role');

-- tips table policies
CREATE POLICY "Users can read tips they sent or received"
    ON tips FOR SELECT
    USING (
        auth.uid() = from_user_id 
        OR EXISTS (SELECT 1 FROM creators WHERE creators.id = to_creator_id AND creators.user_id = auth.uid())
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "Users can insert tips"
    ON tips FOR INSERT
    WITH CHECK (auth.uid() = from_user_id OR auth.jwt()->>'role' = 'service_role');

-- payouts table policies
CREATE POLICY "Recipients can read their own payouts"
    ON payouts FOR SELECT
    USING (
        (recipient_type = 'user' AND auth.uid() = recipient_id)
        OR (recipient_type = 'creator' AND EXISTS (SELECT 1 FROM creators WHERE creators.id = recipient_id AND creators.user_id = auth.uid()))
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "System can insert payouts"
    ON payouts FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "System can update payouts"
    ON payouts FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- risk_scores table policies
CREATE POLICY "Users can read risk scores for their claims"
    ON risk_scores FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM drop_claims WHERE drop_claims.id = claim_id AND drop_claims.user_id = auth.uid())
        OR auth.jwt()->>'role' = 'service_role'
    );

CREATE POLICY "System can insert risk scores"
    ON risk_scores FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- verification_providers table policies
CREATE POLICY "Verification providers are readable by authenticated users"
    ON verification_providers FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins can manage verification providers"
    ON verification_providers FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');
