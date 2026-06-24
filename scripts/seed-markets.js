
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DOMAIN_KEY = '8c7cc1dc3a8702bc2ff5d23051a73937';
const DOMAIN = 'royal-matka.vercel.app';
const API_URL = `https://www.matkaapi.com/mapi/market_api.php?market_list=1&domain_key=${DOMAIN_KEY}&domain=${DOMAIN}`;

async function seedMarkets() {
  console.log("Fetching markets from API...");
  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    
    if (!result.status || !result.data) {
      console.error("Failed to fetch markets or invalid response format.");
      return;
    }

    const markets = result.data;
    console.log(`Found ${markets.length} markets. Upserting to database...`);

    for (const m of markets) {
      // API format:
      // {"name":"TIME BAZAR DAY","open_time":"02:45 PM","close_time":"04:45 PM","sat_day":"1","sun_day":"1","bg_yellow":"0"}
      // We map this to our DB structure.
      
      const openTime24 = m.open_time ? formatTo24(m.open_time) : '00:00';
      const closeTime24 = m.close_time ? formatTo24(m.close_time) : '00:00';
      
      const payload = {
        id: m.name.toUpperCase(),
        name: m.name.toUpperCase(),
        open_time: m.open_time || '--:--',
        close_time: m.close_time || '--:--',
        open_time_24: openTime24,
        close_time_24: closeTime24,
        category: 'regular',
        active: false, // Default to false, Admin can activate what they want
        result: '***-**-***',
      };

      const { error } = await supabase.from('markets').upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        console.error(`Error inserting ${m.name}:`, error.message);
      }
    }
    console.log("Seeding complete!");

  } catch (error) {
    console.error("Error during seeding:", error);
  }
}

function formatTo24(timeStr) {
  // input: "02:45 PM"
  try {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    return `${hours}:${minutes}`;
  } catch (e) {
    return '00:00';
  }
}

seedMarkets();
