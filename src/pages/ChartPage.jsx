import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, BarChart2, ChevronDown, 
  Search, X, Activity, TrendingUp, AlertCircle , Check 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMarketChart, listenToMarkets } from '../services/db'; 
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '../components/BottomNav';

function ChartPage() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [marketsList, setMarketsList] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // UI States
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Load Available Markets (Realtime)
  useEffect(() => {
    const unsubscribe = listenToMarkets((data) => {
      // Security: Filter only Main markets
      const validMarkets = data.filter(m => m.category !== 'starline').sort((a,b) => a.name.localeCompare(b.name));
      setMarketsList(validMarkets);

      // Auto Select first market
      if (validMarkets.length > 0 && !selectedMarket) {
        setSelectedMarket(validMarkets[0].name);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Chart Data (Secure Fetch)
  useEffect(() => {
    if(selectedMarket) {
        fetchChart();
    }
  }, [selectedMarket]);

  const fetchChart = async () => {
    setLoading(true);
    setError('');
    try {
        const data = await getMarketChart(selectedMarket);
        
        // 🛡️ DATA SANITIZATION & SORTING (Newest First)
        if (Array.isArray(data)) {
            const sorted = data.sort((a, b) => {
                const dateA = new Date(a.dateStr || a.date?.toDate());
                const dateB = new Date(b.dateStr || b.date?.toDate());
                return dateB - dateA; // Descending
            });
            setChartData(sorted);
        } else {
            setChartData([]);
        }
    } catch(e) {
        console.error("Chart Error", e);
        setError("Failed to load chart data");
    }
    setLoading(false);
  };

  // --- HELPER FUNCTIONS ---

  // Safe Date Formatter
  const formatDate = (dateString, timestamp) => {
      try {
          const d = dateString ? new Date(dateString) : timestamp?.toDate();
          if(!d) return { day: '-', month: '-', weekday: '-' };
          
          return {
              day: d.getDate().toString().padStart(2, '0'),
              month: d.toLocaleDateString('en-US', { month: 'short' }),
              weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
              full: d.toLocaleDateString('en-GB')
          };
      } catch (e) { return { day: '-', month: '-', weekday: '-' }; }
  };

  // 🎨 PROFESSIONAL MATRIX RESULT RENDERER
  const renderResult = (resultString) => {
     // Safety Check
     if(!resultString || typeof resultString !== 'string' || resultString.includes('***')) {
         return <span style={{color:'#333', fontSize:'24px', letterSpacing:'5px', fontWeight:'900'}}>---</span>;
     }
     
     const parts = resultString.split('-'); // Format: 123-45-678
     
     // Fallback for incomplete data
     if(parts.length !== 3) return <span style={{color:'#FF3B30', fontSize:'12px'}}>INVALID</span>;
     
     return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', lineHeight:'1.1'}}>
            {/* Open Panna */}
            <span style={{fontSize:'10px', color:'#888', fontWeight:'500', fontFamily:'monospace'}}>{parts[0]}</span>
            
            {/* Jodi (Highlighted) */}
            <div style={{
                fontSize:'18px', fontWeight:'900', color:'#FFD700', 
                margin:'1px 0', textShadow:'0 0 15px rgba(255, 215, 0, 0.4)',
                letterSpacing:'1px'
            }}>
                {parts[1]}
            </div>
            
            {/* Close Panna */}
            <span style={{fontSize:'10px', color:'#888', fontWeight:'500', fontFamily:'monospace'}}>{parts[2]}</span>
        </div>
     );
  };

  // 🛡️ Safe Filter Logic
  const filteredMarkets = useMemo(() => {
      const cleanQuery = searchQuery.toLowerCase().replace(/[^a-z0-9 ]/g, ''); // Remove special chars
      return marketsList.filter(m => m.name.toLowerCase().includes(cleanQuery));
  }, [marketsList, searchQuery]);

  // --- RENDER ---
  return (
    <div style={{ minHeight: '100vh', background: '#050505', paddingBottom: '90px', color: 'white', fontFamily:'sans-serif' }}>
      
      {/* 1. HEADER */}
      <div style={{ 
        padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', 
        background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', 
        position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #222'
      }}>
         <div onClick={() => navigate('/')} style={{padding:'10px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
            <ArrowLeft color="white" size={20} />
         </div>
         <div style={{flex:1}}>
             <h2 className="gold-text" style={{ fontSize: '16px', margin:0, textTransform:'uppercase', fontWeight:'900', letterSpacing:'1px' }}>Jodi Chart</h2>
             <p style={{fontSize:'10px', color:'#666', margin:0}}>Result History</p>
         </div>
         <Activity color="#FFD700" size={20} />
      </div>

      {/* 2. MARKET SELECTOR BUTTON */}
      <div style={{padding:'20px 20px 10px'}}>
          <motion.div 
            whileTap={{scale:0.98}}
            onClick={() => setIsSelectorOpen(true)}
            style={{
                background: '#161616', padding: '15px', borderRadius: '16px', 
                border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', cursor:'pointer'
            }}
          >
              <div>
                  <label style={{fontSize:'10px', color:'#666', display:'block', marginBottom:'4px', fontWeight:'bold', textTransform:'uppercase'}}>Current Market</label>
                  <span style={{fontSize:'16px', fontWeight:'bold', color:'white', display:'flex', alignItems:'center', gap:'8px', textTransform:'uppercase'}}>
                      {selectedMarket || "Loading..."}
                  </span>
              </div>
              <div style={{background:'#222', padding:'8px', borderRadius:'50%'}}>
                <ChevronDown size={18} color="#FFD700" />
              </div>
          </motion.div>
      </div>

      {/* 3. CHART TABLE */}
      <div style={{ padding: '20px' }}>
          
          {/* Header Row */}
          <div style={{
              display:'flex', justifyContent:'space-between', padding:'12px 20px', 
              background: '#222', borderRadius:'12px 12px 0 0', 
              borderBottom:'2px solid #333'
          }}>
              <span style={{fontSize:'10px', fontWeight:'bold', color:'#888', display:'flex', alignItems:'center', gap:'5px'}}>
                  <Calendar size={12} /> DATE
              </span>
              <span style={{fontSize:'10px', fontWeight:'bold', color:'#888', display:'flex', alignItems:'center', gap:'5px'}}>
                  RESULT <TrendingUp size={12} />
              </span>
          </div>

          {/* Loading Skeleton */}
          {loading && (
             <div style={{background:'#161616', borderRadius:'0 0 12px 12px', overflow:'hidden', border:'1px solid #222', borderTop:'none'}}>
                 {[1,2,3,4,5].map(i => (
                     <div key={i} style={{padding:'20px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                         <div style={{width:'80px', height:'15px', background:'#222', borderRadius:'4px'}} className="pulse"></div>
                         <div style={{width:'60px', height:'40px', background:'#222', borderRadius:'4px'}} className="pulse"></div>
                     </div>
                 ))}
             </div>
          )}

          {/* Error State */}
          {!loading && error && (
              <div style={{background:'#161616', padding:'40px', textAlign:'center', borderRadius:'0 0 12px 12px', border:'1px solid #333'}}>
                  <AlertCircle size={30} color="#FF3B30" style={{margin:'0 auto 10px'}}/>
                  <p style={{color:'#888', fontSize:'12px'}}>{error}</p>
              </div>
          )}

          {/* Empty State */}
          {!loading && !error && chartData.length === 0 && (
             <div style={{background:'#161616', padding:'60px 20px', textAlign:'center', borderRadius:'0 0 12px 12px', border:'1px solid #222'}}>
                 <BarChart2 size={40} color="#333" style={{marginBottom:'15px', margin:'0 auto'}} />
                 <p style={{color:'#666', fontSize:'14px', margin:0}}>No records found for this market</p>
             </div>
          )}

          {/* Data Rows */}
          {!loading && chartData.length > 0 && (
            <div style={{background:'#161616', borderRadius:'0 0 12px 12px', overflow:'hidden', border:'1px solid #222', borderTop:'none'}}>
                {chartData.map((row, index) => {
                    const dateObj = formatDate(row.dateStr, row.date);
                    return (
                        <motion.div 
                            key={index} 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            style={{
                                display:'flex', justifyContent:'space-between', alignItems:'center',
                                padding:'12px 20px', 
                                background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                                borderBottom: '1px solid #222'
                            }}
                        >
                            {/* Date Column */}
                            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                <div style={{textAlign:'center', background:'#222', padding:'6px 10px', borderRadius:'8px', minWidth:'45px'}}>
                                    <span style={{display:'block', fontSize:'14px', fontWeight:'900', color:'white'}}>{dateObj.day}</span>
                                    <span style={{display:'block', fontSize:'9px', color:'#888', textTransform:'uppercase', fontWeight:'bold'}}>{dateObj.month}</span>
                                </div>
                                <div>
                                    <span style={{fontSize:'12px', color:'#666', fontWeight:'500', display:'block'}}>{dateObj.weekday}</span>
                                    <span style={{fontSize:'9px', color:'#444', display:'block'}}>{dateObj.full}</span>
                                </div>
                            </div>
                            
                            {/* Result Column */}
                            <div style={{
                                width:'85px', padding:'8px 0', 
                                background: 'linear-gradient(180deg, #1f1f1f 0%, #000 100%)', 
                                borderRadius:'8px', border:'1px solid #333',
                                boxShadow:'inset 0 0 10px rgba(0,0,0,0.8)',
                                display:'flex', justifyContent:'center'
                            }}>
                                {renderResult(row.result)}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
          )}
      </div>

      {/* --- MARKET SELECTOR MODAL (Bottom Sheet) --- */}
      <AnimatePresence>
        {isSelectorOpen && (
            <div style={{position:'fixed', inset:0, zIndex:100}}>
                {/* Backdrop */}
                <motion.div 
                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    onClick={() => setIsSelectorOpen(false)}
                    style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(5px)'}}
                />
                
                {/* Sheet Content */}
                <motion.div 
                    initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                    transition={{type:'spring', damping:25, stiffness:300}}
                    style={{
                        position:'absolute', bottom:0, left:0, right:0, 
                        background:'#161616', borderRadius:'24px 24px 0 0', 
                        height:'70vh', display:'flex', flexDirection:'column',
                        borderTop:'1px solid #333', boxShadow:'0 -10px 50px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Handle */}
                    <div style={{width:'40px', height:'4px', background:'#333', borderRadius:'2px', margin:'10px auto'}}></div>
                    
                    {/* Header */}
                    <div style={{padding:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{margin:0, color:'white', fontSize:'18px'}}>Select Market</h3>
                        <div onClick={() => setIsSelectorOpen(false)} style={{padding:'8px', background:'#222', borderRadius:'50%', cursor:'pointer'}}>
                            <X size={20} color="#888" />
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{padding:'0 20px 20px'}}>
                        <div style={{background:'#0a0a0a', border:'1px solid #333', borderRadius:'12px', padding:'12px', display:'flex', alignItems:'center', gap:'10px'}}>
                            <Search size={18} color="#666"/>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search market..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{background:'transparent', border:'none', outline:'none', color:'white', width:'100%', fontSize:'14px'}}
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div style={{flex:1, overflowY:'auto', padding:'0 20px 40px'}}>
                        {filteredMarkets.length === 0 ? (
                            <p style={{textAlign:'center', color:'#444', marginTop:'20px'}}>No markets found</p>
                        ) : (
                            filteredMarkets.map((m) => (
                                <motion.div 
                                    key={m.id}
                                    whileTap={{scale:0.98, backgroundColor:'#222'}}
                                    onClick={() => {
                                        setSelectedMarket(m.name);
                                        setIsSelectorOpen(false);
                                        setSearchQuery('');
                                    }}
                                    style={{
                                        padding:'15px', borderBottom:'1px solid #222', 
                                        display:'flex', justifyContent:'space-between', alignItems:'center',
                                        cursor:'pointer',
                                        background: selectedMarket === m.name ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                                        borderRadius:'8px', marginBottom:'5px'
                                    }}
                                >
                                    <span style={{fontSize:'14px', fontWeight:'bold', color: selectedMarket === m.name ? '#FFD700' : '#ddd', textTransform:'uppercase'}}>
                                        {m.name}
                                    </span>
                                    {selectedMarket === m.name && <Check size={16} color="#FFD700" />}
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* CSS Animation for Skeleton */}
      <style>{`
        .pulse { animation: pulse-animation 1.5s infinite ease-in-out; }
        @keyframes pulse-animation {
            0% { opacity: 0.3; }
            50% { opacity: 0.7; }
            100% { opacity: 0.3; }
        }
      `}</style>
      <BottomNav />
    </div>
  );
}

export default ChartPage;