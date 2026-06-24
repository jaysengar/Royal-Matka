// api/proxy.js
// TranzUPI Payment Proxy - Security Enhanced
// CORS restricted, API key from env vars (never from client)
export default async function handler(req, res) {
  // 1. CORS Headers (Restricted to your domain)
  const allowedOrigins = [
    'https://royal-matka-app.vercel.app',
    'http://localhost:5173',  // Dev
    'http://localhost:5174',  // Dev alt port
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Frontend se data lo
  const { endpoint, ...bodyData } = req.body;

  // Validate endpoint
  const ALLOWED_ENDPOINTS = ['create-order', 'check-order-status'];
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  const BASE_URL = "https://tranzupi.com/api"; 
  const targetUrl = `${BASE_URL}/${endpoint}`;

  // 🔒 SECURITY: API key comes from server env vars, NOT from client
  const apiKey = process.env.TRANZ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  // 2. Convert JSON to Form Data (TranzUPI ke liye zaroori)
  const formBody = new URLSearchParams();
  formBody.append('user_token', apiKey);  // Server adds API key

  for (const key in bodyData) {
      // Skip user_token from client (security measure — client should not send API keys)
      if (key === 'user_token') continue;
      
      if(bodyData[key] !== undefined && bodyData[key] !== null) {
          formBody.append(key, bodyData[key]);
      }
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', 
      },
      body: formBody.toString(),
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: 'Gateway connection failed' });
  }
}