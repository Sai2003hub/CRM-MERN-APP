import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllTenants, toggleTenantStatus } from '../services/api';

const AdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchTenants(); }, []);

  const fetchTenants = async () => {
    try {
      const res = await getAllTenants();
      setTenants(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (orgId) => {
    try {
      await toggleTenantStatus(orgId);
      fetchTenants();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.owner?.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={styles.loading}>Loading tenants...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>All Tenants</h1>
          <p style={styles.subtitle}>{tenants.length} organizations on the platform</p>
        </div>
        <Link to="/admin" style={styles.backBtn}>← Back to Dashboard</Link>
      </div>

      <div style={styles.searchBar}>
        <input
          type="text" placeholder="Search by org name or owner email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <p style={styles.empty}>No tenants found</p>
        ) : (
          filtered.map((tenant) => (
            <div key={tenant._id} style={{ ...styles.card, opacity: tenant.isActive ? 1 : 0.7 }}>
              <div style={styles.cardTop}>
                <div>
                  <h3 style={styles.orgName}>{tenant.name}</h3>
                  <p style={styles.ownerName}>{tenant.owner?.name || 'No owner'}</p>
                  <p style={styles.ownerEmail}>{tenant.owner?.email}</p>
                </div>
                <span style={{ ...styles.badge, backgroundColor: tenant.isActive ? '#dcfce7' : '#fee2e2', color: tenant.isActive ? '#16a34a' : '#dc2626' }}>
                  {tenant.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>

              <div style={styles.stats}>
                <div style={styles.stat}>
                  <span style={styles.statVal}>{tenant.stats.totalLeads}</span>
                  <span style={styles.statLabel}>Leads</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statVal}>{tenant.stats.totalDeals}</span>
                  <span style={styles.statLabel}>Deals</span>
                </div>
                <div style={styles.stat}>
                  <span style={{ ...styles.statVal, color: '#d97706' }}>₹{tenant.stats.totalRevenue.toLocaleString()}</span>
                  <span style={styles.statLabel}>Revenue</span>
                </div>
              </div>

              <p style={styles.joinDate}>Joined {new Date(tenant.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

              <div style={styles.actions}>
                <Link to={`/admin/tenants/${tenant._id}`} style={styles.viewBtn}>View Details</Link>
                <button
                  onClick={() => handleToggle(tenant._id)}
                  style={{ ...styles.toggleBtn, backgroundColor: tenant.isActive ? '#fef2f2' : '#f0fdf4', color: tenant.isActive ? '#dc2626' : '#16a34a', border: `1px solid ${tenant.isActive ? '#fecaca' : '#bbf7d0'}` }}
                >
                  {tenant.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '28px', maxWidth: '1300px', margin: '0 auto' },
  loading: { padding: '40px', textAlign: 'center', color: '#64748b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { margin: 0, fontSize: '26px', fontWeight: '700', color: '#0f172a' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  backBtn: { padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' },
  searchBar: { marginBottom: '20px' },
  searchInput: { width: '100%', maxWidth: '400px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  empty: { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '40px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  orgName: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' },
  ownerName: { margin: '4px 0 2px', fontSize: '13px', color: '#475569', fontWeight: '500' },
  ownerEmail: { margin: 0, fontSize: '12px', color: '#94a3b8' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' },
  stats: { display: 'flex', gap: '0', marginBottom: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden' },
  stat: { flex: 1, textAlign: 'center', padding: '10px 0', borderRight: '1px solid #e2e8f0' },
  statVal: { display: 'block', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '500' },
  joinDate: { fontSize: '11px', color: '#94a3b8', margin: '0 0 14px' },
  actions: { display: 'flex', gap: '8px' },
  viewBtn: { flex: 1, padding: '8px', backgroundColor: '#1a1f2e', color: 'white', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', textAlign: 'center' },
  toggleBtn: { flex: 1, padding: '8px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
};

export default AdminTenants;