import React from 'react';
import { ArrowLeft, TrendingUp, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function GameRatesPage() {
  const navigate = useNavigate();

  const rates = [
    { name: "Single (Ank)", rate: "1:9 (9 guna)", return10: "₹90", desc: "Guess the single digit (0-9)" },
    { name: "Jodi (Pair)", rate: "1:90 (90 guna)", return10: "₹900", desc: "Guess the 2-digit number (00-99)" },
    { name: "Single Patti", rate: "1:140 (140 guna)", return10: "₹1,400", desc: "Guess the 3-digit panna with 3 unique digits" },
    { name: "Double Patti", rate: "1:280 (280 guna)", return10: "₹2,800", desc: "Guess the 3-digit panna with 2 repeating digits" },
    { name: "Triple Patti", rate: "1:600 (600 guna)", return10: "₹6,000", desc: "Guess the 3-digit panna with 3 repeating digits" },
    { name: "Half Sangam", rate: "1:1,000 (1000 guna)", return10: "₹10,000", desc: "Guess Open Digit + Close Panna OR Open Panna + Close Digit" },
    { name: "Full Sangam", rate: "1:10,000 (10,000 guna)", return10: "₹1,00,000", desc: "Guess Open Panna + Close Panna" }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', background: '#111', borderBottom: '1px solid #222', position:'sticky', top:0, zIndex:10 }}>
        <div onClick={() => navigate(-1)} style={{padding:'8px', borderRadius:'50%', background:'#222', cursor:'pointer'}}>
            <ArrowLeft color="white" size={20} />
        </div>
        <h2 style={{fontSize: '18px', margin: 0, fontWeight: 'bold', letterSpacing:'1px'}}>Game Rates</h2>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        
        <div style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0))', border: '1px solid #333', padding: '20px', borderRadius: '16px', marginBottom: '25px', display:'flex', gap:'15px', alignItems:'flex-start' }}>
            <Info color="#FFD700" size={24} style={{flexShrink:0}} />
            <div>
                <h3 style={{margin:'0 0 5px 0', fontSize:'14px', color:'#FFD700'}}>How to Play & Win</h3>
                <p style={{margin:0, fontSize:'12px', color:'#aaa', lineHeight:'1.5'}}>
                    Below are the official payout rates for all game types. If you place a bet of ₹10, the "Returns" column shows your potential winnings.
                </p>
            </div>
        </div>

        {rates.map((item, i) => (
          <motion.div 
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i * 0.1}}
            key={i} 
            style={{
              background: '#161616', padding: '20px', borderRadius: '16px', marginBottom: '15px',
              border: '1px solid #222', boxShadow: '0 5px 20px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden'
            }}
          >
            <div style={{position:'absolute', top:0, left:0, width:'4px', height:'100%', background:'#FFD700'}}></div>
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
               <div>
                   <h3 style={{fontSize: '18px', margin: '0 0 5px 0', fontWeight: 'bold', color:'white'}}>{item.name}</h3>
                   <span style={{fontSize:'11px', color:'#888', background:'#222', padding:'4px 8px', borderRadius:'6px'}}>{item.desc}</span>
               </div>
               <div style={{background:'rgba(255,215,0,0.1)', padding:'8px 12px', borderRadius:'12px', border:'1px solid rgba(255,215,0,0.3)', textAlign:'center'}}>
                   <p style={{fontSize:'10px', color:'#FFD700', margin:'0 0 2px 0', fontWeight:'bold', textTransform:'uppercase'}}>Payout Rate</p>
                   <p style={{fontSize:'14px', color:'white', margin:0, fontWeight:'bold'}}>{item.rate}</p>
               </div>
            </div>

            <div style={{background:'#0a0a0a', padding:'15px', borderRadius:'12px', border:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:'13px', color:'#aaa'}}>If you bet <span style={{color:'white', fontWeight:'bold'}}>₹10</span></span>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <TrendingUp size={16} color="#34C759" />
                    <span style={{fontSize:'18px', color:'#34C759', fontWeight:'900'}}>{item.return10}</span>
                </div>
            </div>

          </motion.div>
        ))}

      </div>

    </div>
  );
}

export default GameRatesPage;
