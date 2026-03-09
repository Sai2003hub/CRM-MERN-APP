import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, isSuperAdmin, hasOrg, user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>

        <div style={styles.left}>
          <Link to={isSuperAdmin ? '/admin' : '/dashboard'} style={styles.logo}>
            Mini CRM
          </Link>
          {isSuperAdmin && (
            <span style={styles.adminBadge}>SUPER ADMIN</span>
          )}
          {hasOrg && user?.organizationName && (
            <span style={styles.orgBadge}>{user.organizationName}</span>
          )}
        </div>

        <div style={styles.links}>

          {hasOrg && (
            <>
              <Link to="/dashboard" style={{ ...styles.link, ...(isActive('/dashboard') ? styles.activeLink : {}) }}>
                Dashboard
              </Link>
              <Link to="/leads" style={{ ...styles.link, ...(isActive('/leads') ? styles.activeLink : {}) }}>
                Leads
              </Link>
              <Link to="/deals" style={{ ...styles.link, ...(isActive('/deals') ? styles.activeLink : {}) }}>
                Deals
              </Link>
            </>
          )}

          {isSuperAdmin && hasOrg && (
            <div style={styles.divider} />
          )}

          {isSuperAdmin && (
            <>
              <Link to="/admin" style={{ ...styles.link, ...styles.adminLink, ...(isActive('/admin') ? styles.activeAdminLink : {}) }}>
                Admin
              </Link>
              <Link to="/admin/tenants" style={{ ...styles.link, ...styles.adminLink, ...(isActive('/admin/tenants') ? styles.activeAdminLink : {}) }}>
                Tenants
              </Link>
            </>
          )}

          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.name}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>

        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: { backgroundColor: '#1a1f2e', padding: '0', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' },
  left: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { color: 'white', fontSize: '20px', fontWeight: '700', textDecoration: 'none', letterSpacing: '-0.3px' },
  adminBadge: { backgroundColor: '#f59e0b', color: '#1a1f2e', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.5px' },
  orgBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' },
  links: { display: 'flex', gap: '4px', alignItems: 'center' },
  divider: { width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 8px' },
  link: { color: '#94a3b8', textDecoration: 'none', fontSize: '14px', padding: '6px 14px', borderRadius: '6px', transition: 'all 0.2s', fontWeight: '500' },
  activeLink: { color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
  adminLink: { color: '#fbbf24' },
  activeAdminLink: { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)' },
  userName: { color: '#cbd5e1', fontSize: '13px', fontWeight: '500' },
  logoutButton: { backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
};

export default Navbar;
