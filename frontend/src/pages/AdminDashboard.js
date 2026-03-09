import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, getAllTenants, toggleTenantStatus } from '../services/api';

const StatCard = ({ label, value, color = '#2563eb', icon }) => (
  <div style={cardStyles.card}>
    <div style={{ ...cardStyles.icon, backgroundColor: color + '15', color }}>{icon}</div>
    <div>
      <p style={cardStyles.label}>{label}</p>
      <p style={{ ...cardStyles.value, color }}>{value}</p>
    </div>
  </div>
);

const cardStyles = {
  card: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '16px' },
  icon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
  label: { margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' },
  value: { margin: '4px 0 0', fontSize: '28px', fontWeight: '700' },
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminStats(), getAllTenants()])
      .then(([statsRes, tenantsRes]) => {
        setStats(statsRes.data);
        setTenants(tenantsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (orgId) => {
    try {
      await toggleTenantStatus(orgId);
      const res = await getAllTenants();
      setTenants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={styles.loading}>Loading platform data...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Platform Overview</h1>
          <p style={styles.subtitle}>All tenants and platform-wide statistics</p>
        </div>
        <Link to="/admin/tenants" style={styles.viewAllBtn}>View All Tenants →</Link>
      </div>

      {/* Platform Stats */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Organizations" value={stats?.totalOrgs ?? 0} color="#2563eb" icon="🏢" />
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} color="#7c3aed" icon="👥" />
        <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} color="#0891b2" icon="🎯" />
        <StatCard label="Total Deals" value={stats?.totalDeals ?? 0} color="#059669" icon="🤝" />
        <StatCard label="Platform Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} color="#d97706" icon="💰" />
      </div>

      {/* Recent Tenants Table */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Tenants</h2>
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={{ flex: 2 }}>Organization</span>
            <span style={{ flex: 2 }}>Owner</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Leads</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Deals</span>
            <span style={{ flex: 1.5, textAlign: 'right' }}>Revenue</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Status</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Actions</span>
          </div>

          {tenants.length === 0 ? (
            <div style={styles.emptyRow}>No tenants yet</div>
          ) : (
            tenants.slice(0, 10).map((tenant) => (
              <div key={tenant._id} style={{ ...styles.tableRow, opacity: tenant.isActive ? 1 : 0.6 }}>
                <span style={{ flex: 2 }}>
                  <Link to={`/admin/tenants/${tenant._id}`} style={styles.orgLink}>
                    {tenant.name}
                  </Link>
                  <span style={styles.orgDate}>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span style={{ flex: 2, fontSize: '13px', color: '#475569' }}>
                  {tenant.owner?.name || '—'}
                  <br />
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>{tenant.owner?.email}</span>
                </span>
                <span style={{ flex: 1, textAlign: 'center', fontWeight: '600', color: '#0891b2' }}>{tenant.stats.totalLeads}</span>
                <span style={{ flex: 1, textAlign: 'center', fontWeight: '600', color: '#059669' }}>{tenant.stats.totalDeals}</span>
                <span style={{ flex: 1.5, textAlign: 'right', fontWeight: '600', color: '#d97706' }}>₹{tenant.stats.totalRevenue.toLocaleString()}</span>
                <span style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ ...styles.statusBadge, backgroundColor: tenant.isActive ? '#dcfce7' : '#fee2e2', color: tenant.isActive ? '#16a34a' : '#dc2626' }}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
                <span style={{ flex: 1, textAlign: 'center', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <Link to={`/admin/tenants/${tenant._id}`} style={styles.actionBtn}>View</Link>
                  <button onClick={() => handleToggle(tenant._id)} style={{ ...styles.actionBtn, ...styles.toggleBtn, backgroundColor: tenant.isActive ? '#fef2f2' : '#f0fdf4', color: tenant.isActive ? '#dc2626' : '#16a34a', border: `1px solid ${tenant.isActive ? '#fecaca' : '#bbf7d0'}` }}>
                    {tenant.isActive ? 'Disable' : 'Enable'}
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '28px', maxWidth: '1300px', margin: '0 auto' },
  loading: { padding: '40px', textAlign: 'center', color: '#64748b' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  title: { margin: 0, fontSize: '26px', fontWeight: '700', color: '#0f172a' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  viewAllBtn: { padding: '10px 18px', backgroundColor: '#1a1f2e', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' },
  section: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  sectionTitle: { margin: 0, padding: '20px 24px', fontSize: '16px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
  table: { width: '100%' },
  tableHeader: { display: 'flex', padding: '12px 24px', backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { display: 'flex', padding: '14px 24px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: '14px' },
  emptyRow: { padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  orgLink: { display: 'block', fontWeight: '600', color: '#1e40af', textDecoration: 'none', fontSize: '14px' },
  orgDate: { fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' },
  statusBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  actionBtn: { padding: '5px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', textDecoration: 'none' },
  toggleBtn: { fontSize: '11px' },
};

export default AdminDashboard;