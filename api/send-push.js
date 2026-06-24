// api/send-push.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT is not set in environment variables.");
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error);
  }
}

export default async function handler(req, res) {
  // Add CORS headers for preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    return res.status(200).end();
  }

  // Set CORS headers for actual request
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!getApps().length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT env var.' });
  }

  const { userId, title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' });
  }

  try {
    let tokens = [];

    if (userId === 'ALL' || !userId) {
      // Fetch all non-null FCM tokens
      const { data, error } = await supabase
        .from('users')
        .select('fcm_token')
        .not('fcm_token', 'is', null);

      if (error) throw error;
      tokens = data.map(user => user.fcm_token).filter(token => token && token.trim() !== '');
    } else {
      // Fetch specific user's FCM token
      const { data, error } = await supabase
        .from('users')
        .select('fcm_token')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore no rows error
      if (data && data.fcm_token) {
        tokens.push(data.fcm_token);
      }
    }

    if (tokens.length === 0) {
      return res.status(200).json({ message: 'No valid FCM tokens found for the target audience.' });
    }

    // Send push notifications via Firebase Admin
    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: tokens, // Multicast message
    };

    // Use sendEachForMulticast in newer firebase-admin SDKs
    const response = await getMessaging().sendEachForMulticast(message);
    
    return res.status(200).json({ 
        message: 'Push notifications processed',
        successCount: response.successCount,
        failureCount: response.failureCount
    });

  } catch (error) {
    console.error("Error sending push:", error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
