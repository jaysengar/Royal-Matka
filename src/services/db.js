// src/services/db.js
// Supabase Database Service - Replaces all Firebase Firestore operations
// ALL function signatures remain identical for backward compatibility
import { supabase } from '../supabase';

// --- 1. USER & WALLET FUNCTIONS ---

export const getUserData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // maybeSingle() returns data=null, error=null if 0 rows
  if (!data && !error) {
    // User not found in public.users — trigger should have created it
    // but just in case, return defaults
    return { phone: user.phone, balance: 500, isBlocked: false };
  }

  if (error) throw error;

  // Map snake_case → camelCase for backward compatibility with existing components
  return {
    phone: data.phone,
    name: data.name,
    balance: data.balance,
    isBlocked: data.is_blocked,
    isAdmin: data.is_admin,
    createdAt: data.created_at,
  };
};

export const updateUserName = async (name) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from('users')
    .update({ name: name.trim() })
    .eq('id', user.id)
    .select();

  if (error) throw error;

  // If the user's row was missing from public.users (e.g. trigger failed)
  // then data array will be empty. We must insert the row manually.
  if (!data || data.length === 0) {
     const { error: insertErr } = await supabase.from('users').insert({
         id: user.id,
         phone: user.phone,
         name: name.trim(),
         balance: 10, // 10 RS Signup Bonus
         is_blocked: false,
         is_admin: false
     });
     if (insertErr) throw insertErr;
  }
  
  return true;
};

// --- 2. BETTING FUNCTIONS ---

export const placeBid = async (bets, totalAmount, marketName) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please Login first!");

  // Server-side RPC handles time validation, balance check, and atomic operations
  const { data, error } = await supabase.rpc('place_bet', {
    p_bets: bets.map(bet => ({
      game: bet.game,
      digit: String(bet.digit).trim(),
      amount: Number(bet.amount),
      type: bet.type,
      session: bet.session || 'Open',
    })),
    p_total_amount: totalAmount,
    p_market_name: marketName,
  });

  if (error) {
    // Extract readable message from PostgreSQL error
    const msg = error.message || 'Transaction Failed';
    throw msg;
  }

  return true;
};

// --- 3. TRANSACTION FUNCTIONS (Deposit/Withdraw) ---

export const sendTransactionRequest = async (type, amount, method, details) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw "Login First";

  const amountNum = Number(amount);

  if (type === 'withdraw') {
    // Use RPC for atomic balance deduction + transaction creation
    const { error } = await supabase.rpc('request_withdrawal', {
      p_amount: amountNum,
      p_method: method,
      p_details: details,
    });

    if (error) throw error.message || "Withdrawal Failed";
    return true;
  } else {
    // Deposit Request (just create record, no balance change yet)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      user_phone: user.phone,
      type: 'deposit',
      amount: amountNum,
      method: method,
      details: details,
      status: 'pending',
    });

    if (error) throw error.message || "Deposit Request Failed";
    return true;
  }
};

// --- 4. ADMIN FUNCTIONS ---

export const getPendingRequests = async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map to original format for compatibility
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    userPhone: row.user_phone,
    type: row.type,
    amount: row.amount,
    method: row.method,
    details: row.details,
    status: row.status,
    date: row.created_at,
    orderId: row.order_id,
  }));
};

export const approveRequest = async (reqId, userId, amount, type) => {
  const { error } = await supabase.rpc('approve_transaction', {
    p_txn_id: reqId,
    p_user_id: userId,
    p_amount: Number(amount),
    p_type: type,
  });

  if (error) throw error.message || "Approval Failed";
  return true;
};

export const rejectRequest = async (reqId, userId, amount, type) => {
  const { error } = await supabase.rpc('reject_transaction', {
    p_txn_id: reqId,
    p_user_id: userId,
    p_amount: Number(amount),
    p_type: type,
  });

  if (error) throw error.message || "Rejection Failed";
  return true;
};

// --- 5. MARKET MANAGEMENT ---

export const listenToMarkets = (callback) => {
  // Initial fetch
  const fetchMarkets = async () => {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('open_time_24', { ascending: true });

    if (!error && data) {
      callback(data.map(mapMarketRow));
    }
  };

  fetchMarkets();

  // Realtime subscription
  const channel = supabase
    .channel('markets-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'markets' },
      () => {
        // Re-fetch all markets on any change
        fetchMarkets();
      }
    )
    .subscribe();

  // Return unsubscribe function (matches Firebase onSnapshot pattern)
  return () => {
    supabase.removeChannel(channel);
  };
};

// Helper: Map DB row to component format
const mapMarketRow = (row) => ({
  id: row.id,
  name: row.name,
  openTime24: row.open_time_24,
  closeTime24: row.close_time_24,
  openTime: row.open_time,
  closeTime: row.close_time,
  result: row.result,
  status: row.status,
  active: row.active,
  category: row.category,
  isMarketActive: row.is_market_active,
});

export const updateMarketResult = async (marketId, newResult, openCloseStatus) => {
  const { error } = await supabase
    .from('markets')
    .update({
      result: newResult.trim(),
      status: openCloseStatus,
    })
    .eq('id', marketId);

  if (error) throw error;
};

// --- 6. RESULT DECLARE ---

export const declareResultAndPay = async (marketName, input, session) => {
  console.log(`Processing: ${marketName} | Input: ${input} | Session: ${session}`);

  const { data, error } = await supabase.rpc('declare_result_and_pay', {
    p_market_name: marketName,
    p_input: input.trim(),
    p_session: session,
  });

  if (error) throw error.message || "Result Declaration Failed";
  return data;
};

// Rate Helper (kept for client-side analysis)
const getRate = (type) => {
  switch (type?.toLowerCase()) {
    case 'single': return 9.5;
    case 'jodi': return 95;
    case 'sp': return 150;
    case 'dp': return 300;
    case 'tp': return 600;
    case 'hs': return 1000;
    case 'fs': return 10000;
    default: return 1;
  }
};

// --- 7. HISTORY & EXTRAS ---

export const getMyBets = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    userPhone: row.user_phone,
    gameType: row.game_type,
    digit: row.digit,
    amount: row.amount,
    marketName: row.market_name,
    date: row.created_at,
    status: row.status,
    winAmount: row.win_amount,
    type: row.type,
    session: row.session,
  }));
};

export const getMyTransactions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    userPhone: row.user_phone,
    type: row.type,
    amount: row.amount,
    method: row.method,
    details: row.details,
    status: row.status,
    date: row.created_at,
    orderId: row.order_id,
  }));
};

export const createMarket = async (marketData) => {
  const { error } = await supabase.from('markets').upsert({
    id: marketData.name,
    name: marketData.name,
    open_time_24: marketData.openTime24,
    close_time_24: marketData.closeTime24,
    open_time: marketData.openTime,
    close_time: marketData.closeTime,
    status: 'Open',
    result: '***-**-***',
    active: marketData.active || false,
    category: marketData.category || 'main',
    is_market_active: true,
  });

  if (error) throw error;
};

export const deleteMarket = async (marketId) => {
  // Removed window.confirm - UI handles confirmation now
  const { error } = await supabase
    .from('markets')
    .delete()
    .eq('id', marketId);

  if (error) throw error;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    phone: row.phone,
    balance: row.balance,
    isBlocked: row.is_blocked,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  }));
};

export const updateUserBalance = async (userId, newBalance) => {
  const { error } = await supabase
    .from('users')
    .update({ balance: Number(newBalance) })
    .eq('id', userId);

  if (error) throw error;
};

export const toggleUserBlock = async (userId, currentStatus) => {
  const { error } = await supabase
    .from('users')
    .update({ is_blocked: !currentStatus })
    .eq('id', userId);

  if (error) throw error;
};

export const getMarketChart = async (marketName) => {
  const { data, error } = await supabase
    .from('results_history')
    .select('*')
    .eq('market_name', marketName)
    .order('date_str', { ascending: false });

  if (error) return [];

  return (data || []).map(row => ({
    marketName: row.market_name,
    result: row.result,
    dateStr: row.date_str,
    date: row.created_at,
  }));
};

export const getAppConfig = async () => {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('key', 'settings')
    .single();

  if (error || !data) {
    return { upiId: 'admin@upi', notice: 'Welcome', whatsapp: '' };
  }

  return data.value;
};

export const updateAppConfig = async (newSettings) => {
  const { error } = await supabase
    .from('app_config')
    .update({
      value: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'settings');

  if (error) throw error;
};

export const sendNotification = async (userId, title, body, type = 'info') => {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: title,
      body: body,
      type: type,
    });

    // Trigger Native Push Notification via Vercel API
    fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body })
    }).catch(err => console.error("Push API Error:", err));

  } catch (error) {
    console.error("Notif Error:", error);
  }
};

export const getNotifications = async (userId) => {
  try {
    // RLS policy handles filtering (user_id = 'ALL' OR user_id = auth.uid())
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      type: row.type,
      date: row.created_at,
    }));
  } catch (error) {
    return [];
  }
};

export const activateMarket = async (marketId, marketName, currentResult, isActive) => {
  if (isActive) {
    // Save previous result to history if exists
    if (currentResult && currentResult !== '***-**-***') {
      const today = new Date().toLocaleDateString('en-GB');
      await supabase.from('results_history').upsert({
        market_name: marketName,
        result: currentResult,
        date_str: today,
      }, { onConflict: 'market_name,date_str' });
    }

    // Reset & Activate
    await supabase
      .from('markets')
      .update({ active: true, result: '***-**-***', status: 'Open' })
      .eq('id', marketId);
  } else {
    // Deactivate
    await supabase
      .from('markets')
      .update({ active: false })
      .eq('id', marketId);
  }
};

export const getMaintenanceStatus = async () => {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'maintenance')
    .single();

  if (error || !data) return false;
  return data.value?.active || false;
};

export const setMaintenanceMode = async (status) => {
  const { error } = await supabase
    .from('app_config')
    .update({
      value: {
        active: status,
        message: 'Server under maintenance. Please try again later.',
      },
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'maintenance');

  if (error) throw error;
};

// --- ANALYSIS & RECOMMENDATION SYSTEM ---

// Helper: Generate All Pannas with Types & Digits
const generateFullPannaMap = () => {
  let map = [];

  for (let i = 0; i <= 9; i++) {
    for (let j = i; j <= 9; j++) {
      for (let k = j; k <= 9; k++) {
        const panna = `${i}${j}${k}`;
        const sum = i + j + k;
        const single = String(sum).slice(-1);

        let type = 'sp';
        if (i === j && j === k) {
          type = 'tp';
        } else if (i === j || j === k || i === k) {
          type = 'dp';
        }

        map.push({ panna, single, type });
      }
    }
  }
  return map;
};

const MASTER_PANNA_MAP = generateFullPannaMap();

export const getMarketAnalysis = async (marketName, session, existingOpenResult = null) => {
  // Fetch pending bids for this market
  const { data: betsData, error } = await supabase
    .from('bids')
    .select('*')
    .eq('market_name', marketName)
    .eq('status', 'pending');

  if (error) throw error;

  const bets = betsData || [];

  // 1. DATA AGGREGATION
  let load = {
    single: {},
    jodi: {},
    panna: {},
    totalBetAmount: 0,
  };

  for (let i = 0; i <= 9; i++) load.single[String(i)] = 0;

  bets.forEach(bet => {
    const betSession = bet.session || 'Open';
    const betType = (bet.type || 'single').toLowerCase();

    let isRelevant = false;

    if (session === 'Open') {
      if (betSession === 'Open' && !['jodi', 'hs', 'fs'].includes(betType)) isRelevant = true;
    } else {
      if (betSession === 'Close' || ['jodi', 'hs', 'fs'].includes(betType)) isRelevant = true;
    }

    if (isRelevant) {
      load.totalBetAmount += Number(bet.amount);

      if (betType === 'single') {
        const d = String(bet.digit);
        load.single[d] = (load.single[d] || 0) + Number(bet.amount);
      }

      if (['sp', 'dp', 'tp'].includes(betType)) {
        const p = String(bet.digit);
        load.panna[p] = (load.panna[p] || 0) + Number(bet.amount);
      }

      if (betType === 'jodi' && session === 'Close') {
        const j = String(bet.digit);
        load.jodi[j] = (load.jodi[j] || 0) + Number(bet.amount);
      }
    }
  });

  // 2. RECOMMENDATION ENGINE
  let scenarios = [];

  const RATES = {
    single: 9.5,
    jodi: 95,
    sp: 150,
    dp: 300,
    tp: 600,
  };

  MASTER_PANNA_MAP.forEach(({ panna, single, type }) => {
    const pannaLoad = load.panna[panna] || 0;
    const pannaRate = RATES[type];
    const pannaPayout = pannaLoad * pannaRate;

    const singleLoad = load.single[single] || 0;
    const singlePayout = singleLoad * RATES.single;

    let jodiPayout = 0;
    let resultingJodi = '--';

    if (session === 'Close' && existingOpenResult) {
      const openDigit = existingOpenResult;
      resultingJodi = `${openDigit}${single}`;

      const jodiLoad = load.jodi[resultingJodi] || 0;
      jodiPayout = jodiLoad * RATES.jodi;
    }

    const totalPayout = pannaPayout + singlePayout + jodiPayout;
    const profit = load.totalBetAmount - totalPayout;

    scenarios.push({
      panna,
      type: type.toUpperCase(),
      single,
      jodi: resultingJodi,
      pannaLoad,
      singleLoad,
      jodiLoad: session === 'Close' ? (load.jodi[resultingJodi] || 0) : 0,
      totalPayout,
      profit,
    });
  });

  scenarios.sort((a, b) => b.profit - a.profit);

  return {
    summary: {
      totalBets: bets.length,
      totalCollection: load.totalBetAmount,
    },
    detailedLoad: load,
    recommendation: scenarios.slice(0, 30),
  };
};

// --- REVERT RESULT SYSTEM ---

export const revertMarketResult = async (marketName, session) => {
  console.log(`Reverting Result for: ${marketName} | Session: ${session}`);

  const { data, error } = await supabase.rpc('revert_market_result', {
    p_market_name: marketName,
    p_session: session,
  });

  if (error) throw error.message || "Revert Failed";
  return data;
};

// --- REALTIME: MAINTENANCE LISTENER ---

export const listenToMaintenance = (callback) => {
  // Initial fetch
  const fetchStatus = async () => {
    const status = await getMaintenanceStatus();
    callback(status);
  };

  fetchStatus();

  // Realtime subscription on app_config table
  const channel = supabase
    .channel('maintenance-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_config',
        filter: 'key=eq.maintenance',
      },
      (payload) => {
        const isActive = payload.new?.value?.active || false;
        callback(isActive);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// --- ADMIN AUTH CHECK ---
export const checkAdminStatus = async () => {
  const { data, error } = await supabase.rpc('check_admin_status');
  if (error) return false;
  return data === true;
};

// --- FCM TOKEN HANDLING ---
export const saveFcmToken = async (userId, token) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ fcm_token: token })
      .eq('id', userId);
    if (error) console.error("Error saving FCM Token:", error);
  } catch (err) {
    console.error("FCM Token Catch:", err);
  }
};