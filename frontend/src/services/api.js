import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Attach JWT token to every outgoing request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect suspended tenants to /suspended page on every 403
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.message?.includes('suspended')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/suspended';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const getInviteInfo = (token) => API.get(`/auth/invite-info/${token}`);
export const registerViaInvite = (data) => API.post('/auth/register-invite', data);

// ─── Leads ───────────────────────────────────────────────────────────────────
export const getLeads = () => API.get('/leads');
export const createLead = (data) => API.post('/leads', data);
export const updateLead = (id, data) => API.put(`/leads/${id}`, data);
export const deleteLead = (id) => API.delete(`/leads/${id}`);
export const addLeadNote = (id, text) => API.post(`/leads/${id}/notes`, { text });
export const editLeadNote = (leadId, noteId, text) => API.put(`/leads/${leadId}/notes/${noteId}`, { text });
export const deleteLeadNote = (leadId, noteId) => API.delete(`/leads/${leadId}/notes/${noteId}`);

// ─── Deals ───────────────────────────────────────────────────────────────────
export const getDeals = () => API.get('/deals');
export const convertLeadToDeal = (leadId, amount) => API.post(`/deals/convert/${leadId}`, { amount });
export const updateDeal = (id, data) => API.put(`/deals/${id}`, data);
export const deleteDeal = (id) => API.delete(`/deals/${id}`);
export const addDealNote = (id, text) => API.post(`/deals/${id}/notes`, { text });
export const editDealNote = (dealId, noteId, text) => API.put(`/deals/${dealId}/notes/${noteId}`, { text });
export const deleteDealNote = (dealId, noteId) => API.delete(`/deals/${dealId}/notes/${noteId}`);
export const getDashboardStats = () => API.get('/deals/stats/dashboard');
export const getDealInviteLink = (dealId) => API.get(`/deals/${dealId}/invite`);

// ─── Superadmin ──────────────────────────────────────────────────────────────
export const getAdminStats = () => API.get('/admin/stats');
export const getAllTenants = () => API.get('/admin/tenants');
export const getTenantDetails = (orgId) => API.get(`/admin/tenants/${orgId}`);
export const toggleTenantStatus = (orgId) => API.patch(`/admin/tenants/${orgId}/toggle`);
export const deleteTenant = (orgId) => API.delete(`/admin/tenants/${orgId}`);
export const logTenantPayment = (orgId, data) => API.post(`/admin/tenants/${orgId}/payments`, data);
export const deleteTenantPayment = (orgId, paymentId) => API.delete(`/admin/tenants/${orgId}/payments/${paymentId}`);
export const updateTenantBilling = (orgId, data) => API.patch(`/admin/tenants/${orgId}/billing`, data);

export default API;