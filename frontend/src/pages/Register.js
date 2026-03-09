import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { register, getInviteInfo, registerViaInvite } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [isInviteMode, setIsInviteMode] = useState(false);

  const navigate = useNavigate();
  const { loginUser } = useContext(AuthContext);

  useEffect(() => {
    if (!inviteToken) return;

    const fetchInviteInfo = async () => {
      try {
        const res = await getInviteInfo(inviteToken);
        setForm((prev) => ({
          ...prev,
          name: res.data.name || '',
          email: res.data.email || '',
        }));
        setIsInviteMode(true);
      } catch (err) {
        setError('This invite link is invalid or has already been used.');
      } finally {
        setInviteLoading(false);
      }
    };

    fetchInviteInfo();
  }, [inviteToken]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isInviteMode) {
        const res = await registerViaInvite({
          password: form.password,
          organizationName: form.organizationName,
          inviteToken,
        });
        loginUser(res.data.token, res.data.user);
        setSuccess('Account created! Redirecting to your CRM...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        await register(form);
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (inviteLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Validating invite link...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.header}>
          <h1 style={styles.logo}>Mini CRM</h1>
          {isInviteMode ? (
            <div style={styles.inviteBanner}>
              <span style={styles.inviteIcon}>🎉</span>
              <p style={styles.inviteText}>You've been invited to join!</p>
              <p style={styles.inviteSubtext}>Set up your account to get started</p>
            </div>
          ) : (
            <p style={styles.subtitle}>Create your account & organization</p>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          <label style={styles.label}>Your Name</label>
          <input
            name="name" type="text" placeholder="John Doe"
            value={form.name} onChange={handleChange} required
            readOnly={isInviteMode}
            style={{ ...styles.input, ...(isInviteMode ? styles.readOnly : {}) }}
          />

          <label style={styles.label}>Email</label>
          <input
            name="email" type="email" placeholder="you@company.com"
            value={form.email} onChange={handleChange} required
            readOnly={isInviteMode}
            style={{ ...styles.input, ...(isInviteMode ? styles.readOnly : {}) }}
          />
          {isInviteMode && (
            <p style={styles.hint}>✓ Pre-filled from your invite</p>
          )}

          <label style={styles.label}>Organization Name</label>
          <input
            name="organizationName" type="text"
            placeholder={isInviteMode ? `${form.name}'s Organization` : "e.g. Acme Corp"}
            value={form.organizationName} onChange={handleChange}
            style={styles.input}
          />
          <p style={styles.hint}>Leave blank to auto-generate from your name</p>

          <label style={styles.label}>Password</label>
          <input
            name="password" type="password" placeholder="Min. 6 characters"
            value={form.password} onChange={handleChange} required
            style={styles.input} autoComplete="new-password"
          />

          <button
            type="submit"
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : isInviteMode ? 'Create My Account' : 'Create Account & Organization'}
          </button>
        </form>

        {!isInviteMode && (
          <p style={styles.link}>
            Already have an account?{' '}
            <Link to="/login" style={styles.linkA}>Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' },
  box: { backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '28px' },
  logo: { margin: 0, fontSize: '28px', fontWeight: '800', color: '#1a1f2e' },
  subtitle: { margin: '6px 0 0', color: '#64748b', fontSize: '14px' },
  inviteBanner: { marginTop: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' },
  inviteIcon: { fontSize: '24px', display: 'block', marginBottom: '4px' },
  inviteText: { margin: 0, fontSize: '15px', fontWeight: '700', color: '#15803d' },
  inviteSubtext: { margin: '4px 0 0', fontSize: '13px', color: '#16a34a' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px', marginTop: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  readOnly: { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed', border: '1px solid #e2e8f0' },
  hint: { fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' },
  button: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '22px' },
  error: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' },
  successBox: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' },
  link: { textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '20px' },
  linkA: { color: '#2563eb', fontWeight: '600', textDecoration: 'none' },
};

export default Register;