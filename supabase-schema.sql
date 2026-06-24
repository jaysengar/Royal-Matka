-- =====================================================
-- ROYAL MATKA - SUPABASE DATABASE SCHEMA
-- Run this SQL in Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- USERS (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MARKETS
CREATE TABLE IF NOT EXISTS public.markets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  open_time_24 TEXT NOT NULL,
  close_time_24 TEXT NOT NULL,
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT '***-**-***',
  status TEXT NOT NULL DEFAULT 'Open',
  active BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'main',
  is_market_active BOOLEAN NOT NULL DEFAULT true
);

-- BIDS (Bets)
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  user_phone TEXT,
  game_type TEXT,
  digit TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  market_name TEXT NOT NULL REFERENCES public.markets(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','won','lost')),
  win_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  session TEXT NOT NULL DEFAULT 'Open' CHECK (session IN ('Open','Close')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  user_phone TEXT,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdraw')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  method TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','rejected','failed')),
  order_id TEXT UNIQUE,
  gateway_response JSONB,
  webhook_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- RESULTS HISTORY
CREATE TABLE IF NOT EXISTS public.results_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_name TEXT NOT NULL REFERENCES public.markets(id),
  result TEXT NOT NULL,
  date_str TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(market_name, date_str)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- 'ALL' or UUID string
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- APP CONFIG (Key-Value Store)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-seed config
INSERT INTO public.app_config (key, value) VALUES
  ('settings', '{"upiId":"admin@upi","notice":"Welcome","whatsapp":""}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_config (key, value) VALUES
  ('maintenance', '{"active":false,"message":"Server under maintenance. Please try again later."}')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. INDEXES (Performance)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON public.bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_market_status ON public.bids(market_name, status);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_results_history_market ON public.results_history(market_name);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- =====================================================
-- 3. HELPER FUNCTIONS (Need to be defined before RLS)
-- =====================================================

-- ADMIN AUTH CHECK (Security Definer bypasses RLS to prevent infinite recursion)
CREATE OR REPLACE FUNCTION public.check_admin_status()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admin_users_all" ON public.users FOR ALL USING (public.check_admin_status());

-- MARKETS (Everyone reads, admin writes)
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "markets_select_all" ON public.markets FOR SELECT USING (true);
CREATE POLICY "admin_markets_all" ON public.markets FOR ALL USING (public.check_admin_status());

-- BIDS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bids_select_own" ON public.bids FOR SELECT USING (auth.uid() = user_id);
-- SECURITY FIX: Removed "bids_insert_own" policy. Bids must be inserted via RPC to prevent balance bypass.
CREATE POLICY "admin_bids_all" ON public.bids FOR ALL USING (public.check_admin_status());

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txns_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "txns_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_txns_all" ON public.transactions FOR ALL USING (public.check_admin_status());

-- RESULTS HISTORY (Everyone reads)
ALTER TABLE public.results_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_select_all" ON public.results_history FOR SELECT USING (true);
CREATE POLICY "admin_results_all" ON public.results_history FOR ALL USING (public.check_admin_status());

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs_select_own" ON public.notifications FOR SELECT USING (user_id = 'ALL' OR user_id = auth.uid()::text);
CREATE POLICY "admin_notifs_all" ON public.notifications FOR ALL USING (public.check_admin_status());

-- APP CONFIG (Everyone reads, admin writes)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select_all" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "admin_config_all" ON public.app_config FOR ALL USING (public.check_admin_status());


-- =====================================================
-- 4. DATABASE FUNCTIONS (RPC)
-- =====================================================

-- 4A. AUTO-CREATE USER ON FIRST LOGIN (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    500  -- Welcome Bonus
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: When auth.users gets new entry, create public.users entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4B. PLACE BET (Server-side time validation + atomic balance deduction)
CREATE OR REPLACE FUNCTION public.place_bet(
  p_bets JSONB,
  p_total_amount DECIMAL,
  p_market_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_balance DECIMAL;
  v_is_blocked BOOLEAN;
  v_user_phone TEXT;
  v_market RECORD;
  v_now_ist TIMESTAMPTZ;
  v_current_minutes INT;
  v_open_mins INT;
  v_close_mins INT;
  v_bet JSONB;
  v_bet_type TEXT;
  v_bet_session TEXT;
  v_is_full_game BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please Login first!';
  END IF;

  -- Get user data (FOR UPDATE locks the row to prevent race conditions)
  SELECT balance, is_blocked, phone INTO v_balance, v_is_blocked, v_user_phone
  FROM public.users WHERE id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found!';
  END IF;

  IF v_is_blocked THEN
    RAISE EXCEPTION 'Account Blocked! Contact Admin.';
  END IF;

  IF v_balance < p_total_amount THEN
    RAISE EXCEPTION 'Insufficient Balance!';
  END IF;

  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid Amount!';
  END IF;

  -- Get market data
  SELECT * INTO v_market FROM public.markets WHERE id = p_market_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found!';
  END IF;

  -- SERVER TIME (IST) - Cannot be manipulated by client!
  v_now_ist := now() AT TIME ZONE 'Asia/Kolkata';
  v_current_minutes := EXTRACT(HOUR FROM v_now_ist)::INT * 60
                      + EXTRACT(MINUTE FROM v_now_ist)::INT;
  v_open_mins := split_part(v_market.open_time_24, ':', 1)::INT * 60
                + split_part(v_market.open_time_24, ':', 2)::INT;
  v_close_mins := split_part(v_market.close_time_24, ':', 1)::INT * 60
                 + split_part(v_market.close_time_24, ':', 2)::INT;

  -- Validate each bet
  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets) LOOP
    v_bet_type := LOWER(COALESCE(v_bet->>'type', 'single'));
    v_bet_session := COALESCE(v_bet->>'session', 'Open');
    v_is_full_game := v_bet_type IN ('jodi', 'hs', 'fs');

    -- Market Closed
    IF v_current_minutes >= v_close_mins THEN
      RAISE EXCEPTION 'Market is Closed! Betting stopped.';
    END IF;

    -- Jodi/Sangam after open time
    IF v_is_full_game AND v_current_minutes >= v_open_mins THEN
      RAISE EXCEPTION 'Time Up for Jodi/Sangam!';
    END IF;

    -- Open Session after open time
    IF v_bet_session = 'Open' AND NOT v_is_full_game AND v_current_minutes >= v_open_mins THEN
      RAISE EXCEPTION 'Open Session Time Up! Please select Close.';
    END IF;
  END LOOP;

  -- SECURITY FIX: Validate Actual Total
  DECLARE
    v_actual_total DECIMAL := 0;
  BEGIN
    FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets) LOOP
      IF (v_bet->>'amount')::DECIMAL <= 0 THEN
        RAISE EXCEPTION 'Invalid Bet Amount!';
      END IF;
      v_actual_total := v_actual_total + (v_bet->>'amount')::DECIMAL;
    END LOOP;
    
    IF v_actual_total != p_total_amount THEN
      RAISE EXCEPTION 'Total amount mismatch! Possible spoofing detected.';
    END IF;
  END;

  -- Deduct balance (atomic!)
  UPDATE public.users SET balance = balance - p_total_amount WHERE id = v_user_id;

  -- Insert all bets
  INSERT INTO public.bids (user_id, user_phone, game_type, digit, amount, market_name, type, session)
  SELECT
    v_user_id,
    v_user_phone,
    bet->>'game',
    TRIM(bet->>'digit'),
    (bet->>'amount')::DECIMAL,
    p_market_name,
    bet->>'type',
    COALESCE(bet->>'session', 'Open')
  FROM jsonb_array_elements(p_bets) AS bet;

  RETURN TRUE;
END;
$$;


-- 4C. WITHDRAW REQUEST (Atomic balance deduction + transaction creation)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount DECIMAL,
  p_method TEXT,
  p_details TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_balance DECIMAL;
  v_user_phone TEXT;
BEGIN
  v_user_id := auth.uid();

  SELECT balance, phone INTO v_balance, v_user_phone
  FROM public.users WHERE id = v_user_id FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Balance for Withdraw!';
  END IF;

  -- Deduct balance
  UPDATE public.users SET balance = balance - p_amount WHERE id = v_user_id;

  -- Create transaction
  INSERT INTO public.transactions (user_id, user_phone, type, amount, method, details, status)
  VALUES (v_user_id, v_user_phone, 'withdraw', p_amount, p_method, p_details, 'pending');

  RETURN TRUE;
END;
$$;


-- 4D. APPROVE TRANSACTION (Admin - atomic balance credit)
CREATE OR REPLACE FUNCTION public.approve_transaction(
  p_txn_id UUID,
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
  v_status TEXT;
BEGIN
  v_admin_id := auth.uid();

  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check current status
  SELECT status INTO v_status FROM public.transactions WHERE id = p_txn_id;
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Already Processed';
  END IF;

  -- If deposit, add balance
  IF p_type = 'deposit' THEN
    UPDATE public.users SET balance = balance + p_amount WHERE id = p_user_id;
  END IF;

  -- Mark as success
  UPDATE public.transactions SET status = 'success', updated_at = now() WHERE id = p_txn_id;

  RETURN TRUE;
END;
$$;


-- 4E. REJECT TRANSACTION (Admin - refund for withdrawals)
CREATE OR REPLACE FUNCTION public.reject_transaction(
  p_txn_id UUID,
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
  v_status TEXT;
BEGIN
  v_admin_id := auth.uid();

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT status INTO v_status FROM public.transactions WHERE id = p_txn_id;
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Already Processed';
  END IF;

  -- Refund for withdrawal rejection
  IF p_type = 'withdraw' THEN
    UPDATE public.users SET balance = balance + p_amount WHERE id = p_user_id;
  END IF;

  UPDATE public.transactions SET status = 'rejected', updated_at = now() WHERE id = p_txn_id;

  RETURN TRUE;
END;
$$;


-- 4F. DECLARE RESULT AND PAY WINNERS
CREATE OR REPLACE FUNCTION public.declare_result_and_pay(
  p_market_name TEXT,
  p_input TEXT,
  p_session TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
  v_current_result TEXT;
  v_parts TEXT[];
  v_input_parts TEXT[];
  v_panna TEXT;
  v_digit TEXT;
  v_final_result TEXT;
  v_final_open_panna TEXT;
  v_final_jodi TEXT;
  v_final_close_panna TEXT;
  v_final_open_digit TEXT;
  v_final_close_digit TEXT;
  v_bet RECORD;
  v_is_win BOOLEAN;
  v_should_settle BOOLEAN;
  v_rate DECIMAL;
  v_win_amount DECIMAL;
  v_winner_count INT := 0;
  v_today TEXT;
  v_bet_type TEXT;
  v_bet_digit TEXT;
  v_bet_session TEXT;
  v_bet_parts TEXT[];
BEGIN
  v_admin_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get current market result
  SELECT result INTO v_current_result FROM public.markets WHERE id = p_market_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found!';
  END IF;

  IF v_current_result IS NULL THEN v_current_result := '***-**-***'; END IF;
  v_parts := string_to_array(v_current_result, '-');

  -- Parse input
  v_input_parts := string_to_array(TRIM(p_input), '-');
  IF array_length(v_input_parts, 1) != 2 THEN
    RAISE EXCEPTION 'Format Invalid! Use: Panna-Digit (e.g., 145-0)';
  END IF;

  v_panna := TRIM(v_input_parts[1]);
  v_digit := TRIM(v_input_parts[2]);

  -- Build result string
  IF p_session = 'Open' THEN
    v_parts[1] := v_panna;
    IF v_parts[2] = '**' OR length(v_parts[2]) < 2 THEN
      v_parts[2] := v_digit || '*';
    ELSE
      v_parts[2] := v_digit || substring(v_parts[2] from 2 for 1);
    END IF;
  ELSE
    v_parts[3] := v_panna;
    IF v_parts[2] = '**' OR length(v_parts[2]) < 2 THEN
      v_parts[2] := '*' || v_digit;
    ELSE
      v_parts[2] := substring(v_parts[2] from 1 for 1) || v_digit;
    END IF;
  END IF;

  v_final_result := array_to_string(v_parts, '-');
  v_final_open_panna := v_parts[1];
  v_final_jodi := v_parts[2];
  v_final_close_panna := v_parts[3];
  v_final_open_digit := substring(v_final_jodi from 1 for 1);
  v_final_close_digit := substring(v_final_jodi from 2 for 1);

  -- Process pending bids
  FOR v_bet IN
    SELECT b.id AS bid_id, b.user_id, b.digit, b.amount, b.type, b.session
    FROM public.bids b
    WHERE b.market_name = p_market_name AND b.status = 'pending'
  LOOP
    v_should_settle := FALSE;
    v_is_win := FALSE;
    v_bet_type := LOWER(COALESCE(v_bet.type, ''));
    v_bet_digit := TRIM(v_bet.digit);
    v_bet_session := COALESCE(v_bet.session, 'Open');

    -- OPEN Session Logic
    IF p_session = 'Open' THEN
      IF v_bet_session = 'Open' AND v_bet_type NOT IN ('jodi', 'hs', 'fs') THEN
        v_should_settle := TRUE;
        IF v_bet_type = 'single' AND v_bet_digit = v_final_open_digit THEN v_is_win := TRUE; END IF;
        IF v_bet_type IN ('sp', 'dp', 'tp') AND v_bet_digit = v_final_open_panna THEN v_is_win := TRUE; END IF;
      END IF;
    END IF;

    -- CLOSE Session Logic
    IF p_session = 'Close' THEN
      -- Close bets
      IF v_bet_session = 'Close' THEN
        v_should_settle := TRUE;
        IF v_bet_type = 'single' AND v_bet_digit = v_final_close_digit THEN v_is_win := TRUE; END IF;
        IF v_bet_type IN ('sp', 'dp', 'tp') AND v_bet_digit = v_final_close_panna THEN v_is_win := TRUE; END IF;
      END IF;

      -- Full game bets (Jodi, Sangam)
      IF v_bet_type IN ('jodi', 'hs', 'fs') THEN
        v_should_settle := TRUE;

        IF v_bet_type = 'jodi' AND v_bet_digit = v_final_jodi THEN v_is_win := TRUE; END IF;

        IF v_bet_type = 'fs' THEN
          v_bet_parts := string_to_array(v_bet_digit, '-');
          IF array_length(v_bet_parts, 1) = 2 AND v_bet_parts[1] = v_final_open_panna AND v_bet_parts[2] = v_final_close_panna THEN
            v_is_win := TRUE;
          END IF;
        END IF;

        IF v_bet_type = 'hs' THEN
          v_bet_parts := string_to_array(v_bet_digit, '-');
          IF array_length(v_bet_parts, 1) = 2 THEN
            IF (TRIM(v_bet_parts[1]) = v_final_open_panna AND TRIM(v_bet_parts[2]) = v_final_close_digit)
               OR (TRIM(v_bet_parts[1]) = v_final_open_digit AND TRIM(v_bet_parts[2]) = v_final_close_panna) THEN
              v_is_win := TRUE;
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;

    -- Settle bet
    IF v_should_settle THEN
      IF v_is_win THEN
        -- Get rate
        v_rate := CASE v_bet_type
          WHEN 'single' THEN 9
          WHEN 'jodi'   THEN 90
          WHEN 'sp'     THEN 140
          WHEN 'dp'     THEN 280
          WHEN 'tp'     THEN 600
          WHEN 'hs'     THEN 1000
          WHEN 'fs'     THEN 10000
          ELSE 1
        END;

        v_win_amount := v_bet.amount * v_rate;

        UPDATE public.bids SET status = 'won', win_amount = v_win_amount WHERE id = v_bet.bid_id;
        UPDATE public.users SET balance = balance + v_win_amount WHERE id = v_bet.user_id;
        v_winner_count := v_winner_count + 1;
      ELSE
        UPDATE public.bids SET status = 'lost', win_amount = 0 WHERE id = v_bet.bid_id;
      END IF;
    END IF;
  END LOOP;

  -- Update market result
  UPDATE public.markets SET result = v_final_result WHERE id = p_market_name;

  -- Save to history
  v_today := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');
  INSERT INTO public.results_history (market_name, result, date_str)
  VALUES (p_market_name, v_final_result, v_today)
  ON CONFLICT (market_name, date_str) DO UPDATE SET result = v_final_result, created_at = now();

  RETURN 'Success! Result: ' || v_final_result || '. ' || v_winner_count || ' Winners Paid.';
END;
$$;


-- 4G. REVERT MARKET RESULT
CREATE OR REPLACE FUNCTION public.revert_market_result(
  p_market_name TEXT,
  p_session TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_reverted_count INT := 0;
  v_current_result TEXT;
  v_parts TEXT[];
  v_jodi TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Revert settled bets for this session
  FOR v_bet IN
    SELECT id AS bid_id, user_id, status, win_amount, session
    FROM public.bids
    WHERE market_name = p_market_name
      AND status IN ('won', 'lost')
      AND session = p_session
  LOOP
    -- If user won, deduct winnings
    IF v_bet.status = 'won' THEN
      UPDATE public.users SET balance = balance - v_bet.win_amount WHERE id = v_bet.user_id;
    END IF;

    -- Reset bet to pending
    UPDATE public.bids SET status = 'pending', win_amount = 0 WHERE id = v_bet.bid_id;
    v_reverted_count := v_reverted_count + 1;
  END LOOP;

  -- Reset market result
  SELECT result INTO v_current_result FROM public.markets WHERE id = p_market_name;
  IF v_current_result IS NOT NULL THEN
    v_parts := string_to_array(COALESCE(v_current_result, '***-**-***'), '-');

    IF p_session = 'Open' THEN
      v_parts[1] := '***';
      v_jodi := v_parts[2];
      IF length(v_jodi) = 2 THEN
        v_parts[2] := '*' || substring(v_jodi from 2 for 1);
      ELSE
        v_parts[2] := '**';
      END IF;
    ELSE
      v_parts[3] := '***';
      v_jodi := v_parts[2];
      IF length(v_jodi) = 2 THEN
        v_parts[2] := substring(v_jodi from 1 for 1) || '*';
      ELSE
        v_parts[2] := '**';
      END IF;
    END IF;

    UPDATE public.markets SET result = array_to_string(v_parts, '-') WHERE id = p_market_name;
  END IF;

  RETURN 'Revert Successful! ' || v_reverted_count || ' bets reset. Money recovered from winners.';
END;
$$;


-- 4H. PROCESS WEBHOOK DEPOSIT (called from Vercel webhook with service_role key)
CREATE OR REPLACE FUNCTION public.process_webhook_deposit(
  p_order_id TEXT,
  p_gateway_response JSONB
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn RECORD;
  v_new_balance DECIMAL;
BEGIN
  -- Find transaction
  SELECT id, user_id, amount, status INTO v_txn
  FROM public.transactions WHERE order_id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Already processed check (prevents double credit)
  IF v_txn.status = 'success' THEN
    RETURN 'Already Updated';
  END IF;

  -- Update transaction
  UPDATE public.transactions
  SET status = 'success', webhook_verified = true, gateway_response = p_gateway_response, updated_at = now()
  WHERE id = v_txn.id;

  -- Add balance
  UPDATE public.users SET balance = balance + v_txn.amount WHERE id = v_txn.user_id
  RETURNING balance INTO v_new_balance;

  RETURN 'Balance Added Successfully';
END;
$$;


-- 4I. (Function moved to top of file)


-- =====================================================
-- 5. REALTIME (Enable for specific tables)
-- =====================================================

-- Enable realtime for markets and app_config
ALTER PUBLICATION supabase_realtime ADD TABLE public.markets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;

-- =====================================================
-- 6. SECURITY TRIGGERS (Added during Audit)
-- =====================================================

-- 6A. PROTECT USER PROFILE ESCALATION
CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates from Supabase Dashboard (auth.uid() is null) or existing admins
  IF auth.uid() IS NOT NULL AND NOT public.check_admin_status() THEN
    NEW.balance := OLD.balance;
    NEW.is_admin := OLD.is_admin;
    NEW.is_blocked := OLD.is_blocked;
    NEW.phone := OLD.phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_update ON public.users;
CREATE TRIGGER on_user_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields();


-- 6B. PROTECT TRANSACTION INSERTS
CREATE OR REPLACE FUNCTION public.protect_transaction_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.check_admin_status() THEN
    NEW.status := 'pending';
    NEW.webhook_verified := false;
    NEW.gateway_response := NULL;
    IF NEW.amount <= 0 THEN
       RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_txn_insert ON public.transactions;
CREATE TRIGGER on_txn_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_transaction_insert();
