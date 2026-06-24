import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAIN_KEY = process.env.MATKA_API_KEY || '8c7cc1dc3a8702bc2ff5d23051a73937';
const DOMAIN = process.env.MATKA_API_DOMAIN || 'royal-matka.vercel.app';
const API_URL = `https://www.matkaapi.com/mapi/market_api.php?market=all&domain_key=${DOMAIN_KEY}&domain=${DOMAIN}`;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Fetching live results from Matka API...");
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.status || !data.data) {
      return res.status(500).json({ error: "Failed to fetch valid data from API" });
    }

    const markets = data.data;
    let processedCount = 0;
    let errors = [];

    // Fetch all active markets from DB to compare
    const { data: dbMarkets, error: dbError } = await supabase
      .from('markets')
      .select('id, name, result');
      
    if (dbError) throw dbError;

    const dbMarketsMap = {};
    dbMarkets.forEach(m => {
      dbMarketsMap[m.name.toUpperCase()] = m.result || '***-**-***';
    });

    for (const m of markets) {
      const marketName = m.name.toUpperCase();
      const apiResult = m.result; // e.g. "125-8", "239-4", "125-85-249"
      const dbResult = dbMarketsMap[marketName] || '***-**-***';

      if (!apiResult || apiResult === '' || apiResult.includes('*')) continue;

      const apiParts = apiResult.split('-');
      let openInput = null;
      let closeInput = null;

      if (apiParts.length === 2) {
          // Open Result only: "239-4" (OpenPanna-OpenDigit)
          openInput = `${apiParts[0]}-${apiParts[1]}`;
      } else if (apiParts.length === 3) {
          // Full Result: "125-85-249" (OpenPanna-Jodi-ClosePanna)
          const openPanna = apiParts[0];
          const jodi = apiParts[1];
          const closePanna = apiParts[2];
          
          if (jodi.length === 2) {
              const openDigit = jodi.charAt(0);
              const closeDigit = jodi.charAt(1);
              openInput = `${openPanna}-${openDigit}`;
              closeInput = `${closePanna}-${closeDigit}`;
          }
      }

      // 1. Check if we need to declare OPEN
      if (openInput && dbResult === '***-**-***') {
          console.log(`Declaring OPEN for ${marketName}: ${openInput}`);
          const { error: rpcError } = await supabase.rpc('declare_result_and_pay', {
              p_market_name: marketName,
              p_input: openInput,
              p_session: 'Open'
          });
          if (rpcError) {
              console.error(`Error declaring open for ${marketName}:`, rpcError);
              errors.push({ market: marketName, type: 'open', error: rpcError.message });
          } else {
              processedCount++;
          }
      }

      // 2. Check if we need to declare CLOSE
      // We declare close if the DB result ends with *** (meaning close isn't declared yet)
      // but the API has closeInput.
      const dbCloseIsUndeclared = dbResult.endsWith('***');
      if (closeInput && dbCloseIsUndeclared) {
          console.log(`Declaring CLOSE for ${marketName}: ${closeInput}`);
          const { error: rpcError } = await supabase.rpc('declare_result_and_pay', {
              p_market_name: marketName,
              p_input: closeInput,
              p_session: 'Close'
          });
          if (rpcError) {
              console.error(`Error declaring close for ${marketName}:`, rpcError);
              errors.push({ market: marketName, type: 'close', error: rpcError.message });
          } else {
              processedCount++;
          }
      }
    }

    return res.status(200).json({ 
        message: "Sync complete", 
        processed: processedCount,
        errors: errors
    });

  } catch (error) {
    console.error("Sync Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
