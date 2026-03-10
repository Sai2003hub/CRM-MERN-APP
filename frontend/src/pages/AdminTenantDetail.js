
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTenantDetails, logTenantPayment, deleteTenantPayment, updateTenantBilling } from '../services/api';

const stageColors = { Open: '#3b82f6', Proposal: '#06b6d4', Negotiation: '#f59e0b', Won: '#10b981', Lost: '#ef4444' };

const AdminTenantDetail = () => {
  const { orgId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'subscription', note: '', paidAt: new Date().toISOString().split('T')[0] });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Billing form state
  const [billingForm, setBillingForm] = useState({ billingPlan: 'monthly', monthlyFee: '', setupFee: '' });
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingEditing, setBillingEditing] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const fetchData = () => {
    getTenantDetails(orgId)
      .then((res) => {
        setData(res.data);
        const org = res.data.organization;
        setBillingForm({
          billingPlan: org.billingPlan || 'monthly',
          monthlyFee: org.monthlyFee || '',
          setupFee: org.setupFee || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [orgId]);

  const handleLogPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    setPaymentLoading(true);
    try {
      await logTenantPayment(orgId, {
        amount: Number(paymentForm.amount),
        type: paymentForm.type,
        note: paymentForm.note,
        paidAt: paymentForm.paidAt,
      });
      setPaymentForm({ amount: '', type: 'subscription', note: '', paidAt: new Date().toISOString().split('T')[0] });
      setShowPaymentForm(false);
      fetchData();
      showToast('Payment logged successfully!');
    } catch (err) {
      showToast('Failed to log payment', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Remove this payment entry?')) return;
    try {
      await deleteTenantPayment(orgId, paymentId);
      fetchData();
      showToast('Payment removed');
    } catch {
      showToast('Failed to remove payment', 'error');
    }
  };

  const handleSaveBilling = async (e) => {
    e.preventDefault();
    setBillingLoading(true);
    try {
      await updateTenantBilling(orgId, {
        billingPlan: billingForm.billingPlan,
        monthlyFee: Number(billingForm.monthlyFee) || 0,
        setupFee: Number(billingForm.setupFee) || 0,
      });
      fetchData();
      setBillingEditing(false);
      showToast('Billing settings saved!');
    } catch {
      showToast('Failed to save billing', 'error');
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading tenant details...</div>;
  if (!data) return <div style={styles.loading}>Tenant not found</div>;

  const { organization, members, stats } = data;
  const payments = organization.payments || [];
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const isMonthly = organization.billingPlan === 'monthly';

  return (
    <div style={styles.container}>

      {/* Toast */}
      {toast.visible && (
        <div style={{ ...styles.toast, backgroundColor: toast.type === 'error' ? '#dc2626' : '#16a34a' }}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <Link to="/admin/tenants" style={styles.backLink}>← All Tenants</Link>
          <h1 style={styles.orgName}>{organization.name}</h1>
          <p style={styles.orgMeta}>
            Owned by <strong>{organization.ownerId?.name}</strong> ({organization.ownerId?.email}) ·
            Joined {new Date(organization.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span style={{ ...styles.statusBadge, backgroundColor: organization.isActive ? '#dcfce7' : '#fee2e2', color: organization.isActive ? '#16a34a' : '#dc2626' }}>
          {organization.isActive ? '● Active' : '○ Inactive'}
        </span>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Leads', value: stats.totalLeads, color: '#3b82f6' },
          { label: 'Deals', value: stats.totalDeals, color: '#10b981' },
          { label: 'Team Members', value: members.length, color: '#7c3aed' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: '#d97706' },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <p style={styles.statLabel}>{s.label}</p>
            <p style={{ ...styles.statVal, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'billing', 'members'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.activeTab : {}) }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'billing' && payments.length > 0 && (
              <span style={styles.tabBadge}>{payments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={styles.sectionTitle}>Deals by Stage</h3>
            {stats.dealsByStage.length === 0 ? (
              <p style={styles.empty}>No deals yet</p>
            ) : (
              <div style={styles.stageGrid}>
                {stats.dealsByStage.map((s) => (
                  <div key={s._id} style={{ ...styles.stageCard, borderTop: `3px solid ${stageColors[s._id] || '#94a3b8'}` }}>
                    <p style={{ ...styles.stageLabel, color: stageColors[s._id] || '#94a3b8' }}>{s._id}</p>
                    <p style={styles.stageCount}>{s.count} deal{s.count !== 1 ? 's' : ''}</p>
                    <p style={styles.stageAmount}>₹{s.total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.privacyNote}>
              <span>🔒</span>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Individual lead and deal records are private to this tenant. Only aggregate counts are shown here.
              </p>
            </div>
          </div>
        )}

        {/* ── Billing ── */}
        {activeTab === 'billing' && (
          <div>

            {/* Billing Settings */}
            <div style={styles.billingSettingsBox}>
              <div style={styles.billingSettingsHeader}>
                <h3 style={styles.sectionTitle}>Billing Settings</h3>
                <button onClick={() => setBillingEditing(!billingEditing)} style={styles.editBillingBtn}>
                  {billingEditing ? 'Cancel' : '✎ Edit'}
                </button>
              </div>

              {billingEditing ? (
                <form onSubmit={handleSaveBilling} style={styles.billingForm}>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.fieldLabel}>Plan Type</label>
                      <select value={billingForm.billingPlan} onChange={(e) => setBillingForm({ ...billingForm, billingPlan: e.target.value })} style={styles.select}>
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.fieldLabel}>{billingForm.billingPlan === 'monthly' ? 'Monthly Fee (₹)' : 'Annual Fee (₹)'}</label>
                      <input type="number" value={billingForm.monthlyFee} onChange={(e) => setBillingForm({ ...billingForm, monthlyFee: e.target.value })} placeholder="e.g. 7000" style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.fieldLabel}>Setup Fee (₹)</label>
                      <input type="number" value={billingForm.setupFee} onChange={(e) => setBillingForm({ ...billingForm, setupFee: e.target.value })} placeholder="e.g. 3000" style={styles.input} />
                    </div>
                  </div>
                  <button type="submit" disabled={billingLoading} style={styles.saveBtn}>
                    {billingLoading ? 'Saving...' : 'Save Billing Settings'}
                  </button>
                </form>
              ) : (
                <div style={styles.billingDisplay}>
                  <div style={styles.billingItem}>
                    <span style={styles.billingItemLabel}>Plan</span>
                    <span style={styles.billingItemValue}>{isMonthly ? 'Monthly' : 'Annual'}</span>
                  </div>
                  <div style={styles.billingItem}>
                    <span style={styles.billingItemLabel}>{isMonthly ? 'Monthly Fee' : 'Annual Fee'}</span>
                    <span style={{ ...styles.billingItemValue, color: '#2563eb' }}>₹{(organization.monthlyFee || 0).toLocaleString()}</span>
                  </div>
                  <div style={styles.billingItem}>
                    <span style={styles.billingItemLabel}>Setup Fee</span>
                    <span style={{ ...styles.billingItemValue, color: '#7c3aed' }}>₹{(organization.setupFee || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ ...styles.billingItem, borderBottom: 'none' }}>
                    <span style={styles.billingItemLabel}>Total Received</span>
                    <span style={{ ...styles.billingItemValue, color: '#d97706', fontSize: '18px' }}>₹{totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div style={{ marginTop: '24px' }}>
              <div style={styles.paymentHistoryHeader}>
                <h3 style={styles.sectionTitle}>Payment History</h3>
                <button onClick={() => setShowPaymentForm(!showPaymentForm)} style={styles.logPaymentBtn}>
                  {showPaymentForm ? 'Cancel' : '+ Log Payment'}
                </button>
              </div>

              {/* Log Payment Form */}
              {showPaymentForm && (
                <form onSubmit={handleLogPayment} style={styles.paymentForm}>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.fieldLabel}>Amount (₹)</label>
                      <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder={`e.g. ${organization.monthlyFee || 7000}`} style={styles.input} required />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.fieldLabel}>Type</label>
                      <select value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })} style={styles.select}>
                        <option value="subscription">Subscription ({isMonthly ? 'Monthly' : 'Annual'})</option>
                        <option value="setup_fee">Setup Fee (One-time)</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.fieldLabel}>Date Received</label>
                      <input type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} style={styles.input} />
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.fieldLabel}>Note (optional)</label>
                    <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="e.g. March 2026 subscription" style={{ ...styles.input, width: '100%' }} />
                  </div>
                  <button type="submit" disabled={paymentLoading} style={styles.saveBtn}>
                    {paymentLoading ? 'Saving...' : '✓ Save Payment'}
                  </button>
                </form>
              )}

              {/* Payment List */}
              {payments.length === 0 ? (
                <p style={styles.empty}>No payments logged yet.</p>
              ) : (
                <div>
                  {[...payments].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).map((p) => (
                    <div key={p._id} style={styles.paymentItem}>
                      <div style={styles.paymentLeft}>
                        <span style={{ ...styles.paymentTypeBadge, backgroundColor: p.type === 'subscription' ? '#eff6ff' : '#fdf4ff', color: p.type === 'subscription' ? '#2563eb' : '#7c3aed' }}>
                          {p.type === 'subscription' ? (isMonthly ? '📅 Monthly' : '📅 Annual') : '⚡ Setup Fee'}
                        </span>
                        <div>
                          <p style={styles.paymentDate}>{new Date(p.paidAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          {p.note && <p style={styles.paymentNote}>{p.note}</p>}
                        </div>
                      </div>
                      <div style={styles.paymentRight}>
                        <span style={styles.paymentAmount}>₹{p.amount.toLocaleString()}</span>
                        <button onClick={() => handleDeletePayment(p._id)} style={styles.deletePaymentBtn} title="Remove entry">✕</button>
                      </div>
                    </div>
                  ))}
                  <div style={styles.paymentTotal}>
                    <span style={styles.paymentTotalLabel}>Total Received from {organization.name}</span>
                    <span style={styles.paymentTotalValue}>₹{totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Members ── */}
        {activeTab === 'members' && (
          <div>
            <h3 style={styles.sectionTitle}>Team Members</h3>
            {members.length === 0 ? <p style={styles.empty}>No members</p> : members.map((m) => (
              <div key={m._id} style={styles.listItem}>
                <div>
                  <p style={styles.itemName}>{m.name}</p>
                  <p style={styles.itemMeta}>{m.email}</p>
                </div>
                <span style={{ ...styles.badge, backgroundColor: m.role === 'org_admin' ? '#ede9fe' : '#f1f5f9', color: m.role === 'org_admin' ? '#7c3aed' : '#64748b' }}>
                  {m.role === 'org_admin' ? 'Admin' : 'Member'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '28px', maxWidth: '1000px', margin: '0 auto' },
  loading: { padding: '40px', textAlign: 'center', color: '#64748b' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', zIndex: 2000 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  backLink: { fontSize: '13px', color: '#64748b', textDecoration: 'none', display: 'block', marginBottom: '8px' },
  orgName: { margin: '0 0 6px', fontSize: '26px', fontWeight: '700', color: '#0f172a' },
  orgMeta: { margin: 0, fontSize: '13px', color: '#64748b' },
  statusBadge: { padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' },
  statCard: { backgroundColor: 'white', padding: '18px 20px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  statLabel: { margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' },
  statVal: { margin: '6px 0 0', fontSize: '24px', fontWeight: '700' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' },
  tab: { padding: '8px 18px', border: 'none', backgroundColor: 'transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' },
  activeTab: { backgroundColor: 'white', color: '#0f172a', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  tabBadge: { backgroundColor: '#2563eb', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' },
  tabContent: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  sectionTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#0f172a' },
  stageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' },
  stageCard: { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px' },
  stageLabel: { margin: 0, fontSize: '12px', fontWeight: '700' },
  stageCount: { margin: '6px 0 2px', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  stageAmount: { margin: 0, fontSize: '12px', color: '#64748b' },
  privacyNote: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' },
  // Billing
  billingSettingsBox: { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '18px', border: '1px solid #e2e8f0' },
  billingSettingsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  billingDisplay: {},
  billingItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' },
  billingItemLabel: { fontSize: '13px', color: '#64748b' },
  billingItemValue: { fontSize: '15px', fontWeight: '700', color: '#0f172a' },
  editBillingBtn: { padding: '6px 14px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155' },
  billingForm: { display: 'flex', flexDirection: 'column', gap: '12px' },
  // Payment
  paymentHistoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  logPaymentBtn: { padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  paymentForm: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  fieldLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' },
  select: { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', backgroundColor: 'white' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', alignSelf: 'flex-start' },
  paymentItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  paymentLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  paymentTypeBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' },
  paymentDate: { margin: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a' },
  paymentNote: { margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' },
  paymentRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  paymentAmount: { fontSize: '15px', fontWeight: '700', color: '#16a34a' },
  deletePaymentBtn: { background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', borderRadius: '4px' },
  paymentTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 0', marginTop: '4px' },
  paymentTotalLabel: { fontSize: '13px', fontWeight: '600', color: '#64748b' },
  paymentTotalValue: { fontSize: '20px', fontWeight: '800', color: '#d97706' },
  // Members
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  itemName: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  itemMeta: { margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '20px', fontSize: '14px' },
};

export default AdminTenantDetail;