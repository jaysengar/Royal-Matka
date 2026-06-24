import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyAndAddBalance } from '../services/paymentService';
import { supabase } from '../supabase';
import { 
  Check, X, ShieldCheck, Copy, Wallet, 
  Calendar, CreditCard, Hash 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function PaymentStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // States
  const [status, setStatus] = useState('verifying'); // verifying | success | failed
  const [txnData, setTxnData] = useState(null); // Database se aayega
  const [errorMessage, setErrorMessage] = useState('');

  // URL se Order ID nikalo
  const orderId = searchParams.get('order_id') || searchParams.get('client_txn_id');

  useEffect(() => {
    if(!orderId) {
        setStatus('failed');
        setErrorMessage("Invalid Transaction ID received");
        return;
    }
    
    // Process Start
    handleProcess(orderId);
  }, [orderId]);

  const handleProcess = async (id) => {
      try {
          // Step 1: Backend Verification (Balance Add karna)
          await verifyAndAddBalance(id);
          
          // Step 2: Database se Real Data nikalo (Receipt ke liye)
          const { data: txns } = await supabase
              .from('transactions')
              .select('*')
              .eq('order_id', id)
              .limit(1);
          
          if (txns && txns.length > 0) {
              const row = txns[0];
              setTxnData({
                amount: row.amount,
                orderId: row.order_id,
                method: row.method,
                date: row.created_at,
                status: row.status,
              });
          }

          setStatus('success');
          if(navigator.vibrate) navigator.vibrate([100, 50, 100]);

      } catch (e) {
          console.error("Process Failed:", e);
          setStatus('failed');
          setErrorMessage("Verification Failed. If money deducted, contact support.");
          if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
  };

  // Helper: Copy Txn ID
  const copyToClipboard = () => {
      if(txnData?.orderId || orderId) {
        navigator.clipboard.writeText(txnData?.orderId || orderId);
      }
  };

  // Helper: Format Date
  const formatDate = (timestamp) => {
      if (!timestamp) return new Date().toLocaleString();
      // ISO string to JS Date
      return new Date(timestamp).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
  };

  // Helper: Exit/Close
  const handleExit = () => {
      try {
          window.close(); // Mobile App Close
      } catch (e) {}
      navigate('/wallet'); // Web Redirect
  };

  // --- UI RENDERER ---
  const renderContent = () => {
      switch(status) {
          case 'verifying':
              return (
                  <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} style={{textAlign:'center'}}>
                      <div className="spin-slow" style={{position:'relative', width:80, height:80, margin:'0 auto 20px'}}>
                          <div style={{position:'absolute', inset:0, border:'4px solid #333', borderTop:'4px solid #FFD700', borderRadius:'50%'}}></div>
                          <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
                              <ShieldCheck size={30} color="#FFD700" />
                          </div>
                      </div>
                      <h2 style={{color:'white', margin:'0 0 10px 0'}}>Verifying Payment...</h2>
                      <p style={{color:'#888', fontSize:'13px'}}>Checking with bank. Please wait.</p>
                  </motion.div>
              );

          case 'success':
              return (
                  <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} style={{textAlign:'center', width:'100%'}}>
                      
                      {/* Success Icon */}
                      <div style={{
                          width:80, height:80, background:'rgba(52, 199, 89, 0.15)', borderRadius:'50%', 
                          margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center',
                          border:'1px solid rgba(52, 199, 89, 0.3)', boxShadow:'0 0 30px rgba(52, 199, 89, 0.2)'
                      }}>
                          <Check size={45} color="#34C759" strokeWidth={4} />
                      </div>
                      
                      <h2 style={{color:'white', margin:'0 0 5px 0', fontSize:'22px'}}>Payment Successful!</h2>
                      <p style={{color:'#888', fontSize:'13px', marginBottom:'25px'}}>Funds added to your wallet.</p>
                      
                      {/* DIGITAL RECEIPT CARD (Database Data) */}
                      <div style={{background:'#111', borderRadius:'16px', border:'1px dashed #333', padding:'20px', marginBottom:'25px', textAlign:'left'}}>
                          
                          {/* Amount */}
                          <div style={{marginBottom:'15px', borderBottom:'1px solid #222', paddingBottom:'15px'}}>
                              <p style={{fontSize:'10px', color:'#666', textTransform:'uppercase', fontWeight:'bold', marginBottom:'5px'}}>Amount Added</p>
                              <div style={{fontSize:'28px', color:'#34C759', fontWeight:'900', fontFamily:'monospace'}}>
                                  ₹{txnData?.amount || "0.00"}
                              </div>
                          </div>

                          {/* Details Grid */}
                          <div style={{display:'grid', gap:'12px'}}>
                              
                              {/* Order ID */}
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                      <Hash size={14} color="#FFD700"/>
                                      <span style={{color:'#888', fontSize:'12px'}}>Order ID</span>
                                  </div>
                                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                      <span style={{color:'#fff', fontSize:'12px', fontFamily:'monospace'}}>{txnData?.orderId || orderId}</span>
                                      <Copy size={12} color="#FFD700" onClick={copyToClipboard} style={{cursor:'pointer'}}/>
                                  </div>
                              </div>

                              {/* Date */}
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                      <Calendar size={14} color="#FFD700"/>
                                      <span style={{color:'#888', fontSize:'12px'}}>Date</span>
                                  </div>
                                  <span style={{color:'#fff', fontSize:'12px'}}>
                                      {formatDate(txnData?.date)}
                                  </span>
                              </div>

                              {/* Method */}
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                      <CreditCard size={14} color="#FFD700"/>
                                      <span style={{color:'#888', fontSize:'12px'}}>Method</span>
                                  </div>
                                  <span style={{color:'#fff', fontSize:'12px', textTransform:'uppercase'}}>
                                      {txnData?.method || "UPI"}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {/* Exit Button */}
                      <button onClick={handleExit} className="btn-gold" style={{
                          width:'100%', padding:'14px', borderRadius:'12px', border:'none', fontSize:'14px', fontWeight:'900',
                          background: 'linear-gradient(135deg, #FFD700, #C5A000)', color:'black', cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                      }}>
                          <Wallet size={18} /> GO TO WALLET
                      </button>
                      
                      <p style={{fontSize:'10px', color:'#555', marginTop:'15px'}}>Click above to return to App</p>
                  </motion.div>
              );

          case 'failed':
              return (
                  <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} style={{textAlign:'center'}}>
                      <div style={{
                          width:80, height:80, background:'rgba(255, 59, 48, 0.15)', borderRadius:'50%', 
                          margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center',
                          border:'1px solid rgba(255, 59, 48, 0.3)'
                      }}>
                          <X size={40} color="#FF3B30" strokeWidth={4} />
                      </div>
                      <h2 style={{color:'white', margin:'0 0 10px 0'}}>Payment Failed</h2>
                      <p style={{color:'#888', fontSize:'13px', marginBottom:'25px', lineHeight:'1.4'}}>
                          {errorMessage}
                      </p>
                      
                      <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={handleExit} style={{
                            flex:1, background:'#333', color:'white', border:'none', padding:'12px', 
                            borderRadius:'12px', fontWeight:'bold', cursor:'pointer'
                        }}>
                            TRY AGAIN
                        </button>
                        <button onClick={() => window.open('https://wa.me/6307311834', '_blank')} style={{
                            flex:1, background:'transparent', color:'#FFD700', border:'1px solid #FFD700', padding:'12px', 
                            borderRadius:'12px', fontWeight:'bold', cursor:'pointer'
                        }}>
                            SUPPORT
                        </button>
                      </div>
                  </motion.div>
              );
          default: return null;
      }
  };

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'sans-serif'}}>
        
        {/* Glow Effect */}
        <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', width:'300px', height:'300px', background: status==='success'?'#34C759': status==='failed'?'#FF3B30':'#FFD700', borderRadius:'50%', filter:'blur(150px)', opacity:0.15, zIndex:0}}></div>

        <motion.div layout style={{
            background: '#161616', padding: '30px', borderRadius: '24px', 
            width: '100%', maxWidth: '360px', border: '1px solid #2a2a2a',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex:1, position:'relative'
        }}>
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </motion.div>

        <style>{`.spin-slow { animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default PaymentStatus;