// api/webhook.js
// Supabase Webhook Handler - Replaces Firebase Admin
// Receives payment callbacks from TranzUPI gateway
import { createClient } from '@supabase/supabase-js';

// --- 1. SUPABASE ADMIN SETUP ---
// Uses service_role key for server-side operations (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Sirf POST request allow karo
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // --- 1.5 API KEY VALIDATION (SECURITY FIX) ---
    // Extract token from Headers (x-api-key or authorization) or Body
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'] || req.body?.api_key;
    const serverKey = process.env.TRANZ_API_KEY;

    // Strict string comparison (prevents bypass if env is misconfigured)
    if (!serverKey || serverKey === 'your-tranzupi-api-key-here') {
      console.error("CRITICAL: TRANZ_API_KEY is not configured on the server!");
      return res.status(500).json({ status: false, msg: "Server Configuration Error" });
    }

    if (apiKey !== serverKey) {
      console.warn("Webhook Security Warning: Unauthorized access attempt!");
      return res.status(401).json({ status: false, msg: "Unauthorized: Invalid API Key" });
    }

    // --- 2. DATA RECEIVE KARO ---
    const data = req.body;
    
    console.log("Webhook Received:", data);

    const status = data.status; // 'SUCCESS' or 'FAILED'
    const orderId = data.order_id; // TXN ID
    
    if (!orderId) return res.status(400).json({ status: false, msg: "No Order ID" });

    // --- 3. DATABASE UPDATE KARO ---
    if (status === 'SUCCESS') {
        
        // Use the RPC function for atomic update
        const { data: result, error } = await supabase.rpc('process_webhook_deposit', {
          p_order_id: orderId,
          p_gateway_response: data,
        });

        if (error) {
            console.error("Webhook RPC Error:", error);
            
            // Check if it's a "not found" error
            if (error.message?.includes('not found')) {
                return res.status(404).json({ status: false, msg: "Transaction not found in DB" });
            }
            
            // Already processed
            if (error.message?.includes('Already')) {
                return res.status(200).json({ status: true, msg: "Already Updated" });
            }
            
            return res.status(500).json({ status: false, msg: error.message });
        }

        console.log(`Webhook: Balance Updated for ${orderId}`);
        return res.status(200).json({ status: true, msg: result || "Balance Added Successfully" });

    } else {
        // Agar Failed hai to bas status update kar do
        const { data: txns } = await supabase
            .from('transactions')
            .select('id')
            .eq('order_id', orderId)
            .limit(1);

        if (txns && txns.length > 0) {
            await supabase
                .from('transactions')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', txns[0].id);
        }

        return res.status(200).json({ status: true, msg: "Marked as Failed" });
    }

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
}