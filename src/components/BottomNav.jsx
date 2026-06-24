import React from 'react';
import { Home, History, BarChart2, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;

    return (
        <div style={{ 
            position: 'fixed', bottom: 0, left:0, width: '100%', 
            background: 'rgba(15, 15, 15, 0.98)', backdropFilter:'blur(10px)',
            borderTop: '1px solid #222', 
            display: 'flex', justifyContent: 'space-around', 
            padding: '12px 12px calc(15px + env(safe-area-inset-bottom)) 12px', 
            zIndex: 80 
        }}>
            <NavIcon 
                icon={<Home size={22} />} 
                label="Home" 
                active={path === '/'} 
                onClick={() => navigate('/')} 
            />
            <NavIcon 
                icon={<History size={22} />} 
                label="My Bids" 
                active={path === '/history'} 
                onClick={() => navigate('/history')} 
            />
            <NavIcon 
                icon={<BarChart2 size={22} />} 
                label="Charts" 
                active={path === '/chart'} 
                onClick={() => navigate('/chart')} 
            />
            <NavIcon 
                icon={<User size={22} />} 
                label="Profile" 
                active={path === '/profile'} 
                onClick={() => navigate('/profile')} 
            />
        </div>
    );
};

const NavIcon = ({ icon, label, active, onClick }) => (
    <motion.div 
        whileTap={{scale:0.9}} 
        onClick={onClick} 
        style={{ 
            textAlign: 'center', 
            color: active ? '#FFD700' : '#666', 
            cursor: 'pointer', 
            display:'flex', 
            flexDirection:'column', 
            alignItems:'center', 
            gap:'4px' 
        }}
    >
        {icon}
        <p style={{ fontSize: '10px', margin: 0, fontWeight: active ? 'bold' : '500' }}>{label}</p>
    </motion.div>
);

export default BottomNav;
