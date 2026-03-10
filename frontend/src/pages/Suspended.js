const Suspended = () => {
  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.icon}>🔒</div>
        <h1 style={styles.title}>Account Suspended</h1>
        <p style={styles.message}>
          Your account has been suspended. Please contact our support team to resolve this.
        </p>
        <a href="mailto:support@minicrm.com" style={styles.button}>
          Contact Support
        </a>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' },
  box: { backgroundColor: 'white', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '420px', width: '100%' },
  icon: { fontSize: '48px', marginBottom: '16px' },
  title: { margin: '0 0 12px', fontSize: '24px', fontWeight: '800', color: '#1a1f2e' },
  message: { margin: '0 0 28px', color: '#64748b', fontSize: '15px', lineHeight: '1.6' },
  button: { display: 'inline-block', padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' },
};

export default Suspended;