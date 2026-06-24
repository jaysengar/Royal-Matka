// src/utils/timeUtils.js

// 1. FORMAT TIME (Same as before)
export const formatTime12hr = (time24) => {
    if (!time24) return "--:--";
    try {
        const [hours, minutes] = time24.split(':');
        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; 
        return `${h}:${minutes} ${ampm}`;
    } catch (e) { return time24; }
};
  
// 2. MAIN LOGIC (UPDATED FOR MANUAL CONTROL 🛑)
export const getCountdown = (market) => {
    // Basic Validation
    if(!market || !market.openTime24 || !market.closeTime24) {
        return { text: "Loading...", isLive: false, type: '', isOpenSessionEnded: true, color: '#888' };
    }

    // 🛑 MASTER SWITCH: Agar Admin ne activate nahi kiya, to market band rahega
    if (market.isMarketActive === false) {
        return { 
            text: "Market Closed", isLive: false, type: 'Market Closed', 
            isOpenSessionEnded: true, color: '#FF3B30' 
        };
    }

    const now = new Date();
    const [oH, oM] = market.openTime24.split(':').map(Number);
    const [cH, cM] = market.closeTime24.split(':').map(Number);

    let openDate = new Date(); openDate.setHours(oH, oM, 0, 0);
    let closeDate = new Date(); closeDate.setHours(cH, cM, 0, 0);

    // Midnight Logic
    if (closeDate < openDate) closeDate.setDate(closeDate.getDate() + 1);
    
    // Agar abhi ka time close se zyada hai, iska matlab aaj ka khel khatam
    // Lekin hum agle din ka chalu nahi karenge jab tak admin reset na kare
    if (now > closeDate) {
        return { 
            text: "Market Closed", isLive: false, type: 'Market Closed', 
            isOpenSessionEnded: true, color: '#FF3B30' 
        };
    }

    // --- STATUS CHECK ---
    let targetDate = null;
    let type = "";
    let isLive = false;
    let isOpenSessionEnded = false;
    let color = "";

    if (now < openDate) {
        targetDate = openDate;
        type = "Opens in";
        isLive = true;
        isOpenSessionEnded = false;
        color = "#34C759";
    } else if (now >= openDate && now < closeDate) {
        targetDate = closeDate;
        type = "Closes in";
        isLive = true;
        isOpenSessionEnded = true;
        color = "#FFD700";
    } else {
        return { text: "Market Closed", isLive: false, type: 'Market Closed', isOpenSessionEnded: true, color: '#FF3B30' };
    }

    const diff = targetDate - now;
    if (diff <= 0) return { text: "Processing...", isLive: false, type: 'Wait', isOpenSessionEnded: true, color: '#888' };

    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    const hh = h < 10 ? `0${h}` : h;
    const mm = m < 10 ? `0${m}` : m;
    const ss = s < 10 ? `0${s}` : s;

    return { 
        text: `${hh}:${mm}:${ss}`, isLive: true, type: type, 
        isOpenSessionEnded: isOpenSessionEnded, color: color
    };
};

// 3. SORTING LOGIC
export const getSortedMarkets = (markets) => {
    if(!markets || !Array.isArray(markets)) return [];
    return markets.map(m => {
        const status = getCountdown(m); // Pass full market object
        return { 
            ...m, 
            status: status.isLive ? "Open" : "Closed",
            sortWeight: status.isLive ? -1 : 1,
            nextEventTime: status.isLive ? m.closeTime24 : m.openTime24
        };
    }).sort((a, b) => {
        if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
        return a.nextEventTime.localeCompare(b.nextEventTime);
    });
};