import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';

const defaultStats = {
  totalLeads: 0,
  totalDeals: 0,
  mrr: 0,
  arr: 0,
  setupFeesCollected: 0,
  tcv: 0,
  dealsByStage: [],
};

const Dashboard = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.container}>Loading...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard</h1>

      <div style={styles.topGrid}>
        <div style={styles.card}>
          <div style={{ ...styles.iconBox, backgroundColor: '#eff6ff', color: '#2563eb' }}>🎯</div>
          <p style={styles.label}>Total Leads</p>
          <p style={{ ...styles.number, color: '#2563eb' }}>{stats.totalLeads}</p>
        </div>
        <div style={styles.card}>
          <div style={{ ...styles.iconBox, backgroundColor: '#f0fdf4', color: '#16a34a' }}>🤝</div>
          <p style={styles.label}>Total Deals</p>
          <p style={{ ...styles.number, color: '#16a34a' }}>{stats.totalDeals}</p>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Revenue Metrics</h2>
        <p style={styles.sectionSubtitle}>From Won deals only</p>
      </div>

      <div style={styles.revenueGrid}>
        <div style={styles.revenueCard}>
          <div style={{ ...styles.iconBox, backgroundColor: '#fffbeb', color: '#d97706' }}>📈</div>
          <p style={styles.label}>MRR</p>
          <p style={{ ...styles.number, color: '#d97706' }}>₹{(isNaN(stats.mrr) ? 0 : Math.round(stats.mrr)).toLocaleString()}</p>
          <p style={styles.subtext}>Monthly Recurring Revenue</p>
          <p style={styles.formula}>Sum of Won monthly subscriptions</p>
        </div>

        <div style={styles.revenueCard}>
          <div style={{ ...styles.iconBox, backgroundColor: '#fdf4ff', color: '#9333ea' }}>🔁</div>
          <p style={styles.label}>ARR</p>
          <p style={{ ...styles.number, color: '#9333ea' }}>₹{(isNaN(stats.arr) ? 0 : Math.round(stats.arr)).toLocaleString()}</p>
          <p style={styles.subtext}>Annual Recurring Revenue</p>
          <p style={styles.formula}>(MRR × 12) + Won annual subscriptions</p>
        </div>

        <div style={styles.revenueCard}>
          <div style={{ ...styles.iconBox, backgroundColor: '#fff1f2', color: '#e11d48' }}>💳</div>
          <p style={styles.label}>Setup Fees</p>
          <p style={{ ...styles.number, color: '#e11d48' }}>₹{(isNaN(stats.setupFeesCollected) ? 0 : Math.round(stats.setupFeesCollected)).toLocaleString()}</p>
          <p style={styles.subtext}>One-time fees collected</p>
          <p style={styles.formula}>Sum of setup fees on Won deals</p>
        </div>

        <div style={{ ...styles.revenueCard, ...styles.tcvCard }}>
          <div style={{ ...styles.iconBox, backgroundColor: '#ecfdf5', color: '#059669' }}>💰</div>
          <p style={styles.label}>TCV</p>
          <p style={{ ...styles.number, color: '#059669' }}>₹{(isNaN(stats.tcv) ? 0 : Math.round(stats.tcv)).toLocaleString()}</p>
          <p style={styles.subtext}>Total Contract Value</p>
          <p style={styles.formula}>ARR + Setup Fees</p>
        </div>
      </div>

      {stats.dealsByStage.length > 0 && (
        <div style={styles.stageSection}>
          <h2 style={styles.sectionTitle}>Deals by Stage</h2>
          <div style={styles.stageGrid}>
            {stats.dealsByStage.map((stage) => (
              <div key={stage._id} style={styles.stageCard}>
                <h4 style={styles.stageName}>{stage._id}</h4>
                <p style={styles.stageCount}>{stage.count} {stage.count === 1 ? 'deal' : 'deals'}</p>
                <p style={styles.stageAmount}>₹{stage.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '28px', maxWidth: '1200px', margin: '0 auto' },
  title: { margin: '0 0 24px', fontSize: '26px', fontWeight: '700', color: '#0f172a' },
  topGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px', maxWidth: '500px' },
  card: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  iconBox: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' },
  label: { margin: '0 0 6px', fontSize: '13px', color: '#64748b', fontWeight: '500' },
  number: { margin: 0, fontSize: '32px', fontWeight: '700' },
  subtext: { margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' },
  formula: { margin: '2px 0 0', fontSize: '10px', color: '#cbd5e1', fontStyle: 'italic' },
  sectionHeader: { marginBottom: '14px' },
  sectionTitle: { margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  sectionSubtitle: { margin: 0, fontSize: '12px', color: '#94a3b8' },
  revenueGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '32px' },
  revenueCard: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  tcvCard: { border: '2px solid #d1fae5' },
  stageSection: { marginTop: '8px' },
  stageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' },
  stageCard: { backgroundColor: 'white', padding: '18px 20px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: '3px solid #e2e8f0' },
  stageName: { margin: '0 0 8px', fontSize: '14px', fontWeight: '700', color: '#0f172a' },
  stageCount: { margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color: '#0f172a' },
  stageAmount: { margin: 0, fontSize: '13px', color: '#64748b' },
};

export default Dashboard;