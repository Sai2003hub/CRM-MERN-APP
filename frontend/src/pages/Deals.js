import React, { useState, useEffect, useContext } from 'react';
import { getDeals, updateDeal, deleteDeal, addDealNote, editDealNote, deleteDealNote, getDealInviteLink } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const stageColors = {
  Open: '#007bff',
  Proposal: '#17a2b8',
  Negotiation: '#ffc107',
  Won: '#28a745',
  Lost: '#dc3545',
};

const inviteStatusConfig = {
  not_invited: { label: 'No Invite', color: '#94a3b8', bg: '#f1f5f9' },
  pending:     { label: 'Invite Sent', color: '#d97706', bg: '#fffbeb' },
  accepted:    { label: 'Tenant Active ✓', color: '#16a34a', bg: '#f0fdf4' },
};

const ConfirmModal = ({ isOpen, title, message, confirmLabel = 'Delete', confirmColor = '#dc3545', onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.iconWrap}>
          <span style={{ ...modalStyles.icon, background: confirmColor + '18', color: confirmColor }}>🗑</span>
        </div>
        <h3 style={modalStyles.title}>{title}</h3>
        <p style={modalStyles.message}>{message}</p>
        <div style={modalStyles.actions}>
          <button onClick={onCancel} style={modalStyles.cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={{ ...modalStyles.confirmBtn, background: confirmColor }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type, visible }) => {
  if (!visible) return null;
  const bg = type === 'error' ? '#dc3545' : '#28a745';
  const icon = type === 'error' ? '✕' : '✓';
  return (
    <div style={{ ...toastStyles.toast, background: bg }}>
      <span style={toastStyles.icon}>{icon}</span>
      {message}
    </div>
  );
};

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  box: { background: 'white', borderRadius: '16px', padding: '32px 28px 24px', maxWidth: '380px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' },
  iconWrap: { marginBottom: '16px' },
  icon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', fontSize: '22px' },
  title: { margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#1a1a1a' },
  message: { margin: '0 0 24px', fontSize: '14px', color: '#666', lineHeight: '1.5' },
  actions: { display: 'flex', gap: '10px', justifyContent: 'center' },
  cancelBtn: { flex: 1, padding: '10px', background: '#f5f5f5', color: '#333', border: '1px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  confirmBtn: { flex: 1, padding: '10px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
};

const toastStyles = {
  toast: { position: 'fixed', bottom: '24px', right: '24px', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 2000 },
  icon: { fontSize: '16px', fontWeight: '700' },
};

const Deals = () => {
  const { isSuperAdmin } = useContext(AuthContext);
  const [deals, setDeals] = useState([]);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [noteInputs, setNoteInputs] = useState({});
  const [editingNote, setEditingNote] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [copyingInvite, setCopyingInvite] = useState({});

  useEffect(() => { fetchDeals(); }, []);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const openModal = (title, message, onConfirm) => setModal({ isOpen: true, title, message, onConfirm });
  const closeModal = () => setModal({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchDeals = async () => {
    try {
      const response = await getDeals();
      setDeals(response.data);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    }
  };

  const handleStageChange = async (id, newStage) => {
    try { await updateDeal(id, { stage: newStage }); fetchDeals(); showToast('Stage updated!'); }
    catch (error) { showToast('Failed to update stage', 'error'); }
  };

  const handleFieldChange = async (id, field, value) => {
    try { await updateDeal(id, { [field]: value }); fetchDeals(); showToast('Deal updated!'); }
    catch (error) { showToast('Failed to update deal', 'error'); }
  };

  const handleDelete = (id) => {
    openModal('Delete Deal', 'This deal and all its notes will be permanently removed.', async () => {
      closeModal();
      try { await deleteDeal(id); fetchDeals(); showToast('Deal deleted'); }
      catch (error) { showToast('Failed to delete deal', 'error'); }
    });
  };

  const handleCopyInvite = async (dealId) => {
    setCopyingInvite((prev) => ({ ...prev, [dealId]: true }));
    try {
      const res = await getDealInviteLink(dealId);
      await navigator.clipboard.writeText(res.data.inviteUrl);
      showToast('Invite link copied to clipboard!');
    } catch (error) {
      showToast('Failed to get invite link', 'error');
    } finally {
      setCopyingInvite((prev) => ({ ...prev, [dealId]: false }));
    }
  };

  const toggleNotes = (dealId) => setExpandedNotes((prev) => ({ ...prev, [dealId]: !prev[dealId] }));

  const handleAddNote = async (dealId) => {
    const text = noteInputs[dealId]?.trim();
    if (!text) return;
    try { await addDealNote(dealId, text); setNoteInputs((prev) => ({ ...prev, [dealId]: '' })); fetchDeals(); showToast('Note added!'); }
    catch (error) { showToast('Failed to add note', 'error'); }
  };

  const handleStartEdit = (noteId, currentText) => setEditingNote({ id: noteId, text: currentText });

  const handleSaveEdit = async (dealId, noteId) => {
    const text = editingNote.text?.trim();
    if (!text) return;
    try { await editDealNote(dealId, noteId, text); setEditingNote({}); fetchDeals(); showToast('Note updated!'); }
    catch (error) { showToast('Failed to save edit', 'error'); }
  };

  const handleDeleteNote = (dealId, noteId) => {
    openModal('Delete Note', 'Are you sure you want to delete this note?', async () => {
      closeModal();
      try { await deleteDealNote(dealId, noteId); fetchDeals(); showToast('Note deleted'); }
      catch (error) { showToast('Failed to delete note', 'error'); }
    });
  };

  return (
    <div style={styles.container}>
      <ConfirmModal isOpen={modal.isOpen} title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={closeModal} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <h1 style={styles.pageTitle}>Deals</h1>

      <div style={styles.dealsContainer}>
        {deals.length === 0 ? (
          <p>No deals found. Convert some leads to deals!</p>
        ) : deals.map((deal) => {
          const inviteConfig = inviteStatusConfig[deal.inviteStatus] || inviteStatusConfig.not_invited;
          const isMonthly = deal.subscriptionType === 'monthly';

          return (
            <div key={deal._id} style={styles.dealCard}>

              <h3 style={styles.dealTitle}>{deal.title}</h3>

              <div style={styles.revenueBox}>
                <div style={styles.revenueRow}>
                  <span style={styles.revenueLabel}>Subscription</span>
                  <span style={styles.revenueValue}>
                    ₹{(deal.amount || 0).toLocaleString()}
                    <span style={{ ...styles.subscriptionBadge, backgroundColor: isMonthly ? '#eff6ff' : '#fdf4ff', color: isMonthly ? '#2563eb' : '#9333ea' }}>
                      {isMonthly ? '/month' : '/year'}
                    </span>
                  </span>
                </div>
                {(deal.setupFee > 0) && (
                  <div style={styles.revenueRow}>
                    <span style={styles.revenueLabel}>Setup Fee</span>
                    <span style={{ ...styles.revenueValue, color: '#64748b' }}>₹{deal.setupFee.toLocaleString()} <span style={styles.oneTimeTag}>one-time</span></span>
                  </div>
                )}
              </div>

              <div style={styles.stageSection}>
                <span style={{ ...styles.stageBadge, backgroundColor: stageColors[deal.stage] || '#6c757d' }}>
                  {deal.stage}
                </span>
              </div>

              {/* Invite section — superadmin only, shown on Won deals */}
              {isSuperAdmin && deal.stage === 'Won' && deal.inviteStatus && (
                <div style={styles.inviteSection}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ ...styles.inviteStatusBadge, backgroundColor: inviteConfig.bg, color: inviteConfig.color }}>
                      {inviteConfig.label}
                    </span>
                    {deal.inviteStatus === 'pending' && (
                      <button onClick={() => handleCopyInvite(deal._id)} disabled={copyingInvite[deal._id]} style={styles.copyInviteBtn}>
                        {copyingInvite[deal._id] ? 'Getting link...' : '📋 Copy Invite Link'}
                      </button>
                    )}
                    {deal.inviteStatus === 'accepted' && (
                      <span style={styles.acceptedNote}>{deal.invitedName} has joined ✓</span>
                    )}
                  </div>
                  {deal.invitedEmail && deal.inviteStatus !== 'not_invited' && (
                    <p style={styles.invitedEmailText}>Invited: {deal.invitedName} ({deal.invitedEmail})</p>
                  )}
                </div>
              )}

              <div style={styles.controls}>
                <label style={styles.fieldLabel}>Stage</label>
                <select value={deal.stage} onChange={(e) => handleStageChange(deal._id, e.target.value)} style={styles.select}>
                  <option value="Open">Open</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>

                <label style={styles.fieldLabel}>Subscription Type</label>
                <select
                  value={deal.subscriptionType || 'monthly'}
                  onChange={(e) => handleFieldChange(deal._id, 'subscriptionType', e.target.value)}
                  style={styles.select}
                >
                  <option value="monthly">Monthly (contributes to MRR)</option>
                  <option value="annual">Annual (contributes to ARR)</option>
                </select>

                <label style={styles.fieldLabel}>Subscription Amount (₹)</label>
                <input
                  type="number"
                  key={deal._id + '-sub-' + deal.amount}
                  defaultValue={deal.amount || ''}
                  placeholder="e.g. 5000"
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== deal.amount) {
                      handleFieldChange(deal._id, 'amount', val);
                    }
                  }}
                  style={styles.input}
                />

                <label style={styles.fieldLabel}>Setup Fee (₹) <span style={styles.optionalTag}>optional</span></label>
                <input
                  type="number"
                  key={deal._id + '-setup-' + deal.setupFee}
                  defaultValue={deal.setupFee || ''}
                  placeholder="e.g. 20000 (0 if none)"
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (val !== (deal.setupFee || 0)) {
                      handleFieldChange(deal._id, 'setupFee', val);
                    }
                  }}
                  style={styles.input}
                />
              </div>

              <div style={styles.notesSection}>
                <button onClick={() => toggleNotes(deal._id)} style={styles.notesToggleBtn}>
                  {expandedNotes[deal._id] ? '▲ Hide Notes' : '▼ Activity Notes'}
                  {deal.notes?.length > 0 && <span style={styles.notesBadge}>{deal.notes.length}</span>}
                </button>

                {expandedNotes[deal._id] && (
                  <div style={styles.notesBody}>
                    {!deal.notes?.length ? (
                      <p style={styles.noNotesText}>No notes yet.</p>
                    ) : (
                      deal.notes.map((note) => (
                        <div key={note._id} style={styles.noteItem}>
                          <div style={styles.noteTopRow}>
                            <span style={{ ...styles.noteStageTag, backgroundColor: (stageColors[note.stageAtTime] || '#6c757d') + '22', color: stageColors[note.stageAtTime] || '#6c757d' }}>
                              {note.stageAtTime || deal.stage}
                            </span>
                            <span style={styles.noteDate}>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          {editingNote.id === note._id ? (
                            <div>
                              <textarea rows={4} value={editingNote.text} onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })} style={styles.noteTextarea} autoFocus />
                              <div style={styles.editActions}>
                                <button onClick={() => handleSaveEdit(deal._id, note._id)} style={styles.saveEditBtn}>✓ Save</button>
                                <button onClick={() => setEditingNote({})} style={styles.cancelEditBtn}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p style={styles.noteText}>{note.text}</p>
                              <div style={styles.noteActions}>
                                <button onClick={() => handleStartEdit(note._id, note.text)} style={styles.editNoteBtn}>✎ Edit</button>
                                <button onClick={() => handleDeleteNote(deal._id, note._id)} style={styles.deleteNoteBtn}>✕ Delete</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div style={styles.addNoteArea}>
                      <textarea
                        rows={3}
                        placeholder={'Add a note for the "' + deal.stage + '" stage...'}
                        value={noteInputs[deal._id] || ''}
                        onChange={(e) => setNoteInputs({ ...noteInputs, [deal._id]: e.target.value })}
                        style={styles.noteTextarea}
                      />
                      <button onClick={() => handleAddNote(deal._id)} style={styles.addNoteBtn}>Save Note</button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => handleDelete(deal._id)} style={styles.deleteButton}>Delete</button>
              <p style={styles.date}>Created: {new Date(deal.createdAt).toLocaleDateString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  pageTitle: { margin: '0 0 20px', fontSize: '26px', fontWeight: '700', color: '#0f172a' },
  dealsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  dealCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  dealTitle: { margin: '0 0 12px', fontSize: '17px', fontWeight: '700', color: '#0f172a' },
  revenueBox: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' },
  revenueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  revenueLabel: { fontSize: '12px', color: '#64748b', fontWeight: '500' },
  revenueValue: { fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' },
  subscriptionBadge: { fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px' },
  oneTimeTag: { fontSize: '10px', color: '#94a3b8', fontWeight: '500', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '8px' },
  stageSection: { margin: '12px 0' },
  stageBadge: { display: 'inline-block', padding: '5px 15px', borderRadius: '20px', color: 'white', fontSize: '13px', fontWeight: '700' },
  inviteSection: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' },
  inviteStatusBadge: { fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' },
  copyInviteBtn: { padding: '5px 12px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  acceptedNote: { fontSize: '12px', color: '#16a34a', fontWeight: '600' },
  invitedEmailText: { margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' },
  controls: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' },
  fieldLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '4px' },
  optionalTag: { fontWeight: '400', color: '#94a3b8', textTransform: 'none', letterSpacing: '0' },
  select: { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#334155', backgroundColor: 'white' },
  input: { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#334155' },
  notesSection: { marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' },
  notesToggleBtn: { background: 'none', border: '1px solid #17a2b8', color: '#17a2b8', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  notesBadge: { backgroundColor: '#17a2b8', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' },
  notesBody: { marginTop: '12px' },
  noNotesText: { fontSize: '13px', color: '#888', fontStyle: 'italic', marginBottom: '10px' },
  noteItem: { backgroundColor: '#f0faff', border: '1px solid #d0eeff', borderLeft: '4px solid #17a2b8', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px' },
  noteTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  noteStageTag: { fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' },
  noteDate: { fontSize: '11px', color: '#aaa' },
  noteText: { margin: '0 0 8px', fontSize: '13px', color: '#333', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  noteActions: { display: 'flex', gap: '6px', marginTop: '4px' },
  editNoteBtn: { background: 'none', border: '1px solid #b3e0eb', color: '#17a2b8', cursor: 'pointer', fontSize: '12px', padding: '3px 10px', borderRadius: '4px' },
  deleteNoteBtn: { background: 'none', border: '1px solid #ffcccc', color: '#dc3545', cursor: 'pointer', fontSize: '12px', padding: '3px 10px', borderRadius: '4px' },
  editActions: { display: 'flex', gap: '8px', marginTop: '6px' },
  saveEditBtn: { padding: '5px 14px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  cancelEditBtn: { padding: '5px 14px', backgroundColor: '#f8f9fa', color: '#555', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  addNoteArea: { marginTop: '12px' },
  noteTextarea: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5' },
  addNoteBtn: { marginTop: '8px', padding: '8px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  deleteButton: { marginTop: '14px', padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' },
  date: { marginTop: '10px', fontSize: '12px', color: '#6c757d' },
};

export default Deals;