import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck } from 'lucide-react';

function IntroScreen({ onFinish }) {
  
  // Safe Handler with Haptic Feedback
  const handleStart = () => {
      if(navigator.vibrate) navigator.vibrate(50);
      if(onFinish && typeof onFinish === 'function') {
          onFinish();
      }
  };

  return (
    <div style={styles.container}>
      
      {/* --- Animated Background Glows --- */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={styles.blobTop}
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={styles.blobBottom}
      />

      <div style={styles.contentWrapper}>
        
        {/* 🔥 Logo Animation */}
        <motion.div 
          initial={{ scale: 0, rotate: -180 }} 
          animate={{ scale: 1, rotate: 0 }} 
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={styles.logoContainer}
        >
          <div style={styles.logoInner}>
            <span style={{fontSize:'45px', fontWeight:'900', color:'black', fontFamily:'serif'}}>R</span>
          </div>
        </motion.div>

        {/* Text Animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
        >
          <h1 className="gold-text" style={styles.title}>ROYAL MATKA</h1>
          <p style={styles.subtitle}>India's Most Trusted Platform</p>
        </motion.div>

        {/* Features List */}
        <div style={styles.featureList}>
            <FeatureItem text="Super Fast Results" delay={0.6} />
            <FeatureItem text="Instant Withdrawal" delay={0.8} />
            <FeatureItem text="24/7 WhatsApp Support" delay={1.0} />
        </div>

        {/* Start Button */}
        <motion.button
          initial={{ width: '50px', opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 120 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          style={styles.btn}
        >
          GET STARTED <ChevronRight size={20} strokeWidth={3} />
        </motion.button>

        <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            style={styles.footerText}
        >
            <ShieldCheck size={14} color="#444" /> 100% Safe & Secure
        </motion.p>

      </div>
    </div>
  );
}

// Sub Component for List with Animation
const FeatureItem = ({ text, delay }) => (
    <motion.div 
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: delay, duration: 0.5 }}
        style={styles.featureItem}
    >
        <div style={styles.dot}></div>
        <span style={{fontSize:'15px', fontWeight:'500', color:'#eee'}}>{text}</span>
    </motion.div>
);

const styles = {
    container: { position:'fixed', inset:0, background:'#050505', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' },
    
    // Content Wrapper for centering
    contentWrapper: { zIndex:10, textAlign:'center', width:'100%', maxWidth:'400px', padding:'30px', display:'flex', flexDirection:'column', justifyContent:'center' },

    // Blobs
    blobTop: { position:'absolute', top:'-10%', left:'-20%', width:'350px', height:'350px', background:'#FFD700', borderRadius:'50%', filter:'blur(120px)' },
    blobBottom: { position:'absolute', bottom:'-10%', right:'-20%', width:'300px', height:'300px', background:'#FFD700', borderRadius:'50%', filter:'blur(120px)' },

    // Logo
    logoContainer: { width:'100px', height:'100px', background:'linear-gradient(135deg, #FFD700, #C5A000)', borderRadius:'24px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 30px', boxShadow:'0 0 40px rgba(255, 215, 0, 0.2)' },
    logoInner: { width:'90px', height:'90px', border:'2px solid rgba(0,0,0,0.1)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center' },

    // Typography
    title: { fontSize:'28px', fontWeight:'900', letterSpacing:'3px', margin:'0 0 5px', color:'white', textTransform:'uppercase' },
    subtitle: { color:'#666', fontSize:'13px', margin:'0 0 40px', letterSpacing:'1px', fontWeight:'500' },

    // Features
    featureList: { textAlign:'left', padding:'0 10px', marginBottom:'40px' },
    featureItem: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' },
    dot: { width:6, height:6, background:'#FFD700', borderRadius:'50%', boxShadow:'0 0 10px #FFD700' },

    // Button
    btn: { background:'white', color:'black', border:'none', padding:'16px', borderRadius:'14px', fontSize:'14px', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 5px 20px rgba(255, 255, 255, 0.1)', outline:'none' },
    
    // Footer
    footerText: { fontSize:'11px', color:'#333', marginTop:'25px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', fontWeight:'600' }
};

export default IntroScreen;