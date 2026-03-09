import React, { useState, useEffect } from 'react';
import { getLeads, createLead, updateLead, deleteLead, convertLeadToDeal, addLeadNote, editLeadNote, deleteLeadNote } from '../services/api';

const statusColors = {
  New: '#007bff',
  Contacted: '#17a2b8',
  Qualified: '#28a745',
  Converted: '#6c757d',
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

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [noteInputs, setNoteInputs] = useState({});
  const [editingNote, setEditingNote] = useState({});
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: 'New' });
  const [convertAmount, setConvertAmount] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmLabel: 'Delete', confirmColor: '#dc3545' });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => { fetchLeads(); }, []);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const openModal = (title, message, onConfirm, options = {}) => setModal({ isOpen: true, title, message, onConfirm, confirmLabel: options.confirmLabel || 'Delete', confirmColor: options.confirmColor || '#dc3545' });
  const closeModal = () => setModal({ isOpen: false, title: '', message: '', onConfirm: null, confirmLabel: 'Delete', confirmColor: '#dc3545' });

  const fetchLeads = async () => {
    try { const response = await getLeads(); setLeads(response.data); }
    catch (error) { console.error('Failed to fetch leads:', error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) { showToast('Please enter a valid email address', 'error'); return; }
    const phoneRegex = /^\d{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) { showToast('Phone number must be exactly 10 digits', 'error'); return; }
    try {
      await createLead(formData);
      setFormData({ name: '', email: '', phone: '', status: 'New' });
      setShowForm(false);
      fetchLeads();
      showToast('Lead created successfully!');
    } catch (error) { showToast('Failed to create lead', 'error'); }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try { await updateLead(leadId, { status: newStatus }); fetchLeads(); showToast('Status updated!'); }
    catch (error) { showToast('Failed to update status', 'error'); }
  };

  const handleDelete = (id) => {
    openModal('Delete Lead', 'This lead and all its notes will be permanently removed. This action cannot be undone.', async () => {
      closeModal();
      try { await deleteLead(id); fetchLeads(); showToast('Lead deleted'); }
      catch (error) { showToast('Failed to delete lead', 'error'); }
    });
  };

  const handleConvert = async (leadId, leadStatus) => {
    const amount = convertAmount[leadId] || 0;

    if (leadStatus !== 'Qualified') {
      openModal(
        'Convert Early?',
        `This lead is still at "${leadStatus}" stage and hasn't been fully qualified yet. Convert to a deal anyway?`,
        async () => {
          closeModal();
          try { await convertLeadToDeal(leadId, amount); fetchLeads(); showToast('Lead converted to deal!'); }
          catch (error) { showToast('Failed to convert lead', 'error'); }
        },
        { confirmLabel: 'Yes, Convert', confirmColor: '#f59e0b' }
      );
      return;
    }

    try { await convertLeadToDeal(leadId, amount); fetchLeads(); showToast('Lead converted to deal!'); }
    catch (error) { showToast('Failed to convert lead', 'error'); }
  };

  const toggleNotes = (leadId) => setExpandedNotes((prev) => ({ ...prev, [leadId]: !prev[leadId] }));

  const handleAddNote = async (leadId) => {
    const text = noteInputs[leadId]?.trim();
    if (!text) return;
    try { await addLeadNote(leadId, text); setNoteInputs((prev) => ({ ...prev, [leadId]: '' })); fetchLeads(); showToast('Note added!'); }
    catch (error) { showToast('Failed to add note', 'error'); }
  };

  const handleStartEdit = (noteId, currentText) => setEditingNote({ id: noteId, text: currentText });

  const handleSaveEdit = async (leadId, noteId) => {
    const text = editingNote.text?.trim();
    if (!text) return;
    try { await editLeadNote(leadId, noteId, text); setEditingNote({}); fetchLeads(); showToast('Note updated!'); }
    catch (error) { showToast('Failed to save edit', 'error'); }
  };

  const handleDeleteNote = (leadId, noteId) => {
    openModal('Delete Note', 'Are you sure you want to delete this note? This cannot be undone.', async () => {
      closeModal();
      try { await deleteLeadNote(leadId, noteId); fetchLeads(); showToast('Note deleted'); }
      catch (error) { showToast('Failed to delete note', 'error'); }
    });
  };

  return (
    <div style={styles.container}>
      <ConfirmModal isOpen={modal.isOpen} title={modal.title} message={modal.message} confirmLabel={modal.confirmLabel} confirmColor={modal.confirmColor} onConfirm={modal.onConfirm} onCancel={closeModal} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <div style={styles.header}>
        <h1>Leads</h1>
        <button onClick={() => setShowForm(!showForm)} style={styles.addButton}>{showForm ? 'Cancel' : '+ Add Lead'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={styles.input} />
          <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={styles.input} />
          <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={styles.input} />
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={styles.input}>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
          </select>
          <button type="submit" style={styles.submitButton}>Create Lead</button>
        </form>
      )}

      <div style={styles.leadsContainer}>
        {leads.length === 0 ? <p>No leads found. Create your first lead!</p> : leads.map((lead) => (
          <div key={lead._id} style={styles.leadCard}>
            <h3 style={styles.leadName}>{lead.name}</h3>
            <p style={styles.infoText}>Email: {lead.email || 'N/A'}</p>
            <p style={styles.infoText}>Phone: {lead.phone || 'N/A'}</p>
            <span style={{ ...styles.statusBadge, backgroundColor: statusColors[lead.status] || '#6c757d' }}>{lead.status}</span>

            {lead.status === 'Converted' ? (
              <div style={styles.convertedBanner}>
                <span style={styles.convertedIcon}>✓</span>
                <span>Converted to Deal — lead is now read-only</span>
              </div>
            ) : (
              <>
                <div style={styles.statusSection}>
                  <label style={styles.label}>Update Status:</label>
                  <select value={lead.status} onChange={(e) => handleStatusChange(lead._id, e.target.value)} style={styles.statusSelect}>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                  </select>
                </div>
                <div style={styles.convertSection}>
                  <input type="number" placeholder="Deal amount" value={convertAmount[lead._id] || ''} onChange={(e) => setConvertAmount({ ...convertAmount, [lead._id]: e.target.value })} style={styles.amountInput} />
                  <button onClick={() => handleConvert(lead._id, lead.status)} style={styles.convertButton}>Convert to Deal</button>
                </div>
              </>
            )}

            <div style={styles.notesSection}>
              <button onClick={() => toggleNotes(lead._id)} style={styles.notesToggleBtn}>
                {expandedNotes[lead._id] ? '▲ Hide Notes' : '▼ Activity Notes'}
                {lead.notes?.length > 0 && <span style={styles.notesBadge}>{lead.notes.length}</span>}
              </button>

              {expandedNotes[lead._id] && (
                <div style={styles.notesBody}>
                  {!lead.notes?.length ? (
                    <p style={styles.noNotesText}>No notes yet. Log where you met them, what was discussed, next steps, etc.</p>
                  ) : (
                    lead.notes.map((note) => (
                      <div key={note._id} style={styles.noteItem}>
                        <div style={styles.noteTopRow}>
                          <span style={styles.noteStatusTag}>{note.statusAtTime || lead.status}</span>
                          <span style={styles.noteDate}>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        {editingNote.id === note._id ? (
                          <div>
                            <textarea rows={4} value={editingNote.text} onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })} style={styles.noteTextarea} autoFocus />
                            <div style={styles.editActions}>
                              <button onClick={() => handleSaveEdit(lead._id, note._id)} style={styles.saveEditBtn}>✓ Save</button>
                              <button onClick={() => setEditingNote({})} style={styles.cancelEditBtn}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p style={styles.noteText}>{note.text}</p>
                            <div style={styles.noteActions}>
                              <button onClick={() => handleStartEdit(note._id, note.text)} style={styles.editNoteBtn}>✎ Edit</button>
                              <button onClick={() => handleDeleteNote(lead._id, note._id)} style={styles.deleteNoteBtn}>✕ Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {lead.status !== 'Converted' ? (
                    <div style={styles.addNoteArea}>
                      <textarea rows={3} placeholder={`Add a note for this lead's "${lead.status}" stage...`} value={noteInputs[lead._id] || ''} onChange={(e) => setNoteInputs({ ...noteInputs, [lead._id]: e.target.value })} style={styles.noteTextarea} />
                      <button onClick={() => handleAddNote(lead._id)} style={styles.addNoteBtn}>Save Note</button>
                    </div>
                  ) : (
                    <p style={styles.convertedNotesMsg}>📋 This lead has been converted. Add new notes on the Deal instead.</p>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => handleDelete(lead._id)} style={styles.deleteButton}>Delete Lead</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  addButton: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  form: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '10px', margin: '5px 0', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
  submitButton: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
  leadsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  leadCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  leadName: { margin: '0 0 8px', fontSize: '18px' },
  infoText: { margin: '4px 0', fontSize: '14px', color: '#555' },
  statusBadge: { display: 'inline-block', marginTop: '8px', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '13px', fontWeight: 'bold' },
  statusSection: { marginTop: '14px', marginBottom: '8px' },
  label: { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' },
  statusSelect: { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  convertSection: { marginTop: '10px', display: 'flex', gap: '10px' },
  amountInput: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
  convertButton: { padding: '8px 15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' },
  notesSection: { marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' },
  notesToggleBtn: { background: 'none', border: '1px solid #007bff', color: '#007bff', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  notesBadge: { backgroundColor: '#007bff', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' },
  notesBody: { marginTop: '12px' },
  noNotesText: { fontSize: '13px', color: '#888', fontStyle: 'italic', marginBottom: '10px' },
  noteItem: { backgroundColor: '#f8f9ff', border: '1px solid #e0e7ff', borderLeft: '4px solid #007bff', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px' },
  noteTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  noteStatusTag: { backgroundColor: '#e7f0ff', color: '#007bff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' },
  noteDate: { fontSize: '11px', color: '#aaa' },
  noteText: { margin: '0 0 8px', fontSize: '13px', color: '#333', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  noteActions: { display: 'flex', gap: '6px', marginTop: '4px' },
  editNoteBtn: { background: 'none', border: '1px solid #cce5ff', color: '#007bff', cursor: 'pointer', fontSize: '12px', padding: '3px 10px', borderRadius: '4px' },
  deleteNoteBtn: { background: 'none', border: '1px solid #ffcccc', color: '#dc3545', cursor: 'pointer', fontSize: '12px', padding: '3px 10px', borderRadius: '4px' },
  editActions: { display: 'flex', gap: '8px', marginTop: '6px' },
  saveEditBtn: { padding: '5px 14px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  cancelEditBtn: { padding: '5px 14px', backgroundColor: '#f8f9fa', color: '#555', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  addNoteArea: { marginTop: '12px' },
  noteTextarea: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5' },
  addNoteBtn: { marginTop: '8px', padding: '8px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  deleteButton: { marginTop: '14px', padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' },
  convertedBanner: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', marginTop: '12px', fontSize: '13px', color: '#16a34a', fontWeight: '600' },
  convertedIcon: { fontSize: '16px' },
  convertedNotesMsg: { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '10px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', textAlign: 'center' },
};

export default Leads;