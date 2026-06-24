import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Loader2, Wallet as WalletIcon, Check, X, 
  ShieldCheck, Banknote, ArrowDownCircle, ArrowUpCircle, 
  RefreshCw, History, CreditCard 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- IMPORTS FOR HYBRID LOGIC ---
import { Capacitor } from '@capacitor/core'; 
import { App } from '@capacitor/app'; 
import { Browser } from '@capacitor/browser'; 

// --- SUPABASE & SERVICES ---
import { supabase } from '../supabase';
import { getUserData, sendTransactionRequest } from '../services/db';
import { initiatePayment, verifyAndAddBalance } from '../services/paymentService';

function WalletPage() {
  const navigate = useNavigate();
  
  // Data States
  const [balance, setBalance] = useState("0");
  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

  // --- 1. SMART LISTENER (App & Web Both) ---
  useEffect(() => {
    fetchBalance();

    const isApp = Capacitor.isNativePlatform();

    if (isApp) {
        // 📱 MOBILE APP LOGIC: Resume hone par check karega
        const appListener = App.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
                await checkPendingTransactions();
                fetchBalance();
            }
        });
        return () => { appListener.then(f => f.remove()); };
    } else {
        // 💻 WEBSITE LOGIC: Tab wapas khulne par check karega
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                await checkPendingTransactions();
                fetchBalance();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); };
    }
  }, []);

  const fetchBalance = async () => {
    setRefreshing(true);
    try {
        const data = await getUserData();
        setBalance(data?.balance || "0");
    } catch(e) { console.log(e); }
    setTimeout(() => setRefreshing(false), 1000);
  };

  // --- 2. AUTO-CHECK PENDING TRANSACTIONS ---
  const checkPendingTransactions = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if(!user) return;

          // Last pending deposit check
          const { data: txns, error } = await supabase
              .from('transactions')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'pending')
              .eq('type', 'deposit')
              .order('created_at', { ascending: false })
              .limit(1);

          if (!error && txns && txns.length > 0) {
              const txnData = txns[0];
              const success = await verifyAndAddBalance(txnData.order_id);
              if(success) {
                  showAlert('success', 'Payment Received!', `Your deposit of ₹${txnData.amount} was successful.`);
                  fetchBalance();
              }
          }
      } catch (e) {
          console.log("Auto-check finished");
      }
  };

  // Helper: Show Modal
  const showAlert = (type, title, message) => {
      setModal({ show: true, type, title, message });
      if(navigator.vibrate) {
          navigator.vibrate(type === 'success' ? [50, 50, 50] : [200]);
      }
  };

  const closeModal = () => {
      setModal({ ...modal, show: false });
      if(modal.type === 'success') {
          setAmount('');
          setUpiId('');
      }
  };

  // --- HANDLERS ---

  const handleDeposit = async () => {
      if(!amount || Number(amount) < 1) return showAlert('error', 'Invalid Amount', "Minimum deposit is ₹1");
      
      setLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if(!user) throw new Error("Please login again");

          // 1. Payment Link Mango
          const paymentUrl = await initiatePayment(amount, user);
          
          // 2. Open Payment Link (Hybrid Logic)
          if (paymentUrl && (paymentUrl.startsWith('http') || paymentUrl.startsWith('upi'))) {
             
             if (Capacitor.isNativePlatform()) {
                 // 📱 APP: In-App Browser (Popup style)
                 await Browser.open({ 
                     url: paymentUrl,
                     windowName: '_self', 
                     presentationStyle: 'popover', 
                     toolbarColor: '#FFD700' 
                 });
             } else {
                 // 💻 WEBSITE: Direct Redirect
                 window.location.href = paymentUrl;
             }
             
          } else {
             throw new Error("Invalid Payment Link");
          }
          
      } catch (error) {
          console.error("Deposit Error:", error);
          showAlert('error', 'Payment Failed', error.message || "Could not initiate payment.");
      } finally {
          setLoading(false);
      }
  };

  const handleWithdraw = async () => {
      if(!amount || !upiId) return showAlert('error', 'Missing Details', "Please enter Amount & UPI ID");
      if(Number(amount) > Number(balance)) return showAlert('error', 'Low Balance', "Insufficient wallet balance.");
      if(Number(amount) < 500) return showAlert('error', 'Minimum Limit', "Minimum withdrawal is ₹500");

      setLoading(true);
      try {
          // Backend Request
          await sendTransactionRequest('withdraw', amount, 'UPI', upiId);
          
          showAlert('success', 'Request Sent', "Your withdrawal request has been submitted successfully.");
          fetchBalance(); // Refresh balance immediately

      } catch(e) { 
          showAlert('error', 'Request Failed', typeof e === 'string' ? e : "Server error. Try later."); 
      }
      setLoading(false);
  };

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '30px', fontFamily:'sans-serif', color:'white' }}>
      
      {/* --- 1. STICKY HEADER --- */}
      <div style={{ 
          padding: '15px 20px', background: 'rgba(20, 20, 20, 0.9)', backdropFilter:'blur(10px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          position:'sticky', top:0, zIndex:50, borderBottom:'1px solid #222' 
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div onClick={() => navigate('/')} style={{background:'#222', padding:'8px', borderRadius:'50%', cursor:'pointer'}}>
                <ArrowLeft color="white" size={20} />
            </div>
            <h2 className="gold-text" style={{ fontSize: '18px', margin:0, letterSpacing:'1px', fontWeight:'900', color: '#FFD700' }}>MY WALLET</h2>
        </div>
        <div onClick={() => navigate('/history')} style={{background:'#222', padding:'8px', borderRadius:'50%', cursor:'pointer'}}>
            <History color="#FFD700" size={20} />
        </div>
      </div>

      {/* --- 2. ATM STYLE BALANCE CARD --- */}
      <div style={{ padding: '20px' }}>
        <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{ 
                background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)', 
                borderRadius: '24px', padding: '25px', color: 'black',
                boxShadow: '0 10px 40px rgba(255, 215, 0, 0.15)', position:'relative', overflow:'hidden',
                border: '1px solid rgba(255, 215, 0, 0.5)'
            }}
        >
            {/* Background Texture */}
            <div style={{position:'absolute', right:'-30px', top:'-30px', opacity:0.1, transform:'rotate(-15deg)'}}>
                <WalletIcon size={180} color="black" />
            </div>
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'25px'}}>
                <CreditCard size={32} strokeWidth={1.5} />
                <div onClick={fetchBalance} style={{background:'rgba(0,0,0,0.1)', padding:'8px', borderRadius:'50%', cursor:'pointer'}}>
                    <RefreshCw size={20} className={refreshing ? "spin" : ""} />
                </div>
            </div>

            <div>
                <p style={{ fontSize: '11px', fontWeight: '800', opacity: 0.7, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'5px' }}>Total Balance</p>
                <h1 style={{ fontSize: '40px', fontWeight: '900', margin:'0', fontFamily:'monospace', letterSpacing:'-1px' }}>₹{balance}</h1>
            </div>
            
            <div style={{marginTop:'20px', display:'flex', alignItems:'center', gap:'6px'}}>
                <ShieldCheck size={14} />
                <span style={{fontSize:'10px', fontWeight:'700', textTransform:'uppercase'}}>256-Bit Secure Payment</span>
            </div>
        </motion.div>
      </div>

      {/* --- 3. TAB SWITCHER --- */}
      <div style={{ display: 'flex', margin: '0 20px 25px', background: '#161616', borderRadius: '16px', padding: '6px', border:'1px solid #333' }}>
        <button 
            onClick={() => setActiveTab('deposit')} 
            style={{
                flex:1, padding:'12px', borderRadius:'12px', border:'none', fontWeight:'bold', fontSize:'13px',
                background: activeTab==='deposit' ? '#222' : 'transparent', 
                color: activeTab==='deposit' ? '#34C759' : '#666', 
                transition:'0.3s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                boxShadow: activeTab==='deposit' ? '0 4px 10px rgba(0,0,0,0.2)' : 'none'
            }}
        >
            <ArrowDownCircle size={18} /> ADD FUNDS
        </button>
        <button 
            onClick={() => setActiveTab('withdraw')} 
            style={{
                flex:1, padding:'12px', borderRadius:'12px', border:'none', fontWeight:'bold', fontSize:'13px',
                background: activeTab==='withdraw' ? '#222' : 'transparent', 
                color: activeTab==='withdraw' ? '#FF3B30' : '#666', 
                transition:'0.3s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                boxShadow: activeTab==='withdraw' ? '0 4px 10px rgba(0,0,0,0.2)' : 'none'
            }}
        >
            WITHDRAW <ArrowUpCircle size={18} />
        </button>
      </div>

      {/* --- 4. ACTION FORMS --- */}
      <div style={{ padding: '0 20px' }}>
        <AnimatePresence mode='wait'>
            {activeTab === 'deposit' ? (
                <motion.div 
                    key="deposit"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    transition={{duration: 0.2}}
                    style={{ background: '#161616', padding: '25px', borderRadius: '24px', border: '1px solid #333', boxShadow:'0 10px 30px rgba(0,0,0,0.3)' }}
                >
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <h3 style={{margin:0, color:'white', fontSize:'16px'}}>Deposit Money</h3>
                        <span style={{fontSize:'10px', background:'rgba(52, 199, 89, 0.2)', padding:'4px 8px', borderRadius:'6px', color:'#34C759', fontWeight:'bold'}}>INSTANT</span>
                    </div>

                    <label style={labelStyle}>ENTER AMOUNT</label>
                    <div style={{position:'relative'}}>
                        <span style={{position:'absolute', left:'15px', top:'18px', color:'#888', fontWeight:'bold', fontSize:'18px'}}>₹</span>
                        <input 
                            type="tel" inputMode="numeric" 
                            placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} 
                            style={{...inputStyle, paddingLeft:'35px', color:'#34C759', fontSize:'24px', fontWeight:'bold'}} 
                        />
                    </div>

                    {/* Quick Chips */}
                    <div style={{display:'flex', gap:'10px', marginBottom:'25px', overflowX:'auto', paddingBottom:'5px', scrollbarWidth:'none'}}>
                        {quickAmounts.map(amt => (
                            <motion.div 
                                whileTap={{scale:0.9}}
                                key={amt} onClick={() => setAmount(amt)} 
                                style={{
                                    background: amount == amt ? 'rgba(52, 199, 89, 0.2)' : '#222', 
                                    padding:'8px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold', cursor:'pointer', 
                                    border: amount == amt ? '1px solid #34C759' : '1px solid #333', 
                                    color: amount == amt ? '#34C759' : '#888', whiteSpace:'nowrap'
                                }}
                            >
                                + ₹{amt}
                            </motion.div>
                        ))}
                    </div>
                    
                    <motion.button 
                        whileTap={{scale:0.96}}
                        onClick={handleDeposit} disabled={loading} 
                        className="btn-gold" 
                        style={{
                            width:'100%', background: loading ? '#333' : 'linear-gradient(135deg, #34C759, #208e3b)', 
                            color:'white', display:'flex', justifyContent:'center', alignItems:'center', gap:'10px', 
                            height:'55px', fontSize:'15px', borderRadius:'16px', border:'none', fontWeight:'bold',
                            boxShadow:'0 5px 15px rgba(52, 199, 89, 0.3)'
                        }}
                    >
                        {loading ? <Loader2 className="spin" /> : <><Banknote size={20} /> ADD SECURELY</>}
                    </motion.button>
                    
                    <p style={{textAlign:'center', color:'#555', fontSize:'10px', marginTop:'20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px'}}>
                        <ShieldCheck size={12}/> Payments are 100% Secure
                    </p>
                </motion.div>
            ) : (
                <motion.div 
                    key="withdraw"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{duration: 0.2}}
                    style={{ background: '#161616', padding: '25px', borderRadius: '24px', border: '1px solid #333', boxShadow:'0 10px 30px rgba(0,0,0,0.3)' }}
                >
                    <h3 style={{margin:'0 0 20px 0', color:'white', fontSize:'16px'}}>Withdraw Money</h3>
                    
                    <label style={labelStyle}>WITHDRAW AMOUNT</label>
                    <div style={{position:'relative'}}>
                        <span style={{position:'absolute', left:'15px', top:'18px', color:'#888', fontWeight:'bold', fontSize:'18px'}}>₹</span>
                        <input 
                            type="tel" inputMode="numeric" 
                            placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} 
                            style={{...inputStyle, paddingLeft:'35px', color:'#FF3B30', fontSize:'24px', fontWeight:'bold'}} 
                        />
                    </div>

                    <label style={labelStyle}>UPI ID / BANK</label>
                    <input 
                        type="text" placeholder="e.g. 9876543210@upi" 
                        value={upiId} onChange={e => setUpiId(e.target.value)} 
                        style={inputStyle} 
                    />
                    
                    <motion.button 
                        whileTap={{scale:0.96}}
                        onClick={handleWithdraw} disabled={loading} 
                        style={{
                            width:'100%', background: loading ? '#333' : '#FF3B30', color:'white', 
                            height:'55px', fontSize:'15px', borderRadius:'16px', border:'none', fontWeight:'bold',
                            display:'flex', justifyContent:'center', alignItems:'center', gap:'8px',
                            boxShadow:'0 5px 15px rgba(255, 59, 48, 0.3)', cursor:'pointer'
                        }}
                    >
                        {loading ? <Loader2 className="spin" /> : "SUBMIT REQUEST"}
                    </motion.button>
                    
                    <div style={{background:'rgba(255, 107, 107, 0.1)', padding:'12px', borderRadius:'12px', marginTop:'25px', border:'1px solid rgba(255, 107, 107, 0.2)'}}>
                        <p style={{color:'#FF6B6B', fontSize:'11px', margin:0, fontWeight:'bold'}}>⚠️ Withdrawal Rules:</p>
                        <p style={{color:'#aaa', fontSize:'11px', margin:'5px 0 0 0'}}>• Minimum withdrawal amount is ₹500.</p>
                        <p style={{color:'#aaa', fontSize:'11px', margin:'2px 0 0 0'}}>• Processing time: 15 mins to 24 hours.</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* --- CUSTOM ALERT MODAL --- */}
      <AnimatePresence>
        {modal.show && (
            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <motion.div 
                    initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.8, opacity:0}}
                    style={{background:'#1A1A1A', width:'85%', maxWidth:'320px', padding:'30px', borderRadius:'24px', textAlign:'center', border:'1px solid #333', boxShadow:'0 25px 50px rgba(0,0,0,0.6)'}}
                >
                    <div style={{
                        width: 70, height: 70, borderRadius:'50%', margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center',
                        background: modal.type === 'success' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                        border: modal.type === 'success' ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 59, 48, 0.3)'
                    }}>
                        {modal.type === 'success' ? <Check size={35} color="#34C759" strokeWidth={3} /> : <X size={35} color="#FF3B30" strokeWidth={3} />}
                    </div>
                    
                    <h3 style={{color:'white', fontSize:'20px', margin:'0 0 10px 0'}}>
                        {modal.title}
                    </h3>
                    
                    <p style={{color:'#999', fontSize:'14px', margin:'0 0 25px 0', lineHeight:'1.5'}}>
                        {modal.message}
                    </p>
                    
                    <motion.button 
                        whileTap={{scale:0.96}}
                        onClick={closeModal} 
                        style={{
                            width:'100%', padding:'14px', borderRadius:'14px', border:'none', 
                            background: modal.type === 'success' ? '#34C759' : '#333', 
                            color:'white', fontWeight:'bold', fontSize:'14px', cursor:'pointer'
                        }}
                    >
                        {modal.type === 'success' ? 'OK, GREAT' : 'TRY AGAIN'}
                    </motion.button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// STYLES
const labelStyle = { display:'block', fontSize:'11px', color:'#888', marginBottom:'10px', fontWeight:'bold', letterSpacing:'1px' };
const inputStyle = { width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', color: 'white', borderRadius: '14px', marginBottom: '20px', outline:'none', transition:'border 0.3s' };

export default WalletPage;