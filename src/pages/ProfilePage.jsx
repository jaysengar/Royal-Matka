import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Phone, Share2, LogOut, FileText, ChevronRight, 
  User, ShieldCheck, Star, FileQuestion, Lock, Wallet, Copy, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { getAppConfig, getUserData } from '../services/db'; 
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '../components/BottomNav';

function ProfilePage() {
  const navigate = useNavigate();
  
  // --- STATES ---
  const [userProfile, setUserProfile] = useState(null); // Database Data
  const [config, setConfig] = useState({ whatsapp: '', appLink: 'https://royal-matka.web.app' });
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [showRates, setShowRates] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'logout' | 'rules' | 'privacy'
  const [toast, setToast] = useState({ show: false, msg: '' });

  // --- INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      // 1. Get Config
      const cfg = await getAppConfig();
      if(cfg) setConfig({ whatsapp: cfg.whatsapp || '', appLink: cfg.appLink || '' });

      // 2. Get Secure User Data
      const uData = await getUserData();
      if(uData) {
          setUserProfile(uData);
      } else {
          // Fallback if DB fetch fails (Auth Object)
          const { data: { user: curr } } = await supabase.auth.getUser();
          if(curr) setUserProfile({ phone: curr.phone, balance: '0' });
      }
      setLoading(false);
    };
    
    init();
  }, []);

  // --- HANDLERS ---
  const handleLogout = () => {
    if(navigator.vibrate) navigator.vibrate(50);
    supabase.auth.signOut();
    navigate('/login');
  };

  const openWhatsApp = () => {
    if(!config.whatsapp) return showToast("Support currently unavailable");
    const msg = `Hello Admin, I need help.\nMy ID: ${userProfile?.phone}`;
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Royal Matka',
          text: 'Play Online Matka on the most trusted app! Join now:',
          url: config.appLink,
        });
      } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(config.appLink);
      showToast("App Link Copied!");
    }
  };

  const showToast = (msg) => {
      setToast({ show: true, msg });
      setTimeout(() => setToast({ show: false, msg: '' }), 2500);
  };

  // --- RENDER ---
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '90px', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* 🚀 TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.show && (
            <motion.div 
                initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, margin: '0 auto', width: 'max-content',
                    background: 'rgba(52, 199, 89, 0.95)', color: 'white', padding: '10px 20px', borderRadius: '30px',
                    zIndex: 200, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', backdropFilter:'blur(5px)'
                }}
            >
                <CheckCircle size={16} /> {toast.msg}
            </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div style={{ 
        padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', 
        background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)', 
        position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #222'
      }}>
        <div onClick={() => navigate('/')} style={{padding:'8px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
            <ArrowLeft color="white" size={20} />
        </div>
        <h2 className="gold-text" style={{ fontSize: '18px', margin: 0, textTransform:'uppercase', fontWeight:'900', letterSpacing:'1px' }}>Profile</h2>
      </div>

      {/* PROFILE CARD */}
      <div style={{ padding: '30px 20px', background: 'linear-gradient(180deg, #161616 0%, #0a0a0a 100%)', textAlign: 'center', borderBottom: '1px solid #222', position:'relative', overflow:'hidden' }}>
        {/* Animated Glow */}
        <div style={{position:'absolute', top:'-60%', left:'50%', transform:'translateX(-50%)', width:'250px', height:'250px', background:'#FFD700', borderRadius:'50%', filter:'blur(120px)', opacity:0.15}}></div>

        <motion.div 
            initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}}
            style={{ 
                width: '80px', height: '80px', margin: '0 auto 15px', 
                borderRadius: '50%', background: '#1E1E1E', border: '2px solid #FFD700', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.25)', position:'relative', zIndex:1
            }}
        >
            <User size={40} color="#FFD700" />
        </motion.div>
        
        <h2 style={{ fontSize: '20px', margin: '0 0 5px 0', fontWeight:'bold', letterSpacing:'0.5px', textTransform: 'capitalize' }}>
            {loading ? "Loading..." : (userProfile?.name || "Royal Player")}
        </h2>
        
        <div style={{display:'inline-flex', alignItems:'center', gap:'8px', background:'#222', padding:'6px 14px', borderRadius:'20px', border:'1px solid #333', marginTop:'5px'}}>
            <Phone size={12} color="#888" />
            <span style={{ color: '#ccc', fontSize: '13px', fontFamily:'monospace', fontWeight:'bold' }}>
                {userProfile?.phone || "Loading..."}
            </span>
        </div>

        {/* Wallet Strip */}
        <div style={{marginTop:'20px', display:'flex', justifyContent:'center'}}>
            <motion.div whileTap={{scale:0.95}} onClick={() => navigate('/wallet')} style={{background:'linear-gradient(90deg, #FFD700, #FDB931)', padding:'10px 20px', borderRadius:'12px', display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 5px 15px rgba(255, 215, 0, 0.2)', cursor:'pointer'}}>
                <div style={{background:'rgba(0,0,0,0.1)', padding:'5px', borderRadius:'50%'}}><Wallet size={18} color="black"/></div>
                <div style={{textAlign:'left'}}>
                    <span style={{display:'block', fontSize:'10px', color:'black', fontWeight:'bold', textTransform:'uppercase'}}>Wallet Balance</span>
                    <span style={{display:'block', fontSize:'18px', color:'black', fontWeight:'900'}}>₹ {userProfile?.balance || "0"}</span>
                </div>
                <ChevronRight size={18} color="black" style={{opacity:0.5}}/>
            </motion.div>
        </div>
      </div>

      {/* MENU LIST */}
      <div style={{ padding: '20px' }}>
        
        {/* Game Rates */}
        <MenuItem 
            icon={<FileText color="#FFD700" size={20} />} 
            label="Game Rates" 
            onClick={() => navigate('/rates')}
            rightIcon={<ChevronRight size={18} color="#666" />}
        />

        <MenuItem 
            icon={<Phone color="#34C759" size={20} />} 
            label="Help & Support" 
            onClick={openWhatsApp}
            subLabel="Chat with Admin"
        />

        <MenuItem 
            icon={<Share2 color="#3B82F6" size={20} />} 
            label="Share App" 
            onClick={shareApp}
            subLabel="Invite Friends"
        />

        <MenuItem 
            icon={<FileQuestion color="#aaa" size={20} />} 
            label="Game Rules" 
            onClick={() => setActiveModal('rules')}
        />

        <MenuItem 
            icon={<ShieldCheck color="#FFD700" size={20} />} 
            label="Terms & Conditions" 
            onClick={() => navigate('/terms')}
            subLabel="Privacy & Policies"
        />
        
        <div style={{marginTop:'30px'}}>
            <MenuItem 
                icon={<LogOut color="#FF3B30" size={20} />} 
                label="Logout" 
                onClick={() => setActiveModal('logout')}
                isLogout
            />
        </div>

      </div>

      {/* FOOTER */}
      <div style={{textAlign:'center', marginTop:'10px', opacity:0.5}}>
         <p style={{fontSize:'10px', color:'#888', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', margin:0}}>
             <ShieldCheck size={12} /> 100% Safe & Secure
         </p>
         <p style={{fontSize:'10px', color:'#666', marginTop:'5px'}}>Version 2.0.1</p>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        
        {/* LOGOUT MODAL */}
        {activeModal === 'logout' && (
            <ModalWrapper onClose={() => setActiveModal(null)}>
                <div style={{width: 60, height: 60, borderRadius: '50%', background: 'rgba(255, 59, 48, 0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <LogOut size={30} color="#FF3B30" />
                </div>
                <h3 style={{color:'white', margin:'0 0 10px 0', fontSize:'20px'}}>Logout?</h3>
                <p style={{color:'#888', fontSize:'14px', marginBottom:'25px'}}>Are you sure you want to sign out?</p>
                <div style={{display:'flex', gap:'12px'}}>
                    <button onClick={() => setActiveModal(null)} style={styles.secondaryBtn}>CANCEL</button>
                    <button onClick={handleLogout} style={styles.primaryBtn}>LOGOUT</button>
                </div>
            </ModalWrapper>
        )}

        {/* RULES MODAL */}
        {activeModal === 'rules' && (
            <ModalWrapper onClose={() => setActiveModal(null)}>
                <div style={{textAlign:'left'}}>
                    <h3 style={{color:'white', margin:'0 0 15px 0', fontSize:'18px', borderBottom:'1px solid #333', paddingBottom:'10px'}}>📜 Game Rules</h3>
                    <ul style={{color:'#ccc', fontSize:'13px', lineHeight:'1.6', paddingLeft:'20px', margin:0}}>
                        <li style={{marginBottom:'8px'}}>Markets open and close at fixed times. Bets placed after close time will be rejected.</li>
                        <li style={{marginBottom:'8px'}}>Results are declared by market officials. Admin decision is final.</li>
                        <li style={{marginBottom:'8px'}}>Withdrawals are processed daily between 10 AM to 6 PM.</li>
                        <li>Do not share your password or OTP with anyone.</li>
                    </ul>
                    <button onClick={() => setActiveModal(null)} style={{...styles.primaryBtn, width:'100%', marginTop:'20px'}}>I AGREE</button>
                </div>
            </ModalWrapper>
        )}

      </AnimatePresence>
      <BottomNav />
    </div>
  );
}

// --- HELPERS ---

const MenuItem = ({ icon, label, onClick, rightIcon, subLabel, isLogout }) => (
    <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={onClick} 
        style={{
            background: isLogout ? 'rgba(255, 59, 48, 0.05)' : '#161616',
            padding: '16px', borderRadius: '16px', marginBottom: '10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', border: isLogout ? '1px solid rgba(255, 59, 48, 0.2)' : '1px solid #262626'
        }}
    >
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
            <div style={{background: isLogout ? 'rgba(255,59,48,0.1)' : '#222', padding:'10px', borderRadius:'12px'}}>
                {icon}
            </div>
            <div>
                <span style={{color: isLogout ? '#FF3B30' : 'white', fontSize:'15px', fontWeight:'600', display:'block'}}>{label}</span>
                {subLabel && <span style={{color:'#666', fontSize:'11px', display:'block', marginTop:'2px'}}>{subLabel}</span>}
            </div>
        </div>
        {rightIcon || <ChevronRight size={18} color="#444" />}
    </motion.div>
);

const RateRow = ({name, rate}) => (
    <div style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px dashed #333', fontSize:'13px', color:'#ddd'}}>
        <span>{name}</span>
        <span className="gold-text" style={{fontWeight:'bold'}}>{rate}</span>
    </div>
);

const ModalWrapper = ({ children, onClose }) => (
    <div style={{ position: 'fixed', inset:0, background: 'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
        <motion.div 
            initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}}
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#161616', width: '85%', maxWidth: '340px', borderRadius: '24px', padding: '30px', border: '1px solid #333', boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}
        >
            {children}
        </motion.div>
    </div>
);

const styles = {
    primaryBtn: { flex:1, background: '#FFD700', color: 'black', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize:'14px' },
    secondaryBtn: { flex:1, background: '#222', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize:'14px' }
};

export default ProfilePage;