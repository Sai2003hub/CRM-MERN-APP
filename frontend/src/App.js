import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import AdminDashboard from './pages/AdminDashboard';
import AdminTenants from './pages/AdminTenants';
import AdminTenantDetail from './pages/AdminTenantDetail';


const AdminRoute = ({ children }) => {
  const { isAuthenticated, isSuperAdmin } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const OrgRoute = ({ children }) => {
  const { isAuthenticated, hasOrg } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!hasOrg) return <Navigate to="/admin" />;
  return children;
};

const LoginRoute = ({ children }) => {
  const { isAuthenticated, isSuperAdmin } = useContext(AuthContext);
  if (isAuthenticated) return <Navigate to={isSuperAdmin ? '/admin' : '/dashboard'} />;
  return children;
};

// Invite links must always render the register page regardless of auth state
const RegisterRoute = ({ children }) => {
  const { isAuthenticated, isSuperAdmin } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  if (inviteToken) return children;
  if (isAuthenticated) return <Navigate to={isSuperAdmin ? '/admin' : '/dashboard'} />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />
            <Route path="/register" element={<RegisterRoute><Register /></RegisterRoute>} />

            {/* CRM routes — requires login and an organization */}
            <Route path="/dashboard" element={<OrgRoute><Dashboard /></OrgRoute>} />
            <Route path="/leads" element={<OrgRoute><Leads /></OrgRoute>} />
            <Route path="/deals" element={<OrgRoute><Deals /></OrgRoute>} />

            {/* Admin routes — superadmin only */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/tenants" element={<AdminRoute><AdminTenants /></AdminRoute>} />
            <Route path="/admin/tenants/:orgId" element={<AdminRoute><AdminTenantDetail /></AdminRoute>} />

            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;