import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await login(form);
      const { token, user } = response.data;
      loginUser(token, user);

      if (user.role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.header}>
          <h1 style={styles.logo}>Mini CRM</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          <label style={styles.label}>Email</label>
          <input
            type="email" placeholder="you@company.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password" placeholder="Your password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required style={styles.input} autoComplete="current-password"
          />

          <button type="submit" style={styles.button}>Sign In</button>
        </form>

        <p style={styles.link}>
          Don't have an account? <Link to="/register" style={styles.linkA}>Register</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' },
  box: { backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' },
  header: { textAlign: 'center', marginBottom: '28px' },
  logo: { margin: 0, fontSize: '28px', fontWeight: '800', color: '#1a1f2e' },
  subtitle: { margin: '6px 0 0', color: '#64748b', fontSize: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px', marginTop: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '22px' },
  error: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' },
  link: { textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '20px' },
  linkA: { color: '#2563eb', fontWeight: '600', textDecoration: 'none' },
};

export default Login;