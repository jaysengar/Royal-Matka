import React, { useEffect, useState, useMemo } from 'react';
import { 
  Download, Activity, X, Globe, Play, 
  BarChart2, ShieldCheck, Trophy, Star 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { listenToMarkets, getMarketChart, getAppConfig } from '../services/db';

const Website = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [config, setConfig] = useState({ notice: "Welcome to Royal Matka", apkUrl: "#" });
  
  // Chart States
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const unsub = listenToMarkets((data) => {
      // Sort: Active first, then by Time
      const sorted = data
        .filter(m => m.category !== 'starline')
        .sort((a, b) => {
            if (a.active === b.active) return (a.openTime24 || '').localeCompare(b.openTime24 || '');
            return a.active ? -1 : 1;
        });
      setMarkets(sorted);
    });

    getAppConfig().then(res => { if(res) setConfig(res); });

    return () => unsub();
  }, []);

  // --- 2. CHART PROCESSING LOGIC (WEEKLY GROUPING) ---
  const processChartData = (data) => {
      const weeks = {};
      
      data.forEach(item => {
          if(!item.dateStr) return;
          
          // Date Parsing
          const date = new Date(item.dateStr);
          const day = date.getDay(); // 0=Sun, 1=Mon...
          
          // Logic: Find Monday of that week
          // Matka week starts Monday. If Sunday (0), it belongs to previous week's Monday
          const adjustedDay = day === 0 ? 7 : day; 
          const diff = date.getDate() - adjustedDay + 1; 
          const monday = new Date(date);
          monday.setDate(diff);
          
          const weekKey = monday.toISOString().split('T')[0]; // YYYY-MM-DD of Monday

          if(!weeks[weekKey]) {
              weeks[weekKey] = {
                  startDate: monday,
                  formattedDate: `${monday.getDate()}/${monday.getMonth()+1}/${monday.getFullYear().toString().slice(-2)}`,
                  days: Array(8).fill(null) // Index 1-7 (Mon-Sun)
              };
          }
          
          weeks[weekKey].days[adjustedDay] = item.result;
      });

      // Sort weeks descending (Newest first)
      return Object.values(weeks).sort((a, b) => b.startDate - a.startDate);
  };

  const openChart = async (marketName) => {
      setSelectedMarket(marketName);
      setLoadingChart(true);
      try {
          const data = await getMarketChart(marketName);
          const processed = processChartData(data);
          setChartData(processed);
      } catch (e) { console.error(e); }
      setLoadingChart(false);
  };

  // --- RENDER HELPERS ---
  const renderResult = (res) => {
      if (!res || res.includes('***')) return <span style={{opacity:0.4, letterSpacing:'2px'}}>---</span>;
      const parts = res.split('-');
      if(parts.length < 2) return res;
      return (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', fontFamily:'monospace'}}>
              <span style={{color:'#888', fontSize:'12px'}}>{parts[0]}</span>
              <span style={{color:'#FFD700', fontSize:'18px', fontWeight:'bold'}}>{parts[1]}</span>
              <span style={{color:'#888', fontSize:'12px'}}>{parts[2]}</span>
          </div>
      );
  };

  const renderCellResult = (res) => {
      if (!res || res.includes('***')) return <span style={{color:'#333'}}>*</span>;
      const parts = res.split('-');
      
      // Double Jodi Logic (Red Color)
      const jodi = parts[1] || "";
      const isRed = jodi.length === 2 && (jodi[0] === jodi[1]); 

      return (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', lineHeight:'1.1'}}>
              <span style={{fontSize:'9px', color:'#aaa'}}>{parts[0]}</span>
              <span style={{fontSize:'14px', fontWeight:'bold', color: isRed ? '#FF3B30' : '#FFD700'}}>{parts[1]}</span>
              <span style={{fontSize:'9px', color:'#aaa'}}>{parts[2]}</span>
          </div>
      );
  };

  return (
    <div style={{ background: '#090909', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. NAVBAR */}
      <nav style={{
          display:'flex', justifyContent:'space-between', alignItems:'center', 
          padding:'15px 5%', borderBottom:'1px solid #222', 
          background:'rgba(9,9,9,0.9)', backdropFilter:'blur(10px)',
          position:'sticky', top:0, zIndex:50
      }}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{
                  width:45, height:45, borderRadius:'12px', 
                  background:'linear-gradient(135deg, #FFD700, #B8860B)', 
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 0 15px rgba(255, 215, 0, 0.3)'
              }}>
                  <span style={{fontSize:'28px', fontWeight:'900', color:'black'}}>R</span>
              </div>
              <div style={{lineHeight:'1'}}>
                  <span style={{display:'block', fontSize:'18px', fontWeight:'bold', letterSpacing:'1px', color:'white'}}>ROYAL</span>
                  <span style={{display:'block', fontSize:'12px', color:'#FFD700', letterSpacing:'3px', fontWeight:'bold'}}>MATKA</span>
              </div>
          </div>

          <div style={{display:'flex', gap:'15px'}}>
              <motion.button 
                whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                onClick={() => navigate('/login')}
                style={{
                    background:'rgba(255, 215, 0, 0.1)', border:'1px solid #FFD700', color:'#FFD700', 
                    padding:'8px 20px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:'8px', fontSize:'13px'
                }}
              >
                  <Play size={16} fill="#FFD700" /> <span className="hide-mobile">BET ONLINE</span>
              </motion.button>

              <motion.a 
                whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                href={config.apkUrl || "#"} download
                style={{
                    background:'linear-gradient(to bottom, #FFD700, #E0AA00)', color:'black', 
                    padding:'8px 20px', borderRadius:'8px', fontWeight:'bold', textDecoration:'none',
                    display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 15px rgba(255, 215, 0, 0.3)',
                    fontSize:'13px'
                }}
              >
                  <Download size={16} /> <span className="hide-mobile">DOWNLOAD APP</span>
              </motion.a>
          </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header style={{
          textAlign:'center', padding:'80px 20px', position:'relative', overflow:'hidden',
          background: 'radial-gradient(circle at 50% 30%, #1a1a1a 0%, #090909 70%)'
      }}>
          {/* Background Elements */}
          <div style={{position:'absolute', top:'20%', left:'10%', width:'300px', height:'300px', background:'#FFD700', filter:'blur(150px)', opacity:0.05}}></div>
          
          <motion.div initial={{y:30, opacity:0}} animate={{y:0, opacity:1}} transition={{duration:0.8}}>
              <div style={{display:'inline-flex', alignItems:'center', gap:'5px', background:'#111', padding:'5px 15px', borderRadius:'20px', border:'1px solid #333', marginBottom:'20px'}}>
                  <Trophy size={14} color="#FFD700" />
                  <span style={{fontSize:'12px', color:'#888', textTransform:'uppercase', letterSpacing:'1px'}}>India's Most Trusted App</span>
              </div>
              
              <h1 style={{fontSize:'clamp(36px, 6vw, 72px)', fontWeight:'900', margin:'0', lineHeight:'1.1', color:'white'}}>
                  PLAY BIG, <br/>
                  <span style={{
                      background: 'linear-gradient(to right, #FFD700, #FFF8DC)', 
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
                  }}>WIN ROYAL.</span>
              </h1>
              
              <p style={{color:'#888', maxWidth:'600px', margin:'20px auto', fontSize:'16px', lineHeight:'1.6'}}>
                  Experience the fastest results, authentic jodi charts, and secure betting. 
                  Join 10,000+ players on the official Royal Matka platform.
              </p>
              
              <div style={{display:'flex', justifyContent:'center', gap:'15px', marginTop:'40px'}}>
                  <button onClick={() => navigate('/login')} style={{
                      padding:'14px 40px', borderRadius:'8px', background:'#FFD700', border:'none', 
                      fontWeight:'900', cursor:'pointer', fontSize:'16px', color:'black',
                      boxShadow:'0 0 20px rgba(255, 215, 0, 0.4)'
                  }}>
                      START PLAYING
                  </button>
              </div>
          </motion.div>
      </header>

      {/* 3. TICKER */}
      <div style={{background:'#111', borderTop:'1px solid #222', borderBottom:'1px solid #222', padding:'12px 0', overflow:'hidden'}}>
          <div className="ticker-wrap">
              <div className="ticker">
                  {[1,2,3,4,5].map(i => (
                      <span key={i} style={{marginRight:'60px', display:'inline-flex', alignItems:'center', gap:'10px', fontSize:'14px', color:'#ccc'}}>
                          <Activity size={16} color="#FFD700"/> {config.notice}
                      </span>
                  ))}
              </div>
          </div>
      </div>

      {/* 4. LIVE RESULTS */}
      <div style={{padding:'60px 5%', maxWidth:'1200px', margin:'0 auto'}}>
          <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'40px'}}>
              <div style={{width:5, height:30, background:'#FFD700', borderRadius:'2px'}}></div>
              <h2 style={{fontSize:'28px', fontWeight:'bold', margin:0}}>Live Market Results</h2>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'20px'}}>
              {markets.map((m, idx) => (
                  <motion.div 
                    key={m.id}
                    initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: idx*0.05}}
                    style={{
                        background: 'linear-gradient(145deg, #111 0%, #0d0d0d 100%)', 
                        borderRadius:'16px', border:'1px solid #222', overflow:'hidden', position:'relative',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                  >
                      {/* Active Status Line */}
                      <div style={{height:'4px', width:'100%', background: m.active ? '#34C759' : '#FF3B30'}}></div>

                      <div style={{padding:'20px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px'}}>
                              <h3 style={{margin:0, fontSize:'18px', color:'white', textTransform:'uppercase', fontWeight:'800', letterSpacing:'0.5px'}}>{m.name}</h3>
                              {m.active ? 
                                <span style={{background:'rgba(52, 199, 89, 0.1)', color:'#34C759', padding:'4px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:'bold'}}>LIVE</span> 
                                : 
                                <span style={{background:'rgba(255, 59, 48, 0.1)', color:'#FF3B30', padding:'4px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:'bold'}}>CLOSED</span>
                              }
                          </div>

                          <div style={{background:'#050505', borderRadius:'12px', padding:'15px', textAlign:'center', border:'1px solid #1a1a1a'}}>
                              {renderResult(m.result)}
                          </div>

                          <div style={{display:'flex', justifyContent:'space-between', marginTop:'20px', fontSize:'12px', color:'#666', borderTop:'1px solid #1a1a1a', paddingTop:'15px'}}>
                              <div>OPEN: <span style={{color:'#ddd', fontWeight:'bold'}}>{m.openTime}</span></div>
                              <div>CLOSE: <span style={{color:'#ddd', fontWeight:'bold'}}>{m.closeTime}</span></div>
                          </div>
                      </div>

                      <button 
                        onClick={() => openChart(m.name)}
                        style={{
                            width:'100%', padding:'15px', background:'#1a1a1a', border:'none', borderTop:'1px solid #222', 
                            color:'#FFD700', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                            fontSize:'12px', letterSpacing:'1px', transition:'0.3s'
                        }}
                        className="hover-bright"
                      >
                          <BarChart2 size={16}/> PANEL CHART
                      </button>
                  </motion.div>
              ))}
          </div>
      </div>

      {/* 5. FOOTER */}
      <footer style={{textAlign:'center', padding:'60px 20px', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
          <ShieldCheck size={40} color="#333" style={{marginBottom:'20px'}}/>
          <p style={{color:'#666', fontSize:'14px', marginBottom:'10px'}}>© 2024 Royal Matka Entertainment. All rights reserved.</p>
          <div style={{display:'flex', justifyContent:'center', gap:'20px', fontSize:'12px', color:'#444'}}>
              <span>Fair Play</span>
              <span>•</span>
              <span>Instant Withdrawal</span>
              <span>•</span>
              <span>24/7 Support</span>
          </div>
      </footer>

      {/* --- PROFESSIONAL CHART MODAL --- */}
      <AnimatePresence>
          {selectedMarket && (
              <div style={{position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px', backdropFilter:'blur(5px)'}}>
                  {/* Backdrop */}
                  <motion.div 
                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    onClick={() => setSelectedMarket(null)}
                    style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)'}}
                  />
                  
                  {/* Modal Content */}
                  <motion.div 
                    initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}}
                    style={{
                        background:'#121212', width:'100%', maxWidth:'800px', height:'85vh', 
                        borderRadius:'16px', border:'1px solid #333', overflow:'hidden', 
                        position:'relative', display:'flex', flexDirection:'column',
                        boxShadow:'0 20px 50px rgba(0,0,0,0.8)'
                    }}
                  >
                      {/* Header */}
                      <div style={{padding:'20px', background:'#1a1a1a', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                              <BarChart2 size={20} color="#FFD700"/>
                              <div>
                                  <h3 style={{margin:0, color:'white', textTransform:'uppercase', fontSize:'16px'}}>{selectedMarket}</h3>
                                  <span style={{fontSize:'11px', color:'#888'}}>PANEL CHART RECORD</span>
                              </div>
                          </div>
                          <button onClick={() => setSelectedMarket(null)} style={{background:'#333', border:'none', padding:'8px', borderRadius:'50%', cursor:'pointer', color:'white'}}>
                              <X size={20}/>
                          </button>
                      </div>

                      {/* CHART GRID */}
                      <div className="custom-scroll" style={{flex:1, overflow:'auto', padding:'20px', background:'#090909'}}>
                          {loadingChart ? (
                              <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', flexDirection:'column', gap:'10px'}}>
                                  <div className="spin" style={{width:30, height:30, border:'3px solid #333', borderTopColor:'#FFD700', borderRadius:'50%'}}></div>
                                  Loading Data...
                              </div>
                          ) : chartData.length === 0 ? (
                              <div style={{textAlign:'center', padding:'50px', color:'#444'}}>No Data Available</div>
                          ) : (
                              <table style={{width:'100%', borderCollapse:'collapse', minWidth:'600px'}}>
                                  <thead>
                                      <tr style={{color:'#888', fontSize:'11px', textTransform:'uppercase', borderBottom:'1px solid #333'}}>
                                          <th style={{padding:'10px', textAlign:'left', width:'100px'}}>DATE</th>
                                          <th style={{padding:'10px'}}>MON</th>
                                          <th style={{padding:'10px'}}>TUE</th>
                                          <th style={{padding:'10px'}}>WED</th>
                                          <th style={{padding:'10px'}}>THU</th>
                                          <th style={{padding:'10px'}}>FRI</th>
                                          <th style={{padding:'10px'}}>SAT</th>
                                          <th style={{padding:'10px', color:'#FF3B30'}}>SUN</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {chartData.map((week, i) => (
                                          <tr key={i} style={{borderBottom:'1px solid #222'}}>
                                              {/* Date Column */}
                                              <td style={{padding:'10px', color:'#666', fontSize:'11px', fontWeight:'bold', borderRight:'1px solid #222'}}>
                                                  {week.formattedDate}
                                                  <div style={{fontSize:'9px', fontWeight:'normal', opacity:0.7}}>to Next Sat</div>
                                              </td>
                                              
                                              {/* Days Columns */}
                                              {[1,2,3,4,5,6,7].map(dayIdx => (
                                                  <td key={dayIdx} style={{padding:'8px', textAlign:'center', borderRight:'1px solid #222', background: dayIdx===7?'rgba(255,59,48,0.02)':'transparent'}}>
                                                      {renderCellResult(week.days[dayIdx])}
                                                  </td>
                                              ))}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <style>{`
        .ticker-wrap { width: 100%; overflow: hidden; white-space: nowrap; }
        .ticker { display: inline-block; animation: ticker 30s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: #111; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; borderRadius: 3px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .hover-bright:hover { filter: brightness(1.2); }
        @media (max-width: 600px) {
            .hide-mobile { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Website;