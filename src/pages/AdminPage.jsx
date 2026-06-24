import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, RefreshCw, Edit3, Check, X, AlertTriangle, 
  Lock, Unlock, Search, Trash2, Plus, Bell, Key, Shield, 
  Hash, Ghost, Skull, Menu, Home, Users, Settings, Banknote, 
  Power, ChevronRight, Sparkles, TrendingUp, AlertOctagon, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
// Make sure these functions are exported from your db.js
import { 
  getPendingRequests, approveRequest, rejectRequest, listenToMarkets, 
  declareResultAndPay, createMarket, deleteMarket, getAllUsers, 
  updateUserBalance, toggleUserBlock, getAppConfig, updateAppConfig, 
  sendNotification, activateMarket, revertMarketResult, getMarketAnalysis,
  setMaintenanceMode, getMaintenanceStatus, checkAdminStatus
} from '../services/db';
import { getSortedMarkets } from '../utils/timeUtils'; 

// --- HELPER: GENERATE ALL VALID PANNAS FOR SUGGESTIONS ---
const generateAllPannas = () => {
  const pannas = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = i; j <= 9; j++) { 
      for (let k = j; k <= 9; k++) {
        pannas.push(`${i}${j}${k}`);
      }
    }
  }
  return pannas; 
};

const ALL_PANNAS = generateAllPannas();

function AdminPage() {
  const navigate = useNavigate();
  
  // --- 🔒 ADMIN AUTH STATE ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');

  // --- DASHBOARD STATES ---
  const [activeTab, setActiveTab] = useState('markets'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [requests, setRequests] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [allUsers, setAllUsers] = useState([]); 
  const [config, setConfig] = useState({ upiId: '', notice: '', whatsapp: '', tranzApiKey: '', tranzBaseUrl: '' });
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Custom Time Picker States
  const [newName, setNewName] = useState('');
  const [category, setCategory] = useState('main');
  const [openH, setOpenH] = useState('10');
  const [openM, setOpenM] = useState('00');
  const [openP, setOpenP] = useState('AM');
  const [closeH, setCloseH] = useState('05');
  const [closeM, setCloseM] = useState('00');
  const [closeP, setCloseP] = useState('PM');
  
  // Notification & Search
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [modalType, setModalType] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Analysis Data
  const [analysisData, setAnalysisData] = useState(null);
  const [openResultForCloseCalc, setOpenResultForCloseCalc] = useState(''); // Store Open Digit for Close Calc

  // Result Inputs & Logic
  const [pannaInput, setPannaInput] = useState('');
  const [digitInput, setDigitInput] = useState('');
  const [suggestions, setSuggestions] = useState([]); 
  const [inputValue, setInputValue] = useState(''); 
  const [sessionValue, setSessionValue] = useState('Open'); 
  const [msg, setMsg] = useState(''); 

  // --- STATES FOR ADMIN AUTH ---
  const [adminPhone, setAdminPhone] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminAuthStep, setAdminAuthStep] = useState('phone'); // 'phone' | 'otp'
  const [adminLoading, setAdminLoading] = useState(false);

  // Check if already logged in as admin on mount
  useEffect(() => {
    const checkExistingAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isAdmin = await checkAdminStatus();
        if (isAdmin) {
          setIsAdminLoggedIn(true);
        }
      }
    };
    checkExistingAdmin();
  }, []);

  // --- HANDLERS ---
  const handleAdminSendOtp = async () => {
    if (!adminPhone || adminPhone.length !== 10) {
      return showToast('error', 'Enter valid 10-digit number');
    }
    setAdminLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+91' + adminPhone,
      });
      if (error) throw error;
      setAdminAuthStep('otp');
      showToast('success', 'OTP Sent!');
    } catch (e) {
      showToast('error', e.message || 'Failed to send OTP');
    }
    setAdminLoading(false);
  };

  const handleAdminVerifyOtp = async () => {
    if (adminOtp.length !== 6) return showToast('error', 'Enter 6-digit OTP');
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: '+91' + adminPhone,
        token: adminOtp,
        type: 'sms',
      });
      if (error) throw error;

      // Check admin role in database
      const isAdmin = await checkAdminStatus();
      if (isAdmin) {
        setIsAdminLoggedIn(true);
        showToast('success', 'Welcome back, Boss!');
      } else {
        showToast('error', 'Access Denied. Not an admin.');
        await supabase.auth.signOut();
      }
    } catch (e) {
      showToast('error', e.message || 'Verification failed');
    }
    setAdminLoading(false);
  };

  const get24HrFormat = (h, m, ampm) => {
      let hour = parseInt(h);
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${m}`;
  };

  // --- LOAD DATA ---
  useEffect(() => {
    if(isAdminLoggedIn) {
        loadRequests();
        loadConfig();
        checkMaintenanceStatus();
        if(activeTab === 'users') loadUsers();
        const unsubscribe = listenToMarkets((data) => {
          setMarkets(getSortedMarkets(data));
        });
        return () => unsubscribe();
    }
  }, [activeTab, isAdminLoggedIn]);

  // --- SMART FILTER LOGIC (Panna) ---
  useEffect(() => {
    if (modalType === 'result' && pannaInput.length > 0 && pannaInput.length < 3) {
        const filtered = ALL_PANNAS.filter(p => p.startsWith(pannaInput)).slice(0, 8);
        setSuggestions(filtered);
    } else {
        setSuggestions([]);
    }
  }, [pannaInput, modalType]);

  const loadRequests = async () => setRequests(await getPendingRequests());
  const loadUsers = async () => setAllUsers(await getAllUsers());
  const loadConfig = async () => setConfig(await getAppConfig());
  const checkMaintenanceStatus = async () => setIsMaintenance(await getMaintenanceStatus());

  const handleCreateMarket = async () => {
      if(!newName) return showToast('error', "Name Required!");
      try {
          const openTime24 = get24HrFormat(openH, openM, openP);
          const closeTime24 = get24HrFormat(closeH, closeM, closeP);
          await createMarket({
              name: newName.toUpperCase(),
              openTime24, closeTime24,
              openTime: `${openH}:${openM} ${openP}`,
              closeTime: `${closeH}:${closeM} ${closeP}`,
              category: category, active: false
          });
          setNewName('');
          showToast('success', "Market Created!");
      } catch(e) { showToast('error', e); }
  };

  // --- 🛠 CUSTOM CONFIRM HANDLERS ---
  
  const initiateToggleActive = (market) => {
      setSelectedItem(market);
      setModalType('confirm_toggle');
  };

  const initiateDeleteMarket = (id) => {
      setSelectedItem({ id });
      setModalType('confirm_delete');
  };
  
  const initiateRevert = (market) => {
      setSelectedItem(market);
      setModalType('revert_select');
  };

  const initiateAnalysis = (market) => {
      setSelectedItem(market);
      setSessionValue('Open');
      setOpenResultForCloseCalc(''); // Reset

      // Auto-fill Open Digit if result exists (e.g. "123-6...")
      if(market.result && market.result !== "***-**-***") {
        const parts = market.result.split('-');
        // Check if open digit exists (parts[1] first char)
        if(parts[1] && parts[1] !== '**' && parts[1].length >= 1) {
            setOpenResultForCloseCalc(parts[1].charAt(0));
        }
      }

      setModalType('analysis_load'); 
      fetchAnalysis(market.name, 'Open');
  };

  // --- LOGIC FUNCTIONS ---

  const handleAnalyzeClick = (session) => {
    setSessionValue(session);
    setModalType('analysis_load');
    // If Close session, pass the open digit for Jodi calc
    fetchAnalysis(selectedItem.name, session, openResultForCloseCalc);
  };

  const fetchAnalysis = async (marketName, session, openResult = null) => {
      try {
          const data = await getMarketAnalysis(marketName, session, openResult);
          setAnalysisData(data);
          setModalType('analysis_view');
      } catch (e) {
          showToast('error', "Analysis Failed");
          setModalType(null);
      }
  };

  const handleExecuteToggle = async () => {
      setModalType(null);
      const m = selectedItem;
      try {
          if (m.active) {
               await activateMarket(m.id, m.name, m.result, false); 
               showToast('success', "Market Deactivated");
          } else {
               await activateMarket(m.id, m.name, m.result, true);
               showToast('success', "New Day Started!");
          }
      } catch(e) { showToast('error', "Action Failed"); }
  };

  const handleExecuteRevert = async (session) => {
      setModalType(null);
      try {
          await revertMarketResult(selectedItem.name, session);
          showToast('success', `Result Reverted for ${session}`);
      } catch(e) { showToast('error', e.message || "Revert Failed"); }
  };

  const handleExecuteMaintenance = async () => {
      setModalType(null);
      const newStatus = !isMaintenance;
      try {
          await setMaintenanceMode(newStatus);
          setIsMaintenance(newStatus);
          showToast('success', newStatus ? "App Locked 🔒" : "App Unlocked 🔓");
      } catch(e) { showToast('error', "Failed"); }
  };

  const openResultModal = (market) => { 
      setSelectedItem(market); 
      setPannaInput(''); 
      setDigitInput('');
      setSessionValue('Open'); 
      setModalType('result'); 
  };

  const handleExecuteResult = async () => { 
      if(!pannaInput || pannaInput.length !== 3) return showToast('error', "Invalid Panna");
      if(!digitInput || digitInput.length !== 1) return showToast('error', "Invalid Ank");

      const finalResultString = `${pannaInput}-${digitInput}`;
      setModalType(null); 
      try { 
          await declareResultAndPay(selectedItem.name, finalResultString, sessionValue); 
          await sendNotification('ALL', `📢 ${selectedItem.name} Result`, `${sessionValue}: ${finalResultString}`, 'result');
          showToast('success', "Result Published & Paid!"); 
      } catch(e) { showToast('error', e); } 
  };

  // Quick Action Wrappers
  const wrapAction = async (action, successMsg) => {
      setModalType(null);
      try { await action(); showToast('success', successMsg); } catch(e) { showToast('error', e.message || e); }
  };

  const handleExecuteApprove = () => wrapAction(async () => {
      await approveRequest(selectedItem.id, selectedItem.userId, selectedItem.amount, selectedItem.type);
      await sendNotification(selectedItem.userId, 'Approved ✅', 'Your transaction was successful.', 'success');
      loadRequests();
  }, "Approved!");

  const handleExecuteReject = () => wrapAction(async () => {
      await rejectRequest(selectedItem.id, selectedItem.userId, selectedItem.amount, selectedItem.type);
      await sendNotification(selectedItem.userId, 'Rejected ❌', 'Transaction rejected/refunded.', 'error');
      loadRequests();
  }, "Rejected!");

  const handleExecuteBalance = () => wrapAction(async () => { await updateUserBalance(selectedItem.id, inputValue); loadUsers(); }, "Updated!");
  const handleExecuteBlock = () => wrapAction(async () => { await toggleUserBlock(selectedItem.id, selectedItem.isBlocked); loadUsers(); }, "Status Changed!");
  const handleSaveConfig = () => wrapAction(async () => { await updateAppConfig(config); }, "Settings Saved!");
  const handleSendNotification = () => wrapAction(async () => { await sendNotification('ALL', notifTitle, notifBody, 'info'); setNotifTitle(''); setNotifBody(''); }, "Sent!");
  const handleExecuteDeleteMarket = () => wrapAction(async () => await deleteMarket(selectedItem.id), "Market Deleted");

  const showToast = (type, message) => { setModalType(type); setMsg(message); setTimeout(() => setModalType(null), 2500); };

  // --- MENU ---
  const menuItems = [
      { id: 'markets', label: 'Markets', icon: <Home size={18}/> },
      { id: 'requests', label: 'Requests', icon: <Banknote size={18}/> },
      { id: 'users', label: 'Users', icon: <Users size={18}/> },
      { id: 'settings', label: 'Settings', icon: <Settings size={18}/> },
  ];

  const TimeSelect = ({ val, set, options }) => ( <select value={val} onChange={e => set(e.target.value)} style={styles.select}> {options.map(o => <option key={o} value={o}>{o}</option>)} </select> );

  // --- 🔒 LOGIN UI ---
  if (!isAdminLoggedIn) {
      return (
          <div style={styles.loginContainer}>
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} style={styles.loginCard}>
                  <div style={styles.logoWrapper}><Shield size={40} color="#FFD700" /></div>
                  <h2 style={{color: 'white', margin: '15px 0', letterSpacing:'2px'}}>ADMIN PANEL</h2>
                  
                  {adminAuthStep === 'phone' ? (
                    <>
                      <input type="tel" value={adminPhone} onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if(val.length <= 10) setAdminPhone(val);
                      }} style={styles.input} placeholder="Admin Phone Number" inputMode="numeric" />
                      <button onClick={handleAdminSendOtp} disabled={adminLoading} style={styles.loginBtn}>
                        {adminLoading ? 'SENDING...' : 'SEND OTP'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{color:'#888', fontSize:'12px', margin:'0 0 15px 0'}}>OTP sent to +91 {adminPhone}</p>
                      <input type="tel" value={adminOtp} onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if(val.length <= 6) setAdminOtp(val);
                      }} style={{...styles.input, letterSpacing:'6px', textAlign:'center', fontSize:'20px'}} placeholder="• • • • • •" inputMode="numeric" autoFocus />
                      <button onClick={handleAdminVerifyOtp} disabled={adminLoading} style={styles.loginBtn}>
                        {adminLoading ? 'VERIFYING...' : 'VERIFY & LOGIN'}
                      </button>
                      <button onClick={() => { setAdminAuthStep('phone'); setAdminOtp(''); }} style={styles.linkBtn}>Change Number</button>
                    </>
                  )}
                  
                  <button onClick={() => navigate('/')} style={styles.linkBtn}>Back to App</button>
              </motion.div>
              <ToastNotification type={modalType} msg={msg} />
          </div>
      );
  }

  // --- 🔓 DASHBOARD UI ---
  return (
    <div style={styles.container}>
      
      {/* 🚀 CSS FOR RESPONSIVENESS */}
      <style>{`
        @media (max-width: 768px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
          .responsive-row { flex-direction: column !important; gap: 10px !important; }
          .responsive-modal { width: 90% !important; padding: 25px !important; }
          .content-area { padding: 15px !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* SIDEBAR OVERLAY */}
      <AnimatePresence>
        {isMenuOpen && <motion.div key="menu-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsMenuOpen(false)} style={styles.menuOverlay}/>}
        {isMenuOpen && (
                <motion.div key="sidebar" initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'tween', ease:'circOut', duration:0.3}} style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <h2 style={{margin:0, color:'#FFD700', letterSpacing:'1px', display:'flex', alignItems:'center', gap:'10px'}}><Shield size={20}/> ADMIN</h2>
                        <button onClick={() => setIsMenuOpen(false)} style={styles.iconBtn}><X size={20} color="#888"/></button>
                    </div>
                    <div style={styles.menuList}>
                        {menuItems.map(item => (
                            <div key={item.id} onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                                style={{...styles.menuItem, background: activeTab === item.id ? 'rgba(255, 215, 0, 0.1)' : 'transparent', color: activeTab === item.id ? '#FFD700' : '#888', borderLeft: activeTab === item.id ? '3px solid #FFD700' : '3px solid transparent'}}>
                                {item.icon} {item.label}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setIsAdminLoggedIn(false)} style={styles.logoutBtn}>LOGOUT</button>
                </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER */}
      <div style={styles.header}>
         <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
            <button onClick={() => setIsMenuOpen(true)} style={styles.iconBtn}><Menu size={22} color="#FFD700"/></button>
            <h2 style={{margin:0, fontSize:'18px', color:'white', fontWeight:'bold', letterSpacing:'0.5px'}}>{activeTab.toUpperCase()}</h2>
         </div>
         <button onClick={() => {loadRequests(); loadUsers();}} style={styles.iconBtn}><RefreshCw size={20} color="#34C759"/></button>
      </div>

      <div style={styles.contentArea} className="content-area">
          
          {/* TAB: MARKETS */}
          {activeTab === 'markets' && (
             <div style={styles.grid} className="responsive-grid">
                 {markets.map(m => (
                    <motion.div key={m.id} layout initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} style={{...styles.card, borderLeft: m.active ? '4px solid #84cc16' : '4px solid #333'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
                            <div>
                                <h3 style={{margin:0, color:'white', fontSize:'16px', fontWeight:'bold'}}>{m.name}</h3>
                                <span style={{fontSize:'10px', color:'#888', textTransform:'uppercase'}}>{m.category}</span>
                            </div>
                            {/* POWER TOGGLE */}
                            <button onClick={() => initiateToggleActive(m)}
                                style={{
                                    padding:'8px', borderRadius:'50%', border:'none', cursor:'pointer',
                                    background: m.active ? '#84cc16' : '#222', 
                                    boxShadow: m.active ? '0 0 15px rgba(132, 204, 22, 0.4)' : 'none',
                                    transition: '0.3s'
                                }}
                            >
                                <Power size={18} color={m.active ? 'black' : '#666'} />
                            </button>
                        </div>
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111', padding:'8px', borderRadius:'8px', marginBottom:'15px'}}>
                            <div style={styles.badgeTime}>O: {m.openTime}</div>
                            <div style={styles.badgeTime}>C: {m.closeTime}</div>
                        </div>
                        
                        <div style={styles.resultBox}>
                            {m.result === "***-**-***" ? <span style={{opacity:0.3, letterSpacing:'3px'}}>***-**-***</span> : m.result}
                        </div>

                        <div style={{display:'flex', gap:'8px', marginTop:'15px'}}>
                            {/* 💡 Analyze Button */}
                            <button onClick={() => initiateAnalysis(m)} style={{...styles.iconBtnSmall, border:'1px solid #FFD700'}}>
                                <Sparkles size={16} color="#FFD700"/>
                            </button>
                            
                            {/* Declare Result */}
                            <button onClick={() => openResultModal(m)} style={styles.primaryBtnSmall}><Edit3 size={14}/> RESULT</button>
                            
                            {/* ⚠️ Revert Button */}
                            <button onClick={() => initiateRevert(m)} style={{...styles.iconBtnSmall, border:'1px solid #FF3B30'}}>
                                <RotateCcw size={16} color="#FF3B30"/>
                            </button>

                            {/* Delete */}
                            <button onClick={() => initiateDeleteMarket(m.id)} style={styles.dangerBtnIcon}><Trash2 size={16}/></button>
                        </div>
                    </motion.div>
                 ))}
                 <motion.div onClick={() => setActiveTab('settings')} style={{...styles.card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'2px dashed #333', cursor:'pointer', minHeight:'180px'}}>
                     <Plus size={30} color="#444"/>
                     <p style={{color:'#666', fontSize:'12px', marginTop:'10px'}}>ADD NEW MARKET</p>
                 </motion.div>
             </div>
          )}

          {/* TAB: REQUESTS */}
          {activeTab === 'requests' && (
              <div style={styles.listContainer}>
                  {requests.length === 0 && <div style={{textAlign:'center', color:'#666', padding:'40px'}}><Check size={40} style={{marginBottom:'10px', opacity:0.5}}/><p>All caught up!</p></div>}
                  {requests.map(req => ( 
                      <div key={req.id} style={{...styles.listRow, borderLeft: req.type==='deposit' ? '4px solid #34C759' : '4px solid #FF3B30'}}>
                          <div style={{flex:1}}>
                              <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                                <h3 style={{margin:0, color:'white', fontSize:'18px'}}>₹ {req.amount}</h3>
                                <span style={{...styles.pill, background: req.type==='deposit'?'rgba(52,199,89,0.1)':'rgba(255,59,48,0.1)', color: req.type==='deposit'?'#34C759':'#FF3B30'}}>{req.type}</span>
                              </div>
                              <p style={{color:'#888', fontSize:'12px', marginTop:'4px'}}>User: <span style={{color:'#ccc'}}>{req.userPhone}</span></p>
                              {req.type === 'withdraw' && <div style={styles.upiBox}>UPI: {req.details}</div>}
                          </div>
                          <div style={{display:'flex', flexDirection:'column', gap:'8px', minWidth:'80px'}}>
                              <button onClick={() => {setSelectedItem(req); setModalType('confirm_approve');}} style={styles.approveBtn}>APPROVE</button>
                              <button onClick={() => {setSelectedItem(req); setModalType('confirm_reject');}} style={styles.rejectBtn}>REJECT</button>
                          </div>
                      </div> 
                  ))}
              </div>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
              <>
                <div style={styles.searchBar}>
                    <Search size={18} color="#666" />
                    <input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
                <div style={styles.listContainer}>
                    {allUsers.filter(u => (u.phone && u.phone.includes(searchTerm)) || (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(user => (
                        <div key={user.id} style={{...styles.listRow, opacity: user.isBlocked ? 0.6 : 1}}>
                            <div>
                                <h3 style={{margin:0, color: user.isBlocked ? '#FF3B30' : 'white', fontSize:'15px', textDecoration: user.isBlocked?'line-through':'none'}}>
                                    {user.name ? `${user.name} (${user.phone})` : user.phone}
                                </h3>
                                <p style={{margin:'4px 0', fontSize:'12px', color:'#888'}}>Wallet: <span style={{color:'#FFD700'}}>₹{user.balance}</span></p>
                            </div>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button onClick={() => {setSelectedItem(user); setInputValue(user.balance); setModalType('balance');}} style={styles.iconBtnSmall}><Edit3 size={16}/></button>
                                <button onClick={() => {setSelectedItem(user); setModalType('confirm_block');}} style={{...styles.iconBtnSmall, color: user.isBlocked ? '#34C759' : '#FF3B30'}}>
                                    {user.isBlocked ? <Unlock size={16}/> : <Lock size={16}/>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
              </>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
             <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                {/* 🔒 MAINTENANCE MODE */}
                <div style={styles.card}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <SectionHeader icon={<AlertOctagon size={16}/>} title="MAINTENANCE MODE" />
                        <button onClick={() => setModalType('confirm_maintenance')} style={{background: isMaintenance ? '#FF3B30' : '#222', border:'none', padding:'8px 15px', borderRadius:'20px', color:'#fff', fontWeight:'bold', cursor:'pointer'}}>
                            {isMaintenance ? "APP LOCKED" : "APP LIVE"}
                        </button>
                    </div>
                    <p style={{fontSize:'12px', color:'#666'}}>Use this to shut down app temporarily.</p>
                </div>

                <div style={styles.card}>
                    <SectionHeader icon={<Bell size={16}/>} title="Broadcast Notification" />
                    <input style={styles.input} value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Title" />
                    <textarea style={{...styles.input, height:'80px'}} value={notifBody} onChange={e => setNotifBody(e.target.value)} placeholder="Message..." />
                    <button onClick={handleSendNotification} style={styles.primaryBtn}>SEND BROADCAST</button>
                </div>

                <div style={styles.card}>
                    <SectionHeader icon={<Shield size={16}/>} title="App Configuration" />
                    <input style={styles.input} value={config.notice} onChange={e => setConfig({...config, notice: e.target.value})} placeholder="Scrolling Notice..." />
                    <input style={styles.input} value={config.upiId} onChange={e => setConfig({...config, upiId: e.target.value})} placeholder="Admin UPI ID" />
                    <button onClick={handleSaveConfig} style={{...styles.primaryBtn, marginTop:'15px'}}>SAVE CONFIG</button>
                </div>

                <div style={styles.card}>
                    <SectionHeader icon={<Plus size={16}/>} title="Create New Market" />
                    <input style={styles.input} placeholder="Market Name (e.g. KALYAN)" value={newName} onChange={e => setNewName(e.target.value)} />
                    
                    <div style={styles.row} className="responsive-row">
                        <div style={{flex:1}}>
                            <label style={styles.label}>OPEN TIME</label>
                            <div style={styles.timeGroup}>
                                <TimeSelect val={openH} set={setOpenH} options={['01','02','03','04','05','06','07','08','09','10','11','12']} />
                                <TimeSelect val={openM} set={setOpenM} options={['00','05','10','15','20','25','30','35','40','45','50','55']} />
                                <TimeSelect val={openP} set={setOpenP} options={['AM','PM']} />
                            </div>
                        </div>
                        <div style={{flex:1}}>
                            <label style={styles.label}>CLOSE TIME</label>
                            <div style={styles.timeGroup}>
                                <TimeSelect val={closeH} set={setCloseH} options={['01','02','03','04','05','06','07','08','09','10','11','12']} />
                                <TimeSelect val={closeM} set={setCloseM} options={['00','05','10','15','20','25','30','35','40','45','50','55']} />
                                <TimeSelect val={closeP} set={setCloseP} options={['AM','PM']} />
                            </div>
                        </div>
                    </div>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{...styles.select, width:'100%', marginTop:'10px'}}>
                        <option value="main">Main Market (Daily)</option>
                        <option value="starline">Starline (Hourly)</option>
                    </select>
                    <button onClick={handleCreateMarket} style={styles.primaryBtn}>CREATE MARKET</button>
                </div>
             </div>
          )}
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {modalType && (
             <motion.div key="admin-modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={styles.modalOverlay}>
                 <motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}} style={styles.modalContent} className="responsive-modal">
                     
                     {/* 🧠 RESULT DECLARATION MODAL (With Smart Filter) */}
                     {modalType === 'result' && (
                         <>
                            <div style={styles.modalIcon}><Hash size={24} color="#000"/></div>
                            <h3 style={styles.modalTitle}>DECLARE RESULT</h3>
                            <p style={styles.modalSub}>{selectedItem?.name}</p>
                            
                            <div style={styles.toggleGroup}>
                                <button onClick={() => setSessionValue('Open')} style={sessionValue === 'Open' ? styles.toggleActive : styles.toggleInactive}>OPEN</button>
                                <button onClick={() => setSessionValue('Close')} style={sessionValue === 'Close' ? styles.toggleActive : styles.toggleInactive}>CLOSE</button>
                            </div>

                            <div style={styles.resultInputGroup}>
                                <div style={{flex:1.5}}>
                                    <label style={styles.labelCenter}>PANNA</label>
                                    <input 
                                        type="number" 
                                        maxLength={3} 
                                        autoFocus 
                                        placeholder="123" 
                                        value={pannaInput} 
                                        onChange={e => {if(e.target.value.length <= 3) setPannaInput(e.target.value)}} 
                                        style={styles.largeInput} 
                                    />
                                    {/* 🔥 Smart Suggestions */}
                                    {suggestions.length > 0 && (
                                        <div style={{display:'flex', gap:'5px', overflowX:'auto', marginTop:'10px', paddingBottom:'5px'}} className="no-scrollbar">
                                            {suggestions.map((s, idx) => (
                                                <div key={`sug-${idx}`} onClick={() => setPannaInput(s)} style={{background:'#333', padding:'5px 10px', borderRadius:'5px', fontSize:'12px', cursor:'pointer', border:'1px solid #444', color:'#ddd'}}>
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span style={{color:'#666', fontSize:'24px', paddingBottom:'15px'}}>-</span>
                                <div style={{flex:1}}>
                                    <label style={styles.labelCenter}>ANK</label>
                                    <input type="number" maxLength={1} placeholder="4" value={digitInput} onChange={e => {if(e.target.value.length <= 1) setDigitInput(e.target.value)}} style={{...styles.largeInput, color:'#FFD700', borderColor:'#FFD700'}} />
                                </div>
                            </div>
                            
                            <div style={styles.btnGroup}>
                                <button onClick={() => setModalType(null)} style={styles.cancelBtn}>CANCEL</button>
                                <button onClick={handleExecuteResult} style={styles.confirmBtn}>PUBLISH</button>
                            </div>
                         </>
                     )}

                     {/* 🪄 ADVANCED ANALYSIS MODAL (PROFIT PREDICTOR) */}
                     {modalType === 'analysis_load' && (
                         <div style={{padding:'20px'}}>
                             <RefreshCw size={30} className="spin" color="#FFD700" />
                             <p style={{color:'#888', marginTop:'15px'}}>Crunching Data...</p>
                         </div>
                     )}

                     {modalType === 'analysis_view' && analysisData && (
                         <div className="no-scrollbar" style={{maxHeight:'80vh', overflowY:'auto'}}>
                             
                             {/* HEADER & TOGGLE */}
                             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                                <div>
                                    <h3 style={{color:'white', margin:0}}>📊 Market Matrix</h3>
                                    <p style={{color:'#666', fontSize:'10px'}}>{selectedItem.name}</p>
                                </div>
                                <div style={{display:'flex', background:'#333', borderRadius:'6px', padding:'2px'}}>
                                    <button onClick={() => handleAnalyzeClick('Open')} 
                                        style={{padding:'6px 12px', background: sessionValue==='Open'?'#FFD700':'transparent', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold', color: sessionValue==='Open'?'black':'#888'}}>
                                        OPEN
                                    </button>
                                    <button onClick={() => handleAnalyzeClick('Close')} 
                                        style={{padding:'6px 12px', background: sessionValue==='Close'?'#FFD700':'transparent', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold', color: sessionValue==='Close'?'black':'#888'}}>
                                        CLOSE
                                    </button>
                                </div>
                             </div>

                             {/* JODI INPUT FOR CLOSE SESSION */}
                             {sessionValue === 'Close' && (
                                 <div style={{background:'#220000', padding:'10px', borderRadius:'8px', marginBottom:'15px', border:'1px solid #550000'}}>
                                     <label style={{color:'#FF3B30', fontSize:'10px', fontWeight:'bold'}}>OPEN DIGIT (FOR JODI CALC)</label>
                                     <div style={{display:'flex', gap:'10px', marginTop:'5px'}}>
                                         <input 
                                            type="number" 
                                            value={openResultForCloseCalc} 
                                            onChange={e => setOpenResultForCloseCalc(e.target.value)}
                                            placeholder="e.g 5"
                                            style={{background:'black', border:'1px solid #444', color:'white', width:'50px', padding:'5px', textAlign:'center', borderRadius:'4px'}}
                                         />
                                         <button onClick={() => handleAnalyzeClick('Close')} style={{background:'#FF3B30', color:'white', border:'none', borderRadius:'4px', padding:'0 10px', fontSize:'10px'}}>RE-CALCULATE</button>
                                     </div>
                                     <p style={{fontSize:'9px', color:'#aaa', marginTop:'4px'}}>Enter the Open Digit to calculate exact Jodi liability.</p>
                                 </div>
                             )}

                             {/* SUMMARY METRICS */}
                             <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px'}}>
                                 <div style={{background:'#1a1a1a', padding:'15px', borderRadius:'10px', border:'1px solid #333'}}>
                                     <small style={{color:'#888', fontSize:'10px', textTransform:'uppercase'}}>Total Collection</small>
                                     <div style={{color:'#34C759', fontWeight:'bold', fontSize:'18px'}}>₹{analysisData.summary.totalCollection}</div>
                                 </div>
                                 <div style={{background:'#1a1a1a', padding:'15px', borderRadius:'10px', border:'1px solid #333'}}>
                                     <small style={{color:'#888', fontSize:'10px', textTransform:'uppercase'}}>Max Profit Est.</small>
                                     <div style={{color:'#FFD700', fontWeight:'bold', fontSize:'18px'}}>
                                        ₹{analysisData.recommendation[0]?.profit || 0}
                                     </div>
                                 </div>
                             </div>

                             {/* 🏆 RECOMMENDATION TABLE (SP/DP/TP AWARE) */}
                             <h4 style={{color:'#fff', fontSize:'12px', margin:'0 0 10px 0', display:'flex', alignItems:'center', gap:'5px'}}>
                                 <Sparkles size={12} color="#FFD700"/> PROFITABLE RESULTS
                             </h4>
                             
                             <div style={{overflowX:'auto'}}>
                                 <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px', whiteSpace:'nowrap'}}>
                                     <thead>
                                         <tr style={{background:'#222', color:'#888'}}>
                                             <th style={{padding:'8px', textAlign:'left'}}>PANNA</th>
                                             <th style={{padding:'8px', textAlign:'center'}}>TYPE</th>
                                             <th style={{padding:'8px', textAlign:'center'}}>ANK</th>
                                             {sessionValue === 'Close' && <th style={{padding:'8px', textAlign:'center'}}>JODI</th>}
                                             <th style={{padding:'8px', textAlign:'right'}}>PAYOUT</th>
                                             <th style={{padding:'8px', textAlign:'right'}}>PROFIT</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {analysisData.recommendation.slice(0, 20).map((row, idx) => (
                                             <tr key={idx} style={{
                                                 borderBottom:'1px solid #222', 
                                                 background: idx === 0 ? 'rgba(52, 199, 89, 0.15)' : 'transparent'
                                             }}>
                                                 <td style={{padding:'8px', color:'#FFD700', fontWeight:'bold'}}>
                                                    {row.panna} 
                                                    {row.pannaLoad > 0 && <span style={{fontSize:'9px', color:'#FF3B30', display:'block'}}>Load: ₹{row.pannaLoad}</span>}
                                                 </td>
                                                 <td style={{padding:'8px', textAlign:'center'}}>
                                                     {/* Badge for SP/DP/TP */}
                                                     <span style={{
                                                         padding:'2px 6px', borderRadius:'4px', fontSize:'9px', fontWeight:'bold',
                                                         background: row.type === 'TP' ? '#FF3B30' : row.type === 'DP' ? '#FF9500' : '#333',
                                                         color: row.type === 'SP' ? '#888' : 'white'
                                                     }}>
                                                         {row.type}
                                                     </span>
                                                 </td>
                                                 <td style={{padding:'8px', textAlign:'center', color:'white', fontWeight:'bold'}}>
                                                     {row.single}
                                                     {row.singleLoad > 0 && <span style={{fontSize:'9px', color:'#888', display:'block'}}>L: ₹{row.singleLoad}</span>}
                                                 </td>
                                                 {sessionValue === 'Close' && (
                                                     <td style={{padding:'8px', textAlign:'center', color:'#aaa'}}>
                                                         {row.jodi}
                                                         {row.jodiLoad > 0 && <span style={{fontSize:'9px', color:'#888', display:'block'}}>L: ₹{row.jodiLoad}</span>}
                                                     </td>
                                                 )}
                                                 <td style={{padding:'8px', textAlign:'right', color:'#FF3B30'}}>-₹{row.totalPayout}</td>
                                                 <td style={{padding:'8px', textAlign:'right', color: row.profit > 0 ? '#34C759' : '#FF3B30', fontWeight:'bold'}}>
                                                     ₹{row.profit}
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>

                             {/* LOAD OVERVIEW (SINGLE DIGIT LOAD) */}
                             <div style={{marginTop:'25px'}}>
                                 <h4 style={{color:'#fff', fontSize:'12px', marginBottom:'10px'}}>SINGLE DIGIT LOAD (0-9)</h4>
                                 <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                                     {Object.entries(analysisData.detailedLoad.single).map(([digit, amt]) => (
                                         <div key={digit} style={{
                                             flex:'1 0 18%', background:'#222', padding:'8px', borderRadius:'6px', 
                                             textAlign:'center', border: amt > 0 ? '1px solid #444' : '1px solid transparent'
                                         }}>
                                             <div style={{color:'white', fontWeight:'bold'}}>{digit}</div>
                                             <div style={{fontSize:'10px', color: amt > 1000 ? '#FF3B30' : '#888'}}>₹{amt}</div>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                             <button onClick={() => setModalType(null)} style={{...styles.primaryBtn, marginTop:'20px'}}>CLOSE ANALYSIS</button>
                         </div>
                     )}

                     {/* ⚠️ REVERT SELECTION MODAL */}
                     {modalType === 'revert_select' && (
                         <>
                            <div style={styles.modalIcon}><AlertTriangle size={24} color="#000"/></div>
                            <h3 style={styles.modalTitle}>Revert Result</h3>
                            <p style={{color:'#FF3B30', fontSize:'12px', marginBottom:'20px'}}>⚠️ Money will be deducted from winners!</p>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={() => handleExecuteRevert('Open')} style={styles.dangerBtn}>REVERT OPEN</button>
                                <button onClick={() => handleExecuteRevert('Close')} style={styles.dangerBtn}>REVERT CLOSE</button>
                            </div>
                            <button onClick={() => setModalType(null)} style={{...styles.linkBtn, width:'100%'}}>Cancel</button>
                         </>
                     )}

                     {/* BALANCE MODAL */}
                     {modalType === 'balance' && (
                         <>
                            <h3 style={styles.modalTitle}>Edit Wallet</h3>
                            <p style={styles.modalSub}>{selectedItem?.phone}</p>
                            <input type="number" value={inputValue} onChange={e => setInputValue(e.target.value)} style={{...styles.largeInput, margin:'20px 0'}} />
                            <div style={styles.btnGroup}>
                                <button onClick={() => setModalType(null)} style={styles.cancelBtn}>CANCEL</button>
                                <button onClick={handleExecuteBalance} style={styles.confirmBtn}>SAVE</button>
                            </div>
                         </>
                     )}

                     {/* CONFIRMATION MODALS (Replaces window.confirm) */}
                     {['confirm_approve', 'confirm_reject', 'confirm_block', 'confirm_toggle', 'confirm_delete', 'confirm_maintenance'].includes(modalType) && (
                         <>
                            <div style={styles.modalIcon}>
                                {modalType === 'confirm_approve' ? <Check size={24} color="#000"/> : 
                                 modalType === 'confirm_delete' ? <Trash2 size={24} color="#000"/> :
                                 modalType === 'confirm_maintenance' ? <Lock size={24} color="#000"/> :
                                 <AlertTriangle size={24} color="#000"/>}
                            </div>
                            <h3 style={styles.modalTitle}>
                                {modalType === 'confirm_approve' ? 'Approve Request?' : 
                                 modalType === 'confirm_reject' ? 'Reject Request?' :
                                 modalType === 'confirm_block' ? 'Block User?' :
                                 modalType === 'confirm_toggle' ? 'Change Status?' :
                                 modalType === 'confirm_delete' ? 'Delete Market?' :
                                 'Toggle Maintenance?'}
                            </h3>
                            <p style={styles.modalSub}>{selectedItem?.phone || selectedItem?.name || "Are you sure?"}</p>
                            
                            <div style={styles.btnGroup}>
                                <button onClick={() => setModalType(null)} style={styles.cancelBtn}>NO</button>
                                <button 
                                    onClick={
                                        modalType === 'confirm_approve' ? handleExecuteApprove : 
                                        modalType === 'confirm_reject' ? handleExecuteReject : 
                                        modalType === 'confirm_block' ? handleExecuteBlock :
                                        modalType === 'confirm_toggle' ? handleExecuteToggle :
                                        modalType === 'confirm_delete' ? handleExecuteDeleteMarket :
                                        handleExecuteMaintenance
                                    } 
                                    style={['confirm_delete', 'confirm_reject', 'confirm_maintenance'].includes(modalType) ? styles.dangerBtn : styles.confirmBtn}
                                >
                                    YES
                                </button>
                            </div>
                         </>
                     )}

                 </motion.div>
             </motion.div>
        )}
      </AnimatePresence>
      <ToastNotification type={modalType} msg={msg} />
    </div>
  );
}

// --- SUB COMPONENTS ---
const SectionHeader = ({icon, title}) => (
    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px', color:'#FFD700'}}>
        {icon} <h4 style={{margin:0, textTransform:'uppercase', fontSize:'14px', letterSpacing:'1px'}}>{title}</h4>
    </div>
);

const ToastNotification = ({ type, msg }) => {
    if (type !== 'success' && type !== 'error') return null;
    return (
        <motion.div initial={{y:-50, opacity:0}} animate={{y:20, opacity:1}} exit={{y:-50, opacity:0}} style={{
            position:'fixed', top:0, left: '50%', transform: 'translateX(-50%)', 
            background: type==='success'?'#34C759':'#FF3B30', 
            color:'#fff', padding:'12px 24px', borderRadius:'30px', 
            fontWeight:'bold', display:'flex', alignItems:'center', gap:'10px', 
            boxShadow:'0 10px 30px rgba(0,0,0,0.5)', zIndex: 200, width: 'max-content', maxWidth:'90%'
        }}>
            {type==='success'?<Check size={18}/>:<Skull size={18}/>} {msg}
        </motion.div>
    );
};

// --- STYLES OBJECT ---
const styles = {
    container: { minHeight: '100vh', background: '#090909', fontFamily: "'Inter', sans-serif", paddingBottom: '40px' },
    loginContainer: { minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' },
    loginCard: { background:'#121212', padding:'40px 30px', borderRadius:'24px', border:'1px solid #333', textAlign:'center', width:'100%', maxWidth:'350px', boxShadow:'0 0 40px rgba(0,0,0,0.7)' },
    header: { padding: '15px 20px', background: 'rgba(18,18,18,0.9)', backdropFilter:'blur(10px)', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position:'sticky', top:0, zIndex:40 },
    contentArea: { padding: '20px', maxWidth:'900px', margin:'0 auto' },
    
    // Sidebar
    menuOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', zIndex:90 },
    sidebar: { position:'fixed', top:0, left:0, width:'75%', maxWidth:'280px', height:'100%', background:'#161616', zIndex:100, padding:'25px', borderRight:'1px solid #333' },
    sidebarHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px' },
    menuList: { display:'flex', flexDirection:'column', gap:'8px' },
    menuItem: { padding:'15px', borderRadius:'12px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'15px', transition:'0.2s', fontSize:'14px' },
    logoutBtn: { position:'absolute', bottom:'30px', left:'20px', right:'20px', padding:'14px', background:'#330000', color:'#FF3B30', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer' },

    // Grid & Elements
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
    listContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
    listRow: { background:'#161616', padding:'15px', borderRadius:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #222' },
    card: { background: '#161616', padding: '20px', borderRadius: '16px', border: '1px solid #222', boxShadow:'0 4px 20px rgba(0,0,0,0.2)' },
    
    // Inputs & Buttons
    input: { width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '12px', outline: 'none', fontSize: '14px' },
    largeInput: { width: '100%', padding: '15px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', textAlign:'center', fontSize:'24px', fontWeight:'bold', letterSpacing:'2px', outline:'none' },
    searchInput: { background:'transparent', border:'none', color:'white', marginLeft:'10px', width:'100%', outline:'none' },
    select: { padding:'10px', background:'#222', color:'white', border:'1px solid #333', borderRadius:'8px', fontWeight:'bold', outline:'none', cursor:'pointer', flex: 1 },
    
    loginBtn: { width:'100%', padding:'16px', borderRadius:'12px', fontWeight:'bold', marginTop:'20px', cursor:'pointer', border:'none', background: '#FFD700', color:'#000' },
    linkBtn: { background:'transparent', border:'none', color:'#666', marginTop:'15px', cursor:'pointer', fontSize:'12px' },
    primaryBtn: { width:'100%', padding:'14px', borderRadius:'12px', fontWeight:'bold', marginTop:'15px', cursor:'pointer', border:'none', background: '#FFD700', color:'#000' },
    primaryBtnSmall: { flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'#FFD700', color:'#000', fontWeight:'bold', display:'flex', alignItems:'center', justify:'center', gap:'6px', cursor:'pointer' },
    dangerBtnIcon: { padding:'10px 14px', borderRadius:'8px', border:'none', background:'#330000', color:'#FF3B30', cursor:'pointer' },
    
    approveBtn: { background:'#34C759', border:'none', padding:'8px 16px', borderRadius:'6px', color:'#000', fontWeight:'bold', cursor:'pointer', fontSize:'11px' },
    rejectBtn: { background:'transparent', border:'1px solid #FF3B30', padding:'8px 16px', borderRadius:'6px', color:'#FF3B30', fontWeight:'bold', cursor:'pointer', fontSize:'11px' },
    cancelBtn: { flex:1, background:'#222', color:'white', border:'none', padding:'14px', borderRadius:'12px', cursor:'pointer', fontWeight:'bold' },
    confirmBtn: { flex:1, background:'#FFD700', color:'black', border:'none', padding:'14px', borderRadius:'12px', cursor:'pointer', fontWeight:'bold' },
    dangerBtn: { flex:1, background:'#FF3B30', color:'white', border:'none', padding:'14px', borderRadius:'12px', cursor:'pointer', fontWeight:'bold' },
    iconBtn: { background:'#222', border:'none', padding:'10px', borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    iconBtnSmall: { background:'#222', border:'1px solid #333', padding:'8px', borderRadius:'8px', color:'#fff', cursor:'pointer' },

    // Misc
    logoWrapper: { background:'rgba(255, 215, 0, 0.1)', width:80, height:80, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', border:'1px solid rgba(255, 215, 0, 0.2)' },
    pill: { fontSize:'10px', padding:'2px 8px', borderRadius:'4px', textTransform:'uppercase', fontWeight:'bold' },
    upiBox: { marginTop:'8px', background:'#222', padding:'6px', borderRadius:'6px', border:'1px solid #333', display:'inline-block', fontSize:'11px', color:'#FFD700', fontFamily:'monospace' },
    resultBox: { textAlign: 'center', margin: '15px 0', letterSpacing: '4px', background:'#000', padding:'15px', borderRadius:'12px', color:'#FFD700', fontSize:'22px', fontWeight:'bold', border:'1px solid #333' },
    badgeTime: { fontSize:'10px', color:'#888', background:'#222', padding:'2px 6px', borderRadius:'4px' },
    searchBar: { display:'flex', background:'#161616', padding:'12px', borderRadius:'12px', marginBottom:'20px', border:'1px solid #333', alignItems:'center' },
    row: { display:'flex', gap:'15px', marginBottom:'15px' },
    timeGroup: { display:'flex', gap:'5px', marginTop:'5px', flexWrap:'wrap' },
    
    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter:'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalContent: { background: '#121212', width: '90%', maxWidth: '340px', borderRadius: '24px', padding: '30px', border: '1px solid #333', textAlign:'center', boxShadow:'0 20px 50px rgba(0,0,0,0.8)' },
    modalIcon: { background:'#FFD700', borderRadius:'50%', width:50, height:50, margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 15px rgba(255, 215, 0, 0.4)' },
    modalTitle: { color:'#fff', marginTop:0, letterSpacing:'1px', fontSize:'18px' },
    modalSub: { color:'#888', fontSize:'12px', marginBottom:'20px', textTransform:'uppercase' },
    toggleGroup: { display:'flex', gap:'10px', marginBottom:'25px', background:'#0a0a0a', padding:'5px', borderRadius:'12px' },
    toggleActive: { flex:1, padding:'10px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold', background:'#FFD700', color:'#000' },
    toggleInactive: { flex:1, padding:'10px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold', background:'transparent', color:'#888', borderBottom:'2px solid transparent' },
    tabList: { display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'30px', justifyContent:'center' },
    btnGroup: { display:'flex', gap:'10px' },
    label: { fontSize:'10px', color:'#666', display:'block', marginBottom:'5px', fontWeight:'bold', textTransform:'uppercase' },
    labelCenter: { fontSize:'10px', color:'#666', display:'block', marginBottom:'5px', fontWeight:'bold', textAlign:'center' },
};

export default AdminPage;