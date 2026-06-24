import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Bell, CheckCircle, Info, Trophy, XCircle, 
  Wallet, Clock, CheckCheck, Trash2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../services/db';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
      // Haptic feedback
      if(navigator.vibrate) navigator.vibrate(50);
      try {
          const data = await getNotifications(user.id);
          setNotifs(data);
      } catch (e) {
          console.error("Notif Error", e);
      }
    }
    setLoading(false);
  };

  // --- HELPERS ---

  // 1. Smart Icon & Color Helper
  const getNotifStyle = (type) => {
      switch(type) {
          case 'success': // Deposit success, etc.
              return { icon: <CheckCircle size={18} color="#34C759" />, color: '#34C759', bg: 'rgba(52, 199, 89, 0.1)' };
          case 'error': // Loss, failed transaction
              return { icon: <XCircle size={18} color="#FF3B30" />, color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)' };
          case 'result': // Win!
              return { icon: <Trophy size={18} color="#FFD700" />, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.1)' };
          case 'wallet': // General money
              return { icon: <Wallet size={18} color="#3B82F6" />, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
          default: // Info
              return { icon: <Info size={18} color="#888" />, color: '#888', bg: 'rgba(255, 255, 255, 0.05)' };
      }
  };

  // 2. Relative Time Formatter (e.g., "2 hours ago")
  const getRelativeTime = (timestamp) => {
      if(!timestamp) return "";
      const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return 'Just Now';
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', paddingBottom: '20px' }}>
      
      {/* --- STICKY HEADER --- */}
      <div style={{ 
        padding: '15px 20px', background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        borderBottom: '1px solid #222', position:'sticky', top:0, zIndex:50 
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div onClick={() => navigate('/')} style={{padding:'8px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
                <ArrowLeft color="white" size={20} />
            </div>
            <h2 className="gold-text" style={{ fontSize: '18px', margin: 0, letterSpacing:'1px', fontWeight:'900' }}>NOTIFICATIONS</h2>
        </div>
        
        {/* Optional: "Mark All Read" visual button */}
        <div style={{padding:'8px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
            <CheckCheck size={18} color="#666" />
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div style={{ padding: '20px' }}>
        
        {/* SKELETON LOADING */}
        {loading && (
            <div>
                {[1,2,3,4].map(i => (
                    <div key={i} style={{background:'#161616', padding:'15px', borderRadius:'16px', marginBottom:'12px', border:'1px solid #222', display:'flex', gap:'15px'}}>
                        <div style={{width:40, height:40, background:'#222', borderRadius:'50%'}} className="pulse"></div>
                        <div style={{flex:1}}>
                            <div style={{width:'60%', height:12, background:'#222', borderRadius:4, marginBottom:8}} className="pulse"></div>
                            <div style={{width:'90%', height:10, background:'#222', borderRadius:4}} className="pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* EMPTY STATE */}
        {!loading && notifs.length === 0 && (
            <motion.div 
                initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}}
                style={{textAlign:'center', marginTop:'80px', padding:'40px'}}
            >
                <div style={{width:80, height:80, background:'#161616', borderRadius:'50%', margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #222'}}>
                    <Bell size={35} color="#333" />
                </div>
                <h3 style={{fontSize:'18px', color:'#eee', margin:'0 0 5px 0'}}>All Caught Up!</h3>
                <p style={{fontSize:'13px', color:'#666', margin:0}}>You have no new notifications.</p>
            </motion.div>
        )}

        {/* NOTIFICATION LIST */}
        <AnimatePresence>
            {notifs.map((item, index) => {
                const style = getNotifStyle(item.type);
                return (
                    <motion.div 
                        key={item.id}
                        initial={{opacity:0, y:20}} 
                        animate={{opacity:1, y:0}} 
                        transition={{delay: index * 0.05}}
                        style={{
                            background: '#161616', padding: '15px', borderRadius: '16px', marginBottom: '12px',
                            border: '1px solid #2a2a2a', position: 'relative', overflow: 'hidden'
                        }}
                    >
                        {/* Left Glow Strip */}
                        <div style={{position:'absolute', left:0, top:0, bottom:0, width:4, background: style.color}}></div>

                        <div style={{display:'flex', gap:'15px', alignItems:'flex-start'}}>
                            {/* Icon Box */}
                            <div style={{
                                minWidth:'40px', height:'40px', borderRadius:'50%', 
                                background: style.bg, display:'flex', alignItems:'center', justifyContent:'center',
                                marginTop:'2px'
                            }}>
                                {style.icon}
                            </div>

                            {/* Text Content */}
                            <div style={{flex:1}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px'}}>
                                    <h3 style={{margin:0, fontSize:'15px', fontWeight:'bold', color:'white', lineHeight:'1.2'}}>{item.title}</h3>
                                    <span style={{fontSize:'10px', color:'#666', fontWeight:'600', whiteSpace:'nowrap', marginLeft:'10px'}}>
                                        {getRelativeTime(item.date)}
                                    </span>
                                </div>
                                <p style={{margin:0, fontSize:'13px', color:'#aaa', lineHeight:'1.5'}}>{item.body}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </AnimatePresence>
      </div>

      {/* Animation Style */}
      <style>{`
        .pulse { animation: pulse 1.5s infinite ease-in-out; }
        @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 0.7; } 100% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

export default NotificationsPage;