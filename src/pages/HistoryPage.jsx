import React, { useEffect, useState, useMemo } from 'react';
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, Trophy, Wallet, 
  ArrowDownLeft, ArrowUpRight, Calendar, Filter, RefreshCw, AlertCircle, ChevronRight, AlertTriangle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyBets, getMyTransactions } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '../components/BottomNav';

function HistoryPage() {
  const navigate = useNavigate();
  
  // States
  const [activeTab, setActiveTab] = useState('bids'); 
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (navigator.vibrate) navigator.vibrate(50);
    
    try {
        let res = [];
        if(activeTab === 'bids') {
            res = await getMyBets();
        } else {
            res = await getMyTransactions();
        }
        setData(Array.isArray(res) ? res : []);
    } catch(e) {
        console.error("History Error", e);
        setData([]);
    }
    setLoading(false);
  };

  // Filter Logic
  const filteredData = useMemo(() => {
      if (activeTab === 'payment') return data;
      if (filterStatus === 'All') return data;
      return data.filter(item => item.status && item.status.toLowerCase() === filterStatus.toLowerCase());
  }, [data, activeTab, filterStatus]);

  // Helper: Date Formatter
  const formatDate = (timestamp) => {
    if(!timestamp) return "Processing...";
    try {
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    } catch(e) { return "Invalid Date"; }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '90px', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ 
        padding: '15px 20px', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)', 
        position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #222'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div onClick={() => navigate('/')} style={{padding:'8px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
                <ArrowLeft color="white" size={20} />
            </div>
            <h2 className="gold-text" style={{ fontSize: '18px', margin:0, textTransform:'uppercase', fontWeight:'900' }}>My Activity</h2>
        </div>
        <div onClick={fetchData} style={{padding:'8px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
            <RefreshCw size={18} color="#FFD700" className={loading ? "spin" : ""} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding: '20px' }}>
          <div style={{ background: '#161616', padding: '6px', borderRadius: '16px', display: 'flex', border: '1px solid #333' }}>
            <TabButton active={activeTab === 'bids'} onClick={() => { setActiveTab('bids'); setFilterStatus('All'); }} label="Bet History" icon={<Trophy size={16} />} />
            <TabButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} label="Transactions" icon={<Wallet size={16} />} />
          </div>
      </div>

      {/* FILTERS (Bids Only) */}
      <AnimatePresence>
        {activeTab === 'bids' && (
            <motion.div 
                initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}}
                style={{ padding: '0 20px 20px', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth:'none' }}
            >
                {['All', 'Won', 'Lost', 'Pending'].map((status) => (
                    <div key={status} onClick={() => setFilterStatus(status.toLowerCase() === 'all' ? 'All' : status.toLowerCase())}
                        style={{
                            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                            background: filterStatus.toLowerCase() === status.toLowerCase() ? '#FFD700' : '#222',
                            color: filterStatus.toLowerCase() === status.toLowerCase() ? 'black' : '#888',
                            border: '1px solid #333', whiteSpace: 'nowrap'
                        }}
                    >
                        {status}
                    </div>
                ))}
            </motion.div>
        )}
      </AnimatePresence>

      {/* LIST CONTENT */}
      <div style={{ padding: '0 20px' }}>
        
        {loading && (
            <div style={{padding:'40px', textAlign:'center'}}>
                <div className="spin" style={{width:24, height:24, border:'2px solid #333', borderTopColor:'#FFD700', borderRadius:'50%', margin:'0 auto'}}></div>
            </div>
        )}

        {!loading && filteredData.length === 0 && (
            <div style={{textAlign:'center', marginTop:'40px', padding:'30px', background:'#161616', borderRadius:'16px', border:'1px solid #222'}}>
                <div style={{background:'#111', width: 60, height: 60, borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <Filter size={24} color="#444" />
                </div>
                <h3 style={{fontSize:'16px', color:'#eee', margin:'0 0 5px 0'}}>No records found</h3>
                <p style={{fontSize:'12px', color:'#666', margin:0}}>Try changing filters or place a new bet.</p>
            </div>
        )}

        <AnimatePresence mode="popLayout">
            {filteredData.map((item, index) => (
                <motion.div 
                    layout
                    key={item.id || index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                    {activeTab === 'bids' ? (
                        <BidTicket item={item} formatDate={formatDate} />
                    ) : (
                        <PaymentCard item={item} formatDate={formatDate} navigate={navigate} />
                    )}
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      <BottomNav />
    </div>
  );
}

// --- SUB COMPONENTS ---

const TabButton = ({ active, onClick, label, icon }) => (
    <motion.div whileTap={{scale:0.95}} onClick={onClick} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: active ? '#FFD700' : 'transparent', color: active ? 'black' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', transition: 'background 0.3s' }}>
        {icon} {label}
    </motion.div>
);

const getStatusColor = (status) => {
    const s = status?.toLowerCase() || 'pending';
    if(s === 'won' || s === 'success') return '#34C759'; 
    if(s === 'lost' || s === 'failed') return '#FF3B30'; 
    return '#FFD700'; 
};

const getStatusIcon = (status, color) => {
    const s = status?.toLowerCase() || 'pending';
    if(s === 'won' || s === 'success') return <CheckCircle size={14} color={color} />;
    if(s === 'lost' || s === 'failed') return <XCircle size={14} color={color} />;
    return <Clock size={14} color={color} />;
};

// 🎫 BID TICKET
const BidTicket = ({ item, formatDate }) => {
    const color = getStatusColor(item.status);
    const isWin = item.status === 'won';
    
    return (
        <div style={{ 
            background: '#161616', borderRadius: '16px', marginBottom: '16px', 
            position: 'relative', overflow: 'hidden', 
            border: `1px solid ${color === '#FFD700' ? '#333' : color}`, 
            borderLeft: `5px solid ${color}` 
        }}>
            <div style={{padding:'15px', paddingLeft:'20px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
                    <div>
                        <span style={{fontSize:'10px', color:'#888', fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px'}}><Calendar size={10} /> {formatDate(item.date)}</span>
                        <h3 style={{fontSize:'16px', margin:'4px 0 0 0', color:'white', textTransform:'uppercase', fontWeight:'bold', letterSpacing:'0.5px'}}>{item.marketName}</h3>
                    </div>
                    {isWin && <Trophy size={20} color="#FFD700" />}
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111', padding:'10px 12px', borderRadius:'10px', border:'1px solid #222'}}>
                     <div>
                         <span style={{fontSize:'10px', color:'#666', textTransform:'uppercase', fontWeight:'bold'}}>{item.gameType}</span>
                         <div style={{display:'flex', gap:'6px', alignItems:'baseline'}}>
                            <span style={{fontSize:'12px', color:'#aaa'}}>{item.session}</span>
                            <span style={{fontSize:'20px', color:'#fff', fontWeight:'900', letterSpacing:'1px'}}>{item.digit}</span>
                         </div>
                     </div>
                     <div style={{textAlign:'right'}}>
                         <span style={{fontSize:'10px', color:'#666', fontWeight:'bold'}}>AMOUNT</span>
                         <span style={{display:'block', fontSize:'16px', color: color, fontWeight:'bold'}}>₹{item.amount}</span>
                     </div>
                </div>
            </div>
            {/* Dashed Separator */}
            <div style={{position:'relative', height:'1px', borderTop:'1px dashed #333', margin:'0 10px'}}></div>
            
            <div style={{padding:'10px 15px', paddingLeft:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                    {getStatusIcon(item.status, color)}
                    <span style={{fontSize:'12px', fontWeight:'bold', color: color, textTransform:'uppercase'}}>{item.status}</span>
                </div>
                {isWin && <span style={{fontSize:'13px', fontWeight:'bold', color:'#34C759', textShadow:'0 0 10px rgba(52,199,89,0.4)'}}>Winning: +₹{item.winAmount}</span>}
            </div>
        </div>
    );
};

// 💳 TRANSACTION CARD (Fixed for Mobile Touch)
const PaymentCard = ({ item, formatDate, navigate }) => {
    const color = getStatusColor(item.status);
    
    // Safety Checks
    const isDeposit = item.type?.toLowerCase() === 'deposit';
    const isSuccess = item.status?.toLowerCase() === 'success';
    const isPending = item.status?.toLowerCase() === 'pending';
    const isFailed = item.status?.toLowerCase() === 'failed';
    
    // 🔥 ROBUST ID CHECK (Ye line APK ke liye zaroori hai)
    const orderId = item.orderId || item.order_id || item.txnId || item.id; 

    // Logic: Agar Deposit hai to click hona hi chahiye
    const isClickable = isDeposit;

    const handleClick = () => {
        if (isClickable) {
            if(orderId) {
                if(navigator.vibrate) navigator.vibrate(40);
                navigate(`/payment-status?order_id=${orderId}`);
            } else {
                // Agar ID nahi mili to user ko batao
                alert("Receipt Error: Transaction ID not found in database.");
            }
        }
    };
    
    // Text Logic
    let statusText = isDeposit ? "Money Added" : "Withdrawal Done";
    if (isPending) statusText = isDeposit ? "Processing..." : "Withdrawal Pending";
    if (isFailed) statusText = "Payment Failed";
    
    return (
        <motion.div 
            whileTap={isClickable ? { scale: 0.97 } : {}}
            onClick={handleClick} // 🔥 Pure Card pe Click
            style={{ 
                background: '#161616', borderRadius: '16px', padding: '15px', marginBottom: '12px',
                borderLeft: `5px solid ${color}`,
                border: `1px solid ${isPending ? '#333' : color}`,
                display:'flex', justifyContent:'space-between', alignItems:'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                cursor: isClickable ? 'pointer' : 'default',
                // Mobile Text Overflow Fix
                overflow: 'hidden'
            }}
        >
            <div style={{display:'flex', alignItems:'center', gap:'15px', flex:1, overflow:'hidden'}}>
                <div style={{
                    background: `rgba(${isDeposit? '52,199,89':'255,59,48'}, 0.1)`, 
                    padding:'12px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    border: `1px solid ${color}`, flexShrink: 0
                }}>
                    {isDeposit ? <ArrowDownLeft size={20} color={color} /> : <ArrowUpRight size={20} color={color} />}
                </div>
                
                <div style={{flex: 1, minWidth: 0}}>
                    <h4 style={{margin:0, fontSize:'15px', color:'white', textTransform:'capitalize', fontWeight:'bold', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                        {statusText}
                    </h4>
                    <p style={{fontSize:'11px', color:'#666', marginTop:'4px', fontWeight:'500'}}>
                        {formatDate(item.date)}
                    </p>
                    
                    {/* Humesha Dikhega Agar Deposit Hai */}
                    {isDeposit && (
                        <p style={{
                            fontSize:'10px', color: color, marginTop:'5px', 
                            display:'flex', alignItems:'center', gap:'4px', 
                            fontWeight:'bold', background: `${color}15`, width:'fit-content', padding:'3px 8px', borderRadius:'4px'
                        }}>
                            View Status <ChevronRight size={10}/>
                        </p>
                    )}
                </div>
            </div>

            <div style={{textAlign:'right', marginLeft:'10px', flexShrink:0}}>
                <p style={{fontSize:'16px', fontWeight:'900', color: color, margin:0}}>
                    {isDeposit ? '+' : '-'} ₹{item.amount}
                </p>
                <div style={{display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'4px', background: `${color}20`, padding:'2px 8px', borderRadius:'4px'}}>
                     {isPending && <AlertCircle size={10} color={color}/>}
                     {isSuccess && <CheckCircle size={10} color={color}/>}
                     {isFailed && <AlertTriangle size={10} color={color}/>}
                     <span style={{fontSize:'10px', color: color, fontWeight:'bold'}}>
                        {item.status ? item.status.toUpperCase() : 'PENDING'}
                     </span>
                </div>
            </div>
        </motion.div>
    );
};

export default HistoryPage;