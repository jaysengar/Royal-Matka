import React, { useEffect, useState } from 'react';
import { 
  User, Wallet, Play, History, Home, BarChart2, 
  MessageCircle, Bell, Clock, Lock, LogOut // ✅ LogOut wapas add kiya
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Backend Services
import { supabase } from '../supabase';
import { getUserData, listenToMarkets, getAppConfig, updateUserName } from '../services/db'; 
import BottomNav from '../components/BottomNav';

// Time Sorting Helper
const getSortedMarkets = (markets) => {
    return markets.sort((a, b) => {
        const tA = a.openTime24 || '00:00';
        const tB = b.openTime24 || '00:00';
        return tA.localeCompare(tB);
    });
};

function Dashboard() {
  const navigate = useNavigate();
  
  // Data States
  const [userData, setUserData] = useState({ balance: "0", phone: "Guest" });
  const [markets, setMarkets] = useState([]);
  const [config, setConfig] = useState({ notice: "Welcome", whatsapp: "" });
  const [loading, setLoading] = useState(true);
  
  // Name Prompt States
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newName, setNewName] = useState('');

  // --- 1. INITIAL FETCH & LISTENERS ---
  useEffect(() => {
    // A. User Data Load
    const fetchUser = async () => {
        try {
            const uData = await getUserData();
            if (uData) {
                setUserData(uData);
                if (!uData.name || uData.name.trim() === '') {
                    setShowNamePrompt(true);
                }
            }
        } catch(e) { console.error("User Load Error", e); }
    };
    fetchUser();

    // B. App Config (Notice & Whatsapp)
    const fetchConfig = async () => {
        const c = await getAppConfig();
        if(c) setConfig(c);
    };
    fetchConfig();

    // C. Real-time Markets
    const unsubscribe = listenToMarkets((liveData) => {
      // Filter & Sort
      const validMarkets = liveData.filter(m => m.category !== 'starline'); 
      const sorted = getSortedMarkets(validMarkets);
      setMarkets(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ paddingBottom: '100px', minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', position:'relative' }}>
      
      {/* --- NAME PROMPT MODAL --- */}
      <AnimatePresence>
        {showNamePrompt && (
          <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)'}}>
             <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} style={{background:'#161616', padding:'30px 25px', borderRadius:'24px', width:'90%', maxWidth:'350px', border:'1px solid #333', textAlign:'center', boxShadow:'0 20px 50px rgba(0,0,0,0.5)'}}>
                <div style={{background:'rgba(255,215,0,0.1)', width:'60px', height:'60px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'}}>
                   <User color="#FFD700" size={30} />
                </div>
                <h2 style={{color:'white', margin:'0 0 10px', fontSize:'22px'}}>Welcome!</h2>
                <p style={{color:'#888', fontSize:'13px', marginBottom:'25px'}}>Please enter your name to continue to the dashboard.</p>
                <input 
                   autoFocus
                   value={newName} onChange={e => setNewName(e.target.value)}
                   placeholder="Your Name"
                   style={{width:'100%', padding:'16px', borderRadius:'14px', background:'#000', border:'1px solid #333', color:'white', fontSize:'16px', textAlign:'center', marginBottom:'20px', outline:'none'}}
                />
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <motion.button 
                       whileTap={{scale:0.95}}
                       onClick={async () => {
                           if(newName.trim().length < 2) return;
                           try {
                               await updateUserName(newName);
                               setUserData(prev => ({...prev, name: newName}));
                               setShowNamePrompt(false);
                           } catch(e) { 
                               console.error("Failed to save name", e); 
                               alert("Error saving name: " + e.message + "\n\nDid you run the SQL command in Supabase?");
                           }
                       }}
                       style={{width:'100%', padding:'16px', background: newName.trim().length>=2 ? '#34C759' : '#333', color: newName.trim().length>=2 ? 'black' : '#888', fontWeight:'900', borderRadius:'14px', border:'none', cursor: newName.trim().length>=2 ? 'pointer' : 'not-allowed', fontSize:'15px'}}
                    >
                       SAVE & CONTINUE
                    </motion.button>
                    <button 
                       onClick={() => setShowNamePrompt(false)}
                       style={{background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', padding: '10px'}}
                    >
                       Skip for now
                    </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <div style={{ 
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <motion.div whileTap={{scale:0.95}} onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor:'pointer' }}>
          <div style={{ position:'relative' }}>
             <div style={{ background: '#1a1a1a', padding: '10px', borderRadius: '50%', border:'1px solid #333' }}>
               <User color="#FFD700" size={20} />
             </div>
             <div style={{position:'absolute', bottom:0, right:0, width:10, height:10, background:'#34C759', borderRadius:'50%', border:'2px solid #0a0a0a'}}></div>
          </div>
          <div>
            <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 'bold', color:'#fff' }}>{userData.name || userData.phone || "Player"}</h3>
            <p style={{ fontSize: '10px', color: '#888', margin:0 }}>Tap to profile</p>
          </div>
        </motion.div>

        <motion.div whileTap={{scale:0.95}} onClick={() => navigate('/wallet')} style={{ 
            background: 'linear-gradient(135deg, #FFD700, #FDB931)', 
            padding: '8px 16px', borderRadius: '30px', 
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.25)', cursor:'pointer'
        }}>
          <Wallet size={16} color="black" fill="black" />
          <span style={{ fontWeight: '900', color: 'black', fontSize:'15px' }}>₹{userData.balance}</span>
        </motion.div>
      </div>

      {/* --- NOTICE BOARD --- */}
      <div style={{ background: '#111', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222' }}>
        <div 
          onClick={() => navigate('/notifications')}
          style={{background:'rgba(255, 215, 0, 0.1)', padding:'6px', borderRadius:'8px', cursor:'pointer'}}
        >
           <Bell size={16} color="#FFD700" />
        </div>
        <div style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
           <div className="marquee-text" style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '500', color: '#ccc' }}>
              {config.notice || "Welcome to Royal Matka! Play Responsibly."}
           </div>
        </div>
      </div>

      {/* --- MARKET LIST --- */}
      <div style={{ padding: '20px' }}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'15px'}}>
            <h2 style={{ fontSize: '14px', color: '#fff', margin:0, fontWeight:'bold', display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{width:4, height:16, background:'#FFD700', borderRadius:2}}></span>
                Live Markets
            </h2>
            {loading && <LoaderSmall />}
        </div>
        
        {loading && (
            <div style={{textAlign:'center', padding:'40px'}}>
               <p style={{fontSize:'12px', color:'#666'}}>Connecting to server...</p>
            </div>
        )}

        <AnimatePresence>
        {!loading && markets.map((market, index) => (
          <MarketCard key={market.id} market={market} navigate={navigate} index={index} />
        ))}
        </AnimatePresence>
      </div>

      {/* --- FLOATING WHATSAPP --- */}
      <AnimatePresence>
      {config.whatsapp && (
        <motion.div 
            initial={{scale:0}} animate={{scale:1}}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.open(`https://wa.me/${config.whatsapp}`, '_blank')}
            style={{
                position: 'fixed', bottom: '90px', right: '20px',
                background: '#25D366', width: '55px', height: '55px', borderRadius: '50%',
                boxShadow: '0 8px 25px rgba(37, 211, 102, 0.4)',
                zIndex: 90, cursor: 'pointer', display: 'flex', alignItems:'center', justifyContent:'center'
            }}
        >
            <MessageCircle size={28} color="white" fill="white" />
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- BOTTOM NAV --- */}
      <BottomNav />

      <style>{`
        .marquee-text { display: inline-block; animation: scroll-left 15s linear infinite; padding-left: 100%; }
        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .pulse-dot { animation: pulse-green 1.5s infinite; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(52, 199, 89, 0); } 100% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0); } }
      `}</style>
    </div>
  );
}

// --- MARKET CARD COMPONENT ---
const MarketCard = ({ market, navigate, index }) => {
    
    // TIMER STATE
    const [timer, setTimer] = useState({ text: 'Loading...', color: '#888', isOpen: false });

    useEffect(() => {
        const tick = () => {
            // 1. Admin Block Check
            if (market.active === false) {
                setTimer({ text: 'Closed by Admin', color: '#FF3B30', isOpen: false });
                return;
            }

            // 2. Data Validation
            if (!market.openTime24 || !market.closeTime24) {
                setTimer({ text: 'Invalid Time', color: '#888', isOpen: false });
                return;
            }

            // 3. Time Logic
            const now = new Date();
            const currMins = now.getHours() * 60 + now.getMinutes();
            
            const [oH, oM] = market.openTime24.split(':').map(Number);
            const [cH, cM] = market.closeTime24.split(':').map(Number);
            
            const openMins = oH * 60 + oM;
            const closeMins = cH * 60 + cM;

            if (currMins < openMins) {
                // Pre-Open Phase
                const diff = openMins - currMins;
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                setTimer({ text: `Opens in ${h}h ${m}m`, color: '#34C759', isOpen: true }); 
            } 
            else if (currMins >= openMins && currMins < closeMins) {
                // Live Phase (Betting On)
                const diff = closeMins - currMins;
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                setTimer({ text: `Closes in ${h}h ${m}m`, color: '#E0AA00', isOpen: true }); 
            } 
            else {
                // Time Over
                setTimer({ text: 'Market Closed', color: '#FF3B30', isOpen: false }); 
            }
        };

        tick();
        const interval = setInterval(tick, 1000); 
        return () => clearInterval(interval);
    }, [market]);

    const { text, color, isOpen } = timer;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay: index * 0.05}}
            style={{ 
                background: '#161616', borderRadius: '18px', padding: '0', marginBottom: '16px', 
                border: '1px solid #262626', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
        >
            {/* Header */}
            <div style={{
                padding:'12px 16px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center', 
                background: isOpen ? 'rgba(52, 199, 89, 0.05)' : 'rgba(255, 59, 48, 0.05)'
            }}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', margin:0, textTransform:'uppercase', letterSpacing:'0.5px' }}>{market.name}</h3>
                    {isOpen && <span className="pulse-dot" style={{width:8, height:8, background:'#34C759', borderRadius:'50%'}}></span>}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: color, display:'flex', alignItems:'center', gap:'4px' }}>
                    {isOpen ? <Clock size={12} /> : <Lock size={12}/>} {text}
                </div>
            </div>

            <div style={{padding:'16px'}}>
                {/* Result Matrix */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform:'uppercase', display:'block' }}>Open</span>
                        <span style={{ fontSize: '14px', color: '#ddd', fontWeight: 'bold', fontFamily:'monospace' }}>{market.result ? market.result.split('-')[0] : '***'}</span>
                    </div>
                    
                    <div style={{ 
                        background: 'linear-gradient(180deg, #FFD700 0%, #E0AA00 100%)', 
                        padding: '4px 12px', borderRadius: '8px', minWidth: '60px',
                        textAlign: 'center', boxShadow: '0 4px 10px rgba(255, 215, 0, 0.2)'
                    }}>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#000', display:'block', lineHeight:'1.2', letterSpacing:'1px' }}>
                            {market.result ? market.result.split('-')[1] : '**'}
                        </span>
                    </div>
                    
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform:'uppercase', display:'block' }}>Close</span>
                        <span style={{ fontSize: '14px', color: '#ddd', fontWeight: 'bold', fontFamily:'monospace' }}>{market.result ? market.result.split('-')[2] : '***'}</span>
                    </div>
                </div>

                {/* Timing Grid */}
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#555', marginBottom:'16px', background:'#111', padding:'8px 12px', borderRadius:'8px'}}>
                    <span>O: <span style={{color:'#ccc', fontWeight:'bold'}}>{market.openTime}</span></span>
                    <span>C: <span style={{color:'#ccc', fontWeight:'bold'}}>{market.closeTime}</span></span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <motion.button 
                      whileTap={{scale:0.95}}
                      onClick={() => navigate('/chart')}
                      style={{ 
                        flex: 1, background: '#222', border: '1px solid #333', color: '#aaa', 
                        padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}>
                      <BarChart2 size={16} /> CHART
                    </motion.button>

                    <motion.button 
                      whileTap={{scale:0.95}}
                      onClick={() => isOpen ? navigate('/betting', { state: { market: market } }) : null}
                      disabled={!isOpen}
                      style={{ 
                          flex: 1.5, background: isOpen ? 'white' : '#2a2a2a', 
                          color: isOpen ? 'black' : '#555', border: 'none', 
                          padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', cursor: isOpen ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          boxShadow: isOpen ? '0 4px 15px rgba(255,255,255,0.1)' : 'none'
                      }}
                    >
                      {/* ✅ Yahan LogOut use ho raha hai */}
                      {isOpen ? <Play size={16} fill="black" /> : <LogOut size={16} />} 
                      {isOpen ? "PLAY NOW" : "CLOSED"}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};



const LoaderSmall = () => (
    <div className="spin" style={{width:16, height:16, border:'2px solid #333', borderTopColor:'#FFD700', borderRadius:'50%'}}></div>
);

export default Dashboard;