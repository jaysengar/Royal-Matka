// src/services/paymentService.js
// Supabase Payment Service - Replaces Firebase-based payment logic
// TranzUPI integration preserved as-is
import { supabase } from '../supabase';

// ⚠️ APNI VERCEL WEBSITE KA LINK YAHAN DAALO
const VERCEL_DOMAIN = "https://royal-matka-app.vercel.app";

// 1. PAYMENT INITIATE
export const initiatePayment = async (amount, user) => {
    try {
        // Note: TranzUPI API key is now in Vercel env vars only
        // Client just tells the proxy the amount and order details
        const orderId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const mobile = user.phone ? user.phone.replace('+91', '') : "0000000000";
        const formattedAmount = Number(amount).toFixed(2);

        // Database Entry via Supabase
        const { error: insertError } = await supabase.from('transactions').insert({
            order_id: orderId,
            user_id: user.id,
            user_phone: user.phone,
            amount: Number(amount),
            status: 'pending',
            type: 'deposit',
            method: 'TranzUPI',
        });

        if (insertError) throw new Error("Could not create transaction record");

        // 🔥 PROXY CALL — API key is now server-side in Vercel env vars
        const response = await fetch(`${VERCEL_DOMAIN}/api/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: "create-order",
                // TranzUPI Parameters
                customer_mobile: mobile,
                amount: formattedAmount,
                order_id: orderId,
                redirect_url: `${VERCEL_DOMAIN}/payment-status`,
                remark1: "Wallet Recharge",
                remark2: user.id,
            })
        });

        const data = await response.json();
        console.log("Gateway Response:", data);

        if (data.status === true && (data.result?.payment_url || data.data?.payment_url)) {
            return data.result?.payment_url || data.data?.payment_url;
        } else {
            throw new Error(data.message || "Failed to generate payment link");
        }

    } catch (e) {
        console.error("Initiate Payment Error:", e);
        throw typeof e === 'string' ? e : (e.message || "Connection Failed. Try again.");
    }
};

// 2. STATUS CHECK (Client-side verification as backup to webhook)
export const verifyAndAddBalance = async (orderId) => {
    try {
        // Status check through proxy
        const response = await fetch(`${VERCEL_DOMAIN}/api/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: "check-order-status",
                order_id: orderId,
            })
        });

        const data = await response.json();

        const isSuccess =
            (data.status === true && data.data?.status === "SUCCESS") ||
            (data.status === "SUCCESS" && data.result?.status === "SUCCESS");

        if (isSuccess) {
            return await processSafeDeposit(orderId, data);
        } else {
            throw new Error("Payment Verification Failed or Pending");
        }
    } catch (e) {
        console.error("Verify Error:", e);
        throw e;
    }
};

// 3. SAFE DEPOSIT — Uses Supabase RPC for atomic update
const processSafeDeposit = async (orderId, gatewayData) => {
    try {
        const { data, error } = await supabase.rpc('process_webhook_deposit', {
            p_order_id: orderId,
            p_gateway_response: gatewayData,
        });

        if (error) {
            // If already processed, treat as success
            if (error.message && error.message.includes('Already')) {
                return true;
            }
            throw new Error(error.message || "Balance update failed");
        }

        return true;
    } catch (e) {
        console.error("Balance Update Error:", e);
        throw new Error("Payment received but balance update failed.");
    }
};