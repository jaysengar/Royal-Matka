import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, PlusCircle, Trash2, X, Check, Loader2, 
  Clock, AlertTriangle, ChevronRight, AlertCircle, Lock, Trophy 
} from 'lucide-react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Backend Services
import { placeBid } from '../services/db'; 

// --- HELPER: GENERATE PANNA LISTS ---
const generateDoublePannas = () => {
  const pannas = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if (i !== j) {
        let p1 = [i, i, j].sort().join('');
        let p2 = [i, j, j].sort().join('');
        if (!pannas.includes(p1)) pannas.push(p1);
        if (!pannas.includes(p2)) pannas.push(p2);
      }
    }
  }
  return pannas.sort();
};

const ALL_DOUBLE_PANNAS = generateDoublePannas();

function BettingPage() {
  const navigate = useNavigate();
  const location = useLocation(); 

  // --- STATE MANAGEMENT ---
  const state = location.state || {};
  const market = state.market || {}; 
  const marketName = market.name || state.marketName || "Unknown Market";

  const [selectedGame, setSelectedGame] = useState('single'); 
  const [session, setSession] = useState('Open'); 
  const [betDigit, setBetDigit] = useState('');
  const [betDigit2, setBetDigit2] = useState('');
  const [hsMode, setHsMode] = useState('patti_ank'); // 'patti_ank' | 'ank_patti'
  const [betAmount, setBetAmount] = useState('');
  const [myBets, setMyBets] = useState([]);
  
  // Logic States
  const [marketStatus, setMarketStatus] = useState('loading'); 
  const [allowedSessions, setAllowedSessions] = useState('BOTH'); 
  const [timerText, setTimerText] = useState("Syncing Time...");
  const [suggestions, setSuggestions] = useState([]);

  // UI States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultStatus, setResultStatus] = useState(null); 
  const [resultMessage, setResultMessage] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Game Constants
  const allGameTypes = [
    { id: 'single', label: 'Single Ank', rate: '9', placeholder: '0-9', maxLen: 1 },
    { id: 'jodi', label: 'Jodi', rate: '90', placeholder: '00-99', maxLen: 2, fullGame: true },
    { id: 'sp', label: 'Single Panna', rate: '140', placeholder: '123', maxLen: 3 },
    { id: 'dp', label: 'Double Panna', rate: '280', placeholder: 'Search (e.g. 2)', maxLen: 3 }, 
    { id: 'tp', label: 'Triple Panna', rate: '600', placeholder: '777', maxLen: 3 },
    { id: 'hs', label: 'Half Sangam', rate: '1000', placeholder: '123-9', maxLen: 5, fullGame: true },
    { id: 'fs', label: 'Full Sangam', rate: '10000', placeholder: '123-456', maxLen: 7, fullGame: true },
  ];

  const quickAmounts = [10, 50, 100, 500, 1000, 5000];
  const currentGame = allGameTypes.find(g => g.id === selectedGame);
  
  // Calculate Total
  const totalAmount = useMemo(() => myBets.reduce((total, item) => total + Number(item.amount), 0), [myBets]);
  
  const availableGames = allowedSessions === 'ONLY_CLOSE' 
      ? allGameTypes.filter(g => !g.fullGame) 
      : allGameTypes;

  // --- UTILS ---
  const vibrate = (pattern = 50) => { if (navigator.vibrate) navigator.vibrate(pattern); };
  
  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 2500);
  };

  // --- 🛡️ SECURITY: INPUT SANITIZATION ---
  const handleDigitChange1 = (e, max) => {
      const val = e.target.value.replace(/[^0-9]/g, ''); 
      if(val.length <= max) setBetDigit(val);
  };
  
  const handleDigitChange2 = (e, max) => {
      const val = e.target.value.replace(/[^0-9]/g, ''); 
      if(val.length <= max) setBetDigit2(val);
  };

  const handleAmountChange = (e) => {
      const val = e.target.value.replace(/[^0-9]/g, ''); // Only Numbers
      setBetAmount(val);
  };

  // --- 🔥 CORE LOGIC: TIME & ADMIN CHECK ---
  useEffect(() => {
    const checkMarketStatus = () => {
        if (market.active === false) {
            setMarketStatus('closed_admin');
            setTimerText("Closed by Admin");
            return;
        }

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        const [oH, oM] = (market.openTime24 || "00:00").split(':').map(Number);
        const [cH, cM] = (market.closeTime24 || "00:00").split(':').map(Number);
        
        const openMins = oH * 60 + oM;
        const closeMins = cH * 60 + cM;

        if (currentMins < openMins) {
            setMarketStatus('live');
            setAllowedSessions('BOTH');
            setTimerText(`Open closes at ${market.openTime}`);
        } 
        else if (currentMins >= openMins && currentMins < closeMins) {
            setMarketStatus('live');
            setAllowedSessions('ONLY_CLOSE');
            setTimerText(`Close ends at ${market.closeTime}`);
            
            if (session === 'Open') {
                setSession('Close');
                if (['jodi', 'hs', 'fs'].includes(selectedGame)) setSelectedGame('single');
            }
        } 
        else {
            setMarketStatus('closed_time');
            setTimerText("Market Closed");
            setAllowedSessions('NONE');
        }
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 1000); 
    return () => clearInterval(interval);
  }, [market, session, selectedGame]);


  // --- SMART FILTER ---
  useEffect(() => {
    if (selectedGame === 'dp' && betDigit.length > 0 && betDigit.length < 3) {
      const filtered = ALL_DOUBLE_PANNAS.filter(p => p.startsWith(betDigit) || p.includes(betDigit)).slice(0, 10);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [betDigit, selectedGame]);


  // --- ACTIONS ---
  const handleSuggestionClick = (val) => {
      vibrate();
      setBetDigit(val);
      setSuggestions([]); 
  };

  const addBet = () => {
    // 🛡️ SECURITY CHECKS
    if(!betDigit || !betAmount) return showToast("Enter Digit & Amount", "error");
    if(Number(betAmount) < 10) return showToast("Minimum bet is ₹10", "error");
    
    // DP Validation
    if(selectedGame === 'dp') {
       const unique = new Set(betDigit.split(''));
       if(betDigit.length !== 3 || unique.size !== 2) return showToast("Invalid Double Panna", "error");
    }

    let finalDigit = betDigit;
    if(selectedGame === 'hs') {
        if(hsMode === 'patti_ank') {
            if(betDigit.length !== 3) return showToast("Open Patti must be 3 digits", "error");
            if(betDigit2.length !== 1) return showToast("Close Ank must be 1 digit", "error");
        } else {
            if(betDigit.length !== 1) return showToast("Open Ank must be 1 digit", "error");
            if(betDigit2.length !== 3) return showToast("Close Patti must be 3 digits", "error");
        }
        finalDigit = `${betDigit}-${betDigit2}`;
    }
    else if(selectedGame === 'fs') {
        if(betDigit.length !== 3) return showToast("Open Patti must be 3 digits", "error");
        if(betDigit2.length !== 3) return showToast("Close Patti must be 3 digits", "error");
        finalDigit = `${betDigit}-${betDigit2}`;
    }
    else {
        // Length Validation for normal games
        if (betDigit.length !== currentGame.maxLen) {
            return showToast(`Digit must be ${currentGame.maxLen} chars`, "error");
        }
    }

    vibrate(); 
    setMyBets([{
      id: Date.now(),
      game: currentGame.label,
      digit: finalDigit,
      amount: betAmount,
      type: selectedGame,
      session: session
    }, ...myBets]);
    
    setBetDigit(''); 
    setBetDigit2('');
    showToast("Added to slip", "success");
  };

  const removeBet = (id) => {
    vibrate();
    setMyBets(myBets.filter(bet => bet.id !== id));
  };

  const handleFinalPlaceBid = async () => {
    if(marketStatus !== 'live') return showToast("Market is Closed!", "error");
    
    setIsProcessing(true);
    try {
      // 🚀 Instant API Call
      await placeBid(myBets, totalAmount, marketName); 
      
      // Success State
      setIsProcessing(false);
      setShowConfirmModal(false);
      setMyBets([]); 
      setResultStatus('success'); 
      vibrate([100, 50, 100]); // Success Haptic
    } catch (error) {
      setIsProcessing(false);
      // Keep modal open but show error inside? Or close and show popup?
      // Closing modal and showing Fancy Error Popup is cleaner
      setShowConfirmModal(false);
      setResultStatus('error'); 
      setResultMessage(typeof error === 'string' ? error : "Transaction Failed");
      vibrate([200, 100, 200]); // Error Haptic
    }
  };

  // --- UI RENDER ---
  return (
    <div style={{ paddingBottom: '140px', minHeight: '100vh', background: '#0a0a0a', fontFamily:'sans-serif', color:'white', position: 'relative' }}>
      
      {/* 🚀 FANCY TOAST (Replacement for Alert) */}
      <AnimatePresence>
        {toast.show && (
            <motion.div 
                initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
                style={{
                    position: 'fixed', top: '20px', left: '0', right: '0', margin: '0 auto', width: '90%', maxWidth: '350px',
                    zIndex: 200, padding: '14px 20px', borderRadius: '50px',
                    background: toast.type === 'error' ? 'rgba(255, 59, 48, 0.9)' : 'rgba(52, 199, 89, 0.9)',
                    backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent:'center', gap: '10px', 
                    color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
            >
                {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                <span style={{fontSize: '13px', fontWeight: 'bold'}}>{toast.message}</span>
            </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(20,20,20,0.95)', backdropFilter:'blur(10px)', borderBottom: '1px solid #222', position:'sticky', top:0, zIndex:50 }}>
        <div onClick={() => navigate('/')} style={{padding:'10px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
            <ArrowLeft color="white" size={20} />
        </div>
        <div style={{flex:1}}>
           <h2 className="gold-text" style={{fontSize: '16px', margin: 0, textTransform: 'uppercase', letterSpacing:'1px', fontWeight: '900'}}>{marketName}</h2>
           <p style={{color: marketStatus==='live'?'#84cc16':'#FF3B30', fontSize: '11px', margin: 0, display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold'}}>
               <Clock size={10}/> {timerText}
           </p>
        </div>
      </div>

      {/* 🚀 MARKET CLOSED STATE */}
      {marketStatus !== 'live' ? (
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} style={{textAlign:'center', padding:'80px 20px', color:'#444'}}>
              <div style={{background:'#161616', padding:'40px 20px', borderRadius:'24px', border:'1px solid #222', maxWidth:'400px', margin:'0 auto'}}>
                <Lock size={50} style={{marginBottom:'20px', opacity:0.8, color: marketStatus==='closed_admin' ? '#FF3B30' : '#888'}}/>
                <h3 style={{margin:0, color:'white', fontSize:'20px', fontWeight:'bold'}}>
                    {marketStatus === 'closed_admin' ? 'MARKET LOCKED' : 'TIME UP'}
                </h3>
                <p style={{fontSize:'13px', color:'#666', marginTop:'10px', lineHeight:'1.5'}}>
                    {marketStatus === 'closed_admin' ? 'This market is temporarily disabled by admin.' : 'Betting is closed for today.\nCome back tomorrow.'}
                </p>
              </div>
          </motion.div>
      ) : (
      <>
          {/* SESSION TABS */}
          <div style={{ padding: '20px 20px 0', maxWidth:'600px', margin:'0 auto' }}>
            <div style={{display:'flex', background:'#161616', padding:'5px', borderRadius:'16px', border:'1px solid #2a2a2a'}}>
                <button 
                    onClick={() => allowedSessions === 'BOTH' && setSession('Open')}
                    disabled={allowedSessions !== 'BOTH'}
                    style={{
                        flex:1, padding:'12px', borderRadius:'12px', border:'none', fontWeight:'bold', fontSize:'13px', 
                        background: session==='Open'?'#FFD700':'transparent', 
                        color: session==='Open'?'black': allowedSessions !== 'BOTH' ? '#333' : '#888', 
                        opacity: allowedSessions !== 'BOTH' ? 0.5 : 1, transition:'0.3s'
                    }}
                >
                    OPEN
                </button>
                <button 
                    onClick={() => setSession('Close')}
                    disabled={['jodi','hs','fs'].includes(selectedGame)}
                    style={{
                        flex:1, padding:'12px', borderRadius:'12px', border:'none', fontWeight:'bold', fontSize:'13px', 
                        background: session==='Close'?'#FFD700':'transparent', 
                        color: session==='Close'?'black':'#888', 
                        opacity: ['jodi','hs','fs'].includes(selectedGame) ? 0.3 : 1, transition:'0.3s'
                    }}
                >
                    CLOSE
                </button>
            </div>
          </div>

          {/* GAME SCROLLER */}
          <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', padding: '20px', scrollbarWidth: 'none' }}>
            {availableGames.map((game) => (
              <motion.div
                key={game.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { vibrate(); setSelectedGame(game.id); setBetDigit(''); setBetDigit2(''); }}
                style={{
                  background: selectedGame === game.id ? 'linear-gradient(135deg, #FFD700, #C5A000)' : '#1a1a1a',
                  color: selectedGame === game.id ? 'black' : '#888',
                  padding: '10px 20px', borderRadius: '50px', fontSize: '12px', fontWeight: 'bold',
                  border: selectedGame === game.id ? 'none' : '1px solid #333',
                  whiteSpace: 'nowrap', flexShrink: 0, boxShadow: selectedGame === game.id ? '0 4px 15px rgba(255, 215, 0, 0.2)' : 'none'
                }}
              >
                {game.label}
              </motion.div>
            ))}
          </div>

          {/* MAIN INPUT CARD */}
          <div style={{ padding: '0 20px', maxWidth:'600px', margin:'0 auto' }}>
            <div style={{ background: '#161616', padding: '25px', borderRadius: '24px', border: '1px solid #2a2a2a', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
                <div style={{position:'absolute', top:0, left:0, width:'100%', height:'4px', background:'linear-gradient(90deg, transparent, #FFD700, transparent)', opacity:0.5}}></div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    
                    {/* NORMAL GAME INPUT */}
                    {selectedGame !== 'hs' && selectedGame !== 'fs' && (
                        <div style={{ flex: 1.5 }}>
                            <label style={{color:'#666', fontSize:'10px', fontWeight:'bold', marginBottom:'8px', display:'block', letterSpacing:'1px'}}>{selectedGame === 'dp' ? "SEARCH PANNA" : currentGame.label.toUpperCase()}</label>
                            <input 
                                style={{width: '100%', fontSize: '24px', fontWeight: '900', background: '#0a0a0a', border: '1px solid #333', color: 'white', padding: '15px', borderRadius: '14px', outline: 'none', textAlign:'center', letterSpacing: '2px', transition:'border 0.3s'}} 
                                type="tel" placeholder={currentGame.placeholder} 
                                value={betDigit} onChange={(e) => handleDigitChange1(e, currentGame.maxLen)} 
                            />
                        </div>
                    )}

                    {/* HALF SANGAM INPUTS */}
                    {selectedGame === 'hs' && (
                        <div style={{ flex: 1.8 }}>
                            <div style={{display:'flex', gap:'5px', background:'#0a0a0a', padding:'4px', borderRadius:'10px', marginBottom:'10px', border:'1px solid #333'}}>
                                <button onClick={() => {setHsMode('patti_ank'); setBetDigit(''); setBetDigit2('');}} style={{flex:1, padding:'6px', background: hsMode==='patti_ank'?'#333':'transparent', color: hsMode==='patti_ank'?'#FFD700':'#666', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'bold'}}>Patti-Ank</button>
                                <button onClick={() => {setHsMode('ank_patti'); setBetDigit(''); setBetDigit2('');}} style={{flex:1, padding:'6px', background: hsMode==='ank_patti'?'#333':'transparent', color: hsMode==='ank_patti'?'#FFD700':'#666', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'bold'}}>Ank-Patti</button>
                            </div>
                            <div style={{display:'flex', gap:'8px'}}>
                                <div style={{flex: hsMode==='patti_ank' ? 1.5 : 1}}>
                                    <label style={{color:'#666', fontSize:'9px', fontWeight:'bold', marginBottom:'4px', display:'block'}}>{hsMode==='patti_ank'?'OPEN PATTI':'OPEN ANK'}</label>
                                    <input 
                                        style={{width:'100%', fontSize:'18px', fontWeight:'bold', background:'#0a0a0a', border:'1px solid #333', color:'white', padding:'12px', borderRadius:'10px', outline:'none', textAlign:'center'}} 
                                        type="tel" placeholder={hsMode==='patti_ank'?'123':'9'} 
                                        value={betDigit} onChange={(e) => handleDigitChange1(e, hsMode==='patti_ank'?3:1)} 
                                    />
                                </div>
                                <div style={{flex: hsMode==='patti_ank' ? 1 : 1.5}}>
                                    <label style={{color:'#666', fontSize:'9px', fontWeight:'bold', marginBottom:'4px', display:'block'}}>{hsMode==='patti_ank'?'CLOSE ANK':'CLOSE PATTI'}</label>
                                    <input 
                                        style={{width:'100%', fontSize:'18px', fontWeight:'bold', background:'#0a0a0a', border:'1px solid #333', color:'white', padding:'12px', borderRadius:'10px', outline:'none', textAlign:'center'}} 
                                        type="tel" placeholder={hsMode==='patti_ank'?'9':'123'} 
                                        value={betDigit2} onChange={(e) => handleDigitChange2(e, hsMode==='patti_ank'?1:3)} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FULL SANGAM INPUTS */}
                    {selectedGame === 'fs' && (
                        <div style={{ flex: 1.8 }}>
                            <div style={{display:'flex', gap:'8px', marginTop:'24px'}}>
                                <div style={{flex: 1}}>
                                    <label style={{color:'#666', fontSize:'9px', fontWeight:'bold', marginBottom:'4px', display:'block'}}>OPEN PATTI</label>
                                    <input 
                                        style={{width:'100%', fontSize:'18px', fontWeight:'bold', background:'#0a0a0a', border:'1px solid #333', color:'white', padding:'12px', borderRadius:'10px', outline:'none', textAlign:'center'}} 
                                        type="tel" placeholder="123" 
                                        value={betDigit} onChange={(e) => handleDigitChange1(e, 3)} 
                                    />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{color:'#666', fontSize:'9px', fontWeight:'bold', marginBottom:'4px', display:'block'}}>CLOSE PATTI</label>
                                    <input 
                                        style={{width:'100%', fontSize:'18px', fontWeight:'bold', background:'#0a0a0a', border:'1px solid #333', color:'white', padding:'12px', borderRadius:'10px', outline:'none', textAlign:'center'}} 
                                        type="tel" placeholder="456" 
                                        value={betDigit2} onChange={(e) => handleDigitChange2(e, 3)} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, marginTop: (selectedGame === 'hs' || selectedGame === 'fs') ? '24px' : '0' }}>
                        <label style={{color:'#666', fontSize:'10px', fontWeight:'bold', marginBottom:'8px', display:'block', letterSpacing:'1px'}}>AMOUNT</label>
                        <div style={{position:'relative'}}>
                            <span style={{position:'absolute', left:'10px', top:'15px', color:'#FFD700', fontSize:'14px', fontWeight:'bold'}}>₹</span>
                            <input 
                                style={{width: '100%', fontSize: '18px', fontWeight: '900', background: '#0a0a0a', border: '1px solid #333', color: '#FFD700', padding: '12px 5px 12px 25px', borderRadius: '10px', outline: 'none', transition:'border 0.3s'}} 
                                type="tel" placeholder="0" 
                                value={betAmount} onChange={handleAmountChange} 
                            />
                        </div>
                    </div>
                </div>

                {/* SUGGESTIONS */}
                <AnimatePresence>
                    {suggestions.length > 0 && (
                        <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} style={{marginBottom:'20px', overflow:'hidden'}}>
                            <p style={{fontSize:'10px', color:'#FFD700', marginBottom:'8px', fontWeight:'bold'}}>⚡ SUGGESTIONS</p>
                            <div style={{display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'5px', scrollbarWidth:'none'}}>
                                {suggestions.map((p, i) => (
                                    <motion.div key={i} onClick={() => handleSuggestionClick(p)} style={{background:'#222', padding:'8px 16px', borderRadius:'8px', color:'white', fontWeight:'bold', border:'1px solid #444', fontSize:'14px', minWidth:'50px', textAlign:'center', cursor:'pointer'}}>{p}</motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* QUICK AMOUNTS */}
                <div style={{display:'flex', gap:'8px', marginBottom:'20px', overflowX:'auto', paddingBottom:'10px', scrollbarWidth:'none'}}>
                    {quickAmounts.map(amt => (
                        <motion.div whileTap={{scale:0.9}} key={amt} onClick={() => { vibrate(); setBetAmount(amt.toString()); }} style={{background: betAmount == amt ? '#FFD700' : '#222', color: betAmount == amt ? 'black' : '#aaa', padding:'8px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold', border: betAmount == amt ? 'none' : '1px solid #333', whiteSpace:'nowrap', cursor:'pointer'}}>+{amt}</motion.div>
                    ))}
                </div>
                
                <motion.button whileTap={{scale:0.98}} onClick={addBet} style={{ width:'100%', padding:'16px', borderRadius:'14px', fontWeight:'900', fontSize:'16px', background: 'linear-gradient(135deg, #FFD700, #FDB931)', color:'black', border:'none', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', boxShadow:'0 5px 20px rgba(255, 215, 0, 0.2)', cursor:'pointer' }}>
                  ADD TO SLIP <PlusCircle size={20} color="black" /> 
                </motion.button>
            </div>
          </div>
      </>
      )}

      {/* BET SLIP LIST */}
      <div style={{ padding: '25px 20px', maxWidth:'600px', margin:'0 auto' }}>
        {myBets.length > 0 && <h3 style={{ color: '#666', fontSize: '12px', marginBottom: '15px', textTransform:'uppercase', fontWeight:'bold', letterSpacing:'1px' }}>Your Bets ({myBets.length})</h3>}
        <AnimatePresence>
            {myBets.map((bet) => (
                <motion.div key={bet.id} initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}} style={{ background: '#161616', padding: '15px', borderRadius: '16px', marginBottom: '10px', borderLeft: '4px solid #FFD700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' }}>
                   <div>
                       <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'4px'}}>
                          <span style={{color: 'black', background:'#FFD700', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:'bold'}}>{bet.session}</span>
                          <span style={{color: '#888', fontSize:'11px', fontWeight:'bold'}}>{bet.game.toUpperCase()}</span>
                       </div>
                       <span style={{fontSize: '20px', fontWeight: 'bold', color: 'white', letterSpacing:'1px'}}>{bet.digit}</span>
                   </div>
                   <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                      <span className="gold-text" style={{fontWeight: 'bold', fontSize:'16px'}}>₹{bet.amount}</span>
                      <motion.div whileTap={{scale:0.8}} onClick={() => removeBet(bet.id)} style={{background:'rgba(255, 59, 48, 0.1)', padding:'10px', borderRadius:'50%', cursor:'pointer'}}><Trash2 color="#FF3B30" size={16} /></motion.div>
                   </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* --- 🚀 BOTTOM FLOATING BAR --- */}
      <AnimatePresence>
      {myBets.length > 0 && (
          <motion.div initial={{y: 100}} animate={{y: 0}} exit={{y: 100}} style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'rgba(10,10,10,0.95)', backdropFilter:'blur(10px)', borderTop: '1px solid #333', padding: '15px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', zIndex: 60 }}>
              <div style={{width:'100%', maxWidth:'600px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                      <p style={{color:'#888', fontSize:'10px', margin:0, fontWeight:'bold', textTransform:'uppercase'}}>Total Amount</p>
                      <h2 className="gold-text" style={{fontSize:'24px', margin:0, lineHeight:'1.2', fontWeight:'900'}}>₹ {totalAmount}</h2>
                  </div>
                  <motion.button whileTap={{scale:0.95}} onClick={() => setShowConfirmModal(true)} style={{padding:'12px 30px', borderRadius:'50px', background:'white', color:'black', fontWeight:'900', border:'none', fontSize:'14px', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', boxShadow:'0 0 20px rgba(255,255,255,0.1)'}}>PLACE BID <ChevronRight size={18} /></motion.button>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* --- 🚀 FANCY CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {showConfirmModal && (
            <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.85)', backdropFilter:'blur(5px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} style={{background:'#1a1a1a', width:'85%', maxWidth:'340px', padding:'30px', borderRadius:'24px', textAlign:'center', border:'1px solid #333', boxShadow:'0 20px 50px rgba(0,0,0,0.7)'}}>
                    <h3 style={{color:'white', marginTop:0, fontSize:'20px'}}>Confirm Your Bets?</h3>
                    <p style={{color:'#888', fontSize:'14px', marginBottom:'25px'}}>Total Amount: <span className="gold-text" style={{fontWeight:'bold', fontSize:'18px'}}>₹{totalAmount}</span></p>
                    <div style={{display:'flex', gap:'12px'}}>
                        <button onClick={() => setShowConfirmModal(false)} disabled={isProcessing} style={{flex:1, padding:'14px', background:'#2a2a2a', color:'white', border:'none', borderRadius:'14px', fontWeight:'bold', cursor:'pointer'}}>Cancel</button>
                        <button onClick={handleFinalPlaceBid} disabled={isProcessing} style={{flex:1, padding:'14px', background:'white', color:'black', border:'none', borderRadius:'14px', fontWeight:'bold', display:'flex', justifyContent:'center', alignItems:'center', cursor: isProcessing ? 'not-allowed' : 'pointer'}}>
                            {isProcessing ? <Loader2 className="spin" size={20} /> : "Confirm"}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* --- 🚀 RESULT STATUS MODAL (Success/Fail) --- */}
      <AnimatePresence>
        {resultStatus && (
            <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.9)', zIndex:110, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.5, opacity:0}} style={{background:'#1a1a1a', width:'85%', maxWidth:'320px', padding:'40px 30px', borderRadius:'30px', textAlign:'center', border: resultStatus==='success'?'1px solid #34C759':'1px solid #FF3B30', boxShadow: resultStatus==='success'?'0 0 50px rgba(52,199,89,0.2)':'0 0 50px rgba(255,59,48,0.2)'}}>
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        style={{width:80, height:80, borderRadius:'50%', background: resultStatus==='success'?'#34C759':'#FF3B30', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}
                    >
                        {resultStatus === 'success' ? <Check size={45} color="white" strokeWidth={3} /> : <X size={45} color="white" strokeWidth={3} />}
                    </motion.div>
                    
                    <h3 style={{color:'white', margin:'0 0 10px 0', fontSize:'24px', fontWeight:'900', letterSpacing:'1px'}}>{resultStatus === 'success' ? 'BET PLACED!' : 'FAILED!'}</h3>
                    <p style={{color:'#888', fontSize:'14px', marginBottom:'30px', lineHeight:'1.5'}}>{resultMessage || "Your bet has been recorded successfully."}</p>
                    
                    <button onClick={() => {setResultStatus(null); if(resultStatus==='success') navigate('/');}} style={{width:'100%', padding:'16px', background: resultStatus==='success'?'#34C759':'#333', color:'white', border:'none', borderRadius:'16px', fontWeight:'bold', fontSize:'16px', letterSpacing:'1px', cursor:'pointer'}}>
                        {resultStatus==='success' ? 'CONTINUE' : 'TRY AGAIN'}
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BettingPage;