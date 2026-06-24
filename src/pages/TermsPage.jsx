import React, { useEffect } from 'react';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function TermsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ChevronLeft size={24} color="#FFD700" />
        </button>
        <h1 style={styles.headerTitle}>Terms & Conditions</h1>
        <div style={{ width: '40px' }} /> {/* Spacer */}
      </div>

      <div style={styles.content}>
        
        <div style={styles.warningBox}>
          <ShieldAlert size={30} color="#FFD700" style={{marginBottom: '10px'}} />
          <h2 style={{color: '#FFD700', fontSize: '18px', margin: '0 0 10px 0'}}>LEGAL DISCLAIMER</h2>
          <p style={{fontSize: '12px', color: '#ccc', margin: 0, lineHeight: 1.5}}>
            This application is for entertainment purposes only. By using this application, you acknowledge that you are participating at your own risk. The management is not responsible for any financial losses. This platform does not promote illegal gambling. Please check your local jurisdiction laws regarding online betting before participating.
          </p>
        </div>

        <section style={styles.section}>
          <h3 style={styles.title}>1. Acceptance of Terms</h3>
          <p style={styles.text}>
            By accessing and using the Royal Matka application, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section style={styles.section}>
          <h3 style={styles.title}>2. Admin Rights & Control</h3>
          <p style={styles.text}>
            The application administrators retain <strong>ABSOLUTE and TOTAL CONTROL</strong> over the platform. The Admin reserves the right to:
          </p>
          <ul style={styles.list}>
            <li>Add, deduct, or modify user balances at any time without prior notice.</li>
            <li>Block, suspend, or permanently delete any user account at their sole discretion.</li>
            <li>Cancel any bids, bets, or transactions if suspicious activity is detected.</li>
            <li>Change the market results or timings as deemed necessary by the management.</li>
          </ul>
          <p style={{...styles.text, color: '#FF3B30', marginTop: '10px', fontWeight: 'bold'}}>
            The Admin's decision in all matters will be considered final and binding. No disputes will be entertained regarding balance deductions or account blocks.
          </p>
        </section>

        <section style={styles.section}>
          <h3 style={styles.title}>3. Financial Risks</h3>
          <p style={styles.text}>
            All deposits and bets are non-refundable. You agree that you are fully aware of the risk of losing money when placing bets on this platform.
          </p>
        </section>

        <section style={styles.section}>
          <h3 style={styles.title}>4. Privacy Policy</h3>
          <p style={styles.text}>
            Your phone number and device token are stored securely for authentication and notification purposes. We do not share your data with third parties. However, by using this app, you grant the Admin full access to review your betting history and transactions.
          </p>
        </section>

        <section style={styles.section}>
          <h3 style={styles.title}>5. Governing Law</h3>
          <p style={styles.text}>
            Any claim relating to Royal Matka's application shall be governed by the laws of the jurisdiction without regard to its conflict of law provisions.
          </p>
        </section>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#050505',
    color: '#fff',
    fontFamily: 'sans-serif',
    paddingBottom: '40px'
  },
  header: {
    position: 'sticky',
    top: 0,
    background: 'rgba(5,5,5,0.9)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px 20px',
    borderBottom: '1px solid #222',
    zIndex: 10
  },
  backBtn: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: '12px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0
  },
  content: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto'
  },
  warningBox: {
    background: 'rgba(255, 215, 0, 0.05)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '30px',
    textAlign: 'center'
  },
  section: {
    marginBottom: '25px',
    background: '#111',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid #222'
  },
  title: {
    color: '#FFD700',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  text: {
    color: '#aaa',
    fontSize: '14px',
    lineHeight: 1.6,
    margin: 0
  },
  list: {
    color: '#aaa',
    fontSize: '14px',
    lineHeight: 1.6,
    marginTop: '10px',
    paddingLeft: '20px'
  }
};

export default TermsPage;
