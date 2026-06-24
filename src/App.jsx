import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { Loader2, AlertTriangle } from 'lucide-react'; 
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { listenToMaintenance } from './services/db'; 

// --- PAGES ---
import Website from './pages/Website';
import IntroScreen from './pages/IntroScreen';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import BettingPage from './pages/BettingPage';
import AdminPage from './pages/AdminPage';
import WalletPage from './pages/WalletPage';
import HistoryPage from './pages/HistoryPage';
import PaymentStatus from './pages/PaymentStatus';
import ProfilePage from './pages/ProfilePage';
import ChartPage from './pages/ChartPage'; 
import NotificationsPage from './pages/NotificationsPage';
import GameRatesPage from './pages/GameRatesPage';

// --- HELPER: SCROLL TO TOP ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// --- COMPONENT: MAINTENANCE SCREEN ---
const MaintenanceScreen = () => (
  <div style={{
    height: '100vh', width: '100%', background: '#000', color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '30px'
  }}>
    <div style={{
      width:'80px', height:'80px', borderRadius:'50%', background:'rgba(255, 215, 0, 0.1)',
      display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px',
      border:'1px solid rgba(255, 215, 0, 0.3)', boxShadow:'0 0 30px rgba(255,215,0,0.1)'
    }}>
      <AlertTriangle size={40} color="#FFD700" />
    </div>
    <h1 style={{fontSize:'24px', fontWeight:'bold', margin:'0 0 10px 0', letterSpacing:'1px'}}>UNDER MAINTENANCE</h1>
    <p style={{color:'#888', fontSize:'14px', lineHeight:'1.6', maxWidth:'300px'}}>
      We are currently upgrading our servers to provide you a better experience.
    </p>
    <div style={{marginTop:'30px', padding:'10px 20px', background:'#111', borderRadius:'8px', border:'1px solid #222'}}>
      <span style={{color:'#444', fontSize:'12px', fontWeight:'bold'}}>PLEASE CHECK BACK LATER</span>
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false); 
  
  // Check Platform (Mobile App or Website?)
  const isNativeApp = Capacitor.isNativePlatform();

  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. BACK BUTTON HANDLER (Only for Native App) ---
  useEffect(() => {
    let backListener;
    
    if (isNativeApp) {
        const setupBackButton = async () => {
          backListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            const currentPath = location.pathname;
            if (currentPath === '/' || currentPath === '/login' || showIntro || isMaintenance) {
                 CapacitorApp.exitApp();
            } else {
                 navigate(-1);
            }
          });
        };
        setupBackButton();
    }

    return () => { if(backListener) backListener.remove(); };
  }, [navigate, location, showIntro, isMaintenance, isNativeApp]);

  // --- 2. INITIALIZATION (Supabase Auth + Realtime Maintenance) ---
  useEffect(() => {
    
    // A. Check Intro
    const hasSeenIntro = localStorage.getItem('royal_intro_seen');
    if (!hasSeenIntro) setShowIntro(true);

    // B. REAL-TIME MAINTENANCE LISTENER (Supabase Realtime)
    const unsubscribeMaintenance = listenToMaintenance((status) => {
        setIsMaintenance(status);
    });

    // C. Supabase Auth Listener (replaces Firebase onAuthStateChanged)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setTimeout(() => setInitializing(false), 1500);
      }
    );

    // Also check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setTimeout(() => setInitializing(false), 1500);
    });

    return () => {
        unsubscribeMaintenance();
        subscription.unsubscribe();
    };
  }, []);

  const handleIntroFinish = () => {
    localStorage.setItem('royal_intro_seen', 'true');
    setShowIntro(false);
  };

  // --- 3. LOADING SCREEN (SPLASH) ---
  if (initializing) {
    return (
      <div style={{
          height:'100vh', width:'100vw', 
          display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
          position:'relative', overflow:'hidden',
          background: 'radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 85%)'
      }}>
         <div style={{position:'absolute', width:'300px', height:'300px', background:'#FFD700', borderRadius:'50%', filter:'blur(150px)', opacity:0.15}}></div>
         <div style={{
             width:'90px', height:'90px', borderRadius:'24px', 
             background: 'linear-gradient(135deg, #FFD700, #C5A000)',
             display:'flex', alignItems:'center', justifyContent:'center',
             boxShadow: '0 0 40px rgba(255, 215, 0, 0.3)', marginBottom: '25px', animation: 'pulse 2s infinite'
         }}>
             <h1 style={{fontSize:'45px', fontWeight:'900', margin:0, color:'black'}}>R</h1>
         </div>
         <h2 className="gold-text" style={{fontSize:'20px', letterSpacing:'4px', margin:0, fontWeight:'900', textTransform:'uppercase'}}>ROYAL MATKA</h2>
         <div style={{marginTop:'40px', display:'flex', alignItems:'center', gap:'10px', color:'#666', fontSize:'12px', fontWeight:'500'}}>
             <Loader2 className="spin" size={18} color="#FFD700" /> STARTING APP...
         </div>
         <style>{`
            @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); } 70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255, 215, 0, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); } }
            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
         `}</style>
      </div>
    );
  }

  // --- 4. MAINTENANCE MODE HANDLING ---
  if (isMaintenance) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<MaintenanceScreen />} />
      </Routes>
    );
  }

  // --- 5. LOGIC SPLIT: WEB vs APP ---

  // CASE A: WEB LANDING
  if (!isNativeApp && !user && location.pathname === '/') {
      return <Website />;
  }

  // CASE B: APP INTRO
  if (isNativeApp && !user && showIntro) {
      return <IntroScreen onFinish={handleIntroFinish} />;
  }

  // --- 6. MAIN APP ROUTING ---
  return (
    <>
      <ScrollToTop /> 
      <Routes>
        
        {/* PUBLIC */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/payment-status" element={<PaymentStatus />} />

        {/* ADMIN */}
        <Route path="/admin" element={<AdminPage />} />

        {/* PROTECTED */}
        <Route path="/" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
        <Route path="/betting" element={<ProtectedRoute user={user}><BettingPage /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute user={user}><WalletPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute user={user}><HistoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute user={user}><ProfilePage /></ProtectedRoute>} />
        <Route path="/chart" element={<ProtectedRoute user={user}><ChartPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute user={user}><NotificationsPage /></ProtectedRoute>} />
        <Route path="/rates" element={<ProtectedRoute user={user}><GameRatesPage /></ProtectedRoute>} />
        
        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </>
  );
}

// Helper: Protected Route Wrapper
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default App;