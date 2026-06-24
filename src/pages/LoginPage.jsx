import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, ArrowRight, ShieldCheck, Loader2, 
  CheckCircle, AlertCircle, Lock, ChevronLeft, Phone, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoginPage() {
  const navigate = useNavigate();
  
  // --- STATES ---
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('INPUT_PHONE'); // 'INPUT_PHONE' | 'INPUT_OTP'
  const [loading, setLoading] = useState(false);
  
  // Security & UX States
  const [timer, setTimer] = useState(0); // Anti-Spam Timer
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isFocused, setIsFocused] = useState(false);

  // --- HELPER: TOAST NOTIFICATION ---
  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // --- TIMER LOGIC (ANTI-SPAM) ---
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // --- SEND OTP (Supabase) ---
  const handleSendOtp = async (isResend = false) => {
    if (!phone || phone.length !== 10) return showToast("Enter valid 10-digit number", "error");
    if (timer > 0 && isResend) return showToast(`Wait ${timer}s before resending`, "error");

    setLoading(true);
    try {
      const phoneNumber = "+91" + phone;
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;
      
      setLoading(false);
      setStep('INPUT_OTP');
      setTimer(30);
      showToast(isResend ? "OTP Resent!" : "OTP Sent Successfully", "success");

    } catch (error) {
      console.error("OTP Error:", error);
      setLoading(false);
      
      let msg = "Connection Error. Try again.";
      if (error.message?.includes('rate_limit') || error.message?.includes('too many')) {
        msg = "Too many attempts. Try later.";
      }
      if (error.message?.includes('invalid') || error.message?.includes('phone')) {
        msg = "Invalid Phone Number format.";
      }
      
      showToast(msg, "error");
    }
  };

  // --- VERIFY OTP (Supabase) ---
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return showToast("Enter 6-digit OTP", "error");
    
    setLoading(true);
    try {
      const phoneNumber = "+91" + phone;
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;
      
      showToast("Login Successful!", "success");
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      // Note: App.jsx handles the redirect to "/" automatically on session change
    } catch (error) {
      setLoading(false);
      setOtp('');
      if (error.message?.includes('invalid') || error.message?.includes('Token')) {
          showToast("Wrong OTP entered.", "error");
      } else {
          showToast("Verification failed. Try again.", "error");
      }
      if (navigator.vibrate) navigator.vibrate(200);
    }
  };


  // Auto-Submit when OTP is 6 digits
  useEffect(() => {
      if(otp.length === 6) handleVerifyOtp();
  }, [otp]);

  // --- RENDER ---
  return (
    <div style={styles.container}>
      
      {/* CSS For Autofill */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
            -webkit-text-fill-color: white;
            -webkit-box-shadow: 0 0 0px 1000px #000 inset;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Background Ambience */}
      <div style={styles.blobTop}></div>
      <div style={styles.blobBottom}></div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
            <motion.div 
                initial={{ y: -60, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, margin: '0 auto', width: '90%', maxWidth: '350px',
                    zIndex: 200, padding: '14px', borderRadius: '50px',
                    background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)',
                    backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent:'center', gap: '10px', color: 'white', fontWeight:'bold'
                }}
            >
                {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                <span>{toast.message}</span>
            </motion.div>
        )}
      </AnimatePresence>

      <div style={{position: 'relative', zIndex: 10, width: '100%', maxWidth: '400px', padding: '20px'}}>
          
          {/* Logo Area */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={styles.logoBox}>
               <span style={{ fontSize: '36px', fontWeight:'900', color: '#000', fontFamily:'serif' }}>R</span>
            </div>
            <h1 className="gold-text" style={{ fontSize: '28px', fontWeight:'900', margin: '15px 0 5px', letterSpacing:'3px' }}>ROYAL MATKA</h1>
            <p style={{ color: '#666', fontSize: '12px', margin:0, letterSpacing:'1px', textTransform:'uppercase' }}>The King of Matka World</p>
          </motion.div>

          {/* Form Card */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
            style={styles.card}
          >
            <AnimatePresence mode="wait">
                
                {/* STEP 1: PHONE INPUT */}
                {step === 'INPUT_PHONE' && (
                    <motion.div key="phone" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{duration:0.2}}>
                        <label style={styles.label}>MOBILE NUMBER</label>
                        <div style={{...styles.inputGroup, borderColor: isFocused ? '#FFD700' : '#333', boxShadow: isFocused ? '0 0 15px rgba(255, 215, 0, 0.1)' : 'none'}}>
                            <div style={{padding:'0 15px', color:'#FFD700', borderRight:'1px solid #333', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold'}}>
                                <Phone size={18} /> +91
                            </div>
                            <input 
                                type="tel" 
                                value={phone}
                                inputMode="numeric"
                                autoComplete="tel"
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if(val.length <= 10) setPhone(val);
                                }}
                                placeholder="98765 43210"
                                style={styles.input}
                            />
                        </div>
                        <motion.button 
                            whileTap={{scale:0.97}}
                            onClick={() => handleSendOtp(false)} 
                            disabled={loading}
                            style={{...styles.primaryBtn, opacity: loading ? 0.7 : 1}}
                        >
                            {loading ? <Loader2 className="spin" size={20} color="black"/> : <>GET OTP <ArrowRight size={20} /></>}
                        </motion.button>
                        <p style={{textAlign:'center', fontSize:'10px', color:'#555', marginTop:'15px'}}>By logging in, you agree to our Terms.</p>
                    </motion.div>
                )}

                {/* STEP 2: OTP INPUT */}
                {step === 'INPUT_OTP' && (
                    <motion.div key="otp" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{duration:0.2}}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                             <div>
                                <label style={styles.label}>ENTER OTP</label>
                                <p style={{fontSize:'11px', color:'#666', margin:0}}>Sent to +91 {phone}</p>
                             </div>
                             <button onClick={() => setStep('INPUT_PHONE')} style={{background:'none', border:'none', color:'#FFD700', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}>
                                <ChevronLeft size={12}/> Edit
                             </button>
                         </div>
                         
                         <div style={{...styles.inputGroup, borderColor: isFocused ? '#FFD700' : '#333'}}>
                            <div style={{padding:'0 15px', color:'#666'}}><Lock size={18} /></div>
                            <input 
                                type="tel"
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                autoFocus
                                value={otp}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if(val.length <= 6) setOtp(val);
                                }}
                                placeholder="• • • • • •"
                                style={{...styles.input, letterSpacing: '8px', fontSize:'24px', fontWeight:'bold', textAlign:'center', paddingRight:'50px'}}
                            />
                        </div>

                        {/* Verify Button */}
                        <motion.button 
                            whileTap={{scale:0.97}}
                            onClick={handleVerifyOtp} 
                            disabled={loading || otp.length !== 6}
                            style={{...styles.primaryBtn, background: otp.length===6 ? '#34C759' : '#333', color:'white', marginTop:'20px'}}
                        >
                             {loading ? <Loader2 className="spin" size={20} /> : "VERIFY & LOGIN"}
                        </motion.button>

                        {/* Resend Logic */}
                        <div style={{textAlign:'center', marginTop:'20px'}}>
                            {timer > 0 ? (
                                <p style={{fontSize:'12px', color:'#666'}}>Resend OTP in <span style={{color:'#FFD700'}}>{timer}s</span></p>
                            ) : (
                                <button onClick={() => handleSendOtp(true)} style={{background:'none', border:'none', color:'#FFD700', fontSize:'12px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', margin:'0 auto'}}>
                                    <RefreshCw size={12} /> Resend OTP
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <div style={{textAlign:'center', marginTop:'40px', opacity:0.6}}>
              <p style={{fontSize:'10px', color:'#888', display:'flex', justifyContent:'center', alignItems:'center', gap:'5px'}}>
                  <ShieldCheck size={12}/> Secured by Supabase Auth
              </p>
          </div>

      </div>

    </div>
  );
}

// --- STYLES ---
const styles = {
    container: { minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily:"sans-serif", position:'relative', overflow:'hidden' },
    
    blobTop: { position:'absolute', top:'-150px', left:'-50px', width:'350px', height:'350px', background:'#FFD700', borderRadius:'50%', filter:'blur(130px)', opacity:0.12, pointerEvents:'none' },
    blobBottom: { position:'absolute', bottom:'-150px', right:'-50px', width:'300px', height:'300px', background:'#FFD700', borderRadius:'50%', filter:'blur(130px)', opacity:0.08, pointerEvents:'none' },
    
    logoBox: { width:'80px', height:'80px', background:'linear-gradient(135deg, #FFD700, #C5A000)', borderRadius:'24px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', boxShadow:'0 0 40px rgba(255, 215, 0, 0.25)' },
    
    card: { background:'rgba(20, 20, 20, 0.6)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', padding:'35px 25px', borderRadius:'24px', boxShadow:'0 20px 60px rgba(0,0,0,0.6)' },
    
    label: { fontSize: '11px', color: '#888', display: 'block', marginBottom: '8px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase' },
    
    inputGroup: { display: 'flex', alignItems: 'center', background: '#000', border: '1px solid #333', borderRadius: '14px', overflow:'hidden', height:'55px', transition:'all 0.3s ease' },
    input: { flex: 1, height:'100%', background: 'transparent', border: 'none', color: 'white', padding: '0 15px', fontSize: '18px', outline: 'none', fontWeight:'600' },
    
    primaryBtn: { width: '100%', height:'55px', borderRadius:'14px', border:'none', fontSize:'15px', fontWeight:'900', background: 'linear-gradient(135deg, #FFD700, #E0AA00)', color: 'black', cursor:'pointer', marginTop:'20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', boxShadow:'0 8px 25px rgba(255, 215, 0, 0.15)', transition:'0.2s' }
};

export default LoginPage;