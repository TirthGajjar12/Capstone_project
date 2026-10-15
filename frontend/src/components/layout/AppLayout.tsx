import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RequestAssetModal from '../assets/RequestAssetModal';

/**
 * AppLayout — wraps all authenticated pages with the warm editorial sidebar + top navigation header.
 */
const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /** Get initials from the user's full name for the avatar. */
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  // Dynamic breadcrumbs based on pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/dashboard') return { section: 'Workspace', page: 'Overview' };
    if (path.startsWith('/tickets/create')) return { section: 'Workspace', page: 'New Ticket' };
    if (path.startsWith('/tickets/assign')) return { section: 'IT Operations', page: 'Assign Tickets' };
    if (path.startsWith('/tickets')) return { section: 'Workspace', page: 'Tickets' };
    if (path === '/inventory/available') return { section: 'TechSupport', page: 'Available Inventory' };
    if (path.startsWith('/assets/create')) return { section: 'Fleet Management', page: 'Provision Asset' };
    if (path.startsWith('/assets')) return { section: 'TechSupport', page: 'Workspace' };
    return { section: 'Workspace', page: 'Overview' };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="app-layout">
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        {/* Brand Logo with Peach Badge */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-badge">
            <span className="brand-badge-letter">IT</span>
          </div>
          <div className="sidebar-brand-text">
            <h2>IT Asset Manager</h2>
            <span>Operations & Support</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Navigation</div>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              Dashboard
            </NavLink>
            <NavLink
              to="/tickets"
              className={({ isActive }) =>
                `sidebar-link${isActive && location.pathname === '/tickets' ? ' active' : ''}`
              }
            >
              <span className="link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
              </span>
              Tickets
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/tickets/assign"
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span className="link-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </span>
                Assign Tickets
              </NavLink>
            )}
            <NavLink
              to="/assets"
              className={({ isActive }) =>
                `sidebar-link${isActive && location.pathname === '/assets' ? ' active' : ''}`
              }
            >
              <span className="link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
              </span>
              Assets
            </NavLink>
            {isStaff && (
              <NavLink
                to="/inventory/available"
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span className="link-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </span>
                Available Inventory
              </NavLink>
            )}
          </div>

          {(isEmployee || isAdmin) && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Actions</div>
              {isEmployee && (
                <>
                  <NavLink
                    to="/tickets/create"
                    className={({ isActive }) =>
                      `sidebar-link${isActive ? ' active' : ''}`
                    }
                  >
                    <span className="link-icon action-icon">➕</span>
                    New Ticket
                  </NavLink>

                  <button
                    type="button"
                    className="sidebar-link sidebar-btn-action"
                    onClick={() => setRequestModalOpen(true)}
                  >
                    <span className="link-icon action-icon">✨</span>
                    Request Equipment
                  </button>
                </>
              )}

              {isAdmin && (
                <NavLink
                  to="/assets/create"
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="link-icon action-icon">📦</span>
                  Add Asset
                </NavLink>
              )}
            </div>
          )}
        </nav>

        {/* User footer card */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name ?? 'User'}</div>
            <div className="sidebar-user-role-badge">{user?.role ?? 'EMPLOYEE'}</div>
          </div>
          <div className="sidebar-user-actions">
            <button
              className="sidebar-theme-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ---- Main Content Wrapper ---- */}
      <div className="main-wrapper">
        {/* Top Navbar matching screenshot */}
        <header className="topbar">
          <div className="topbar-breadcrumbs">
            <span className="breadcrumb-section">{breadcrumbs.section}</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{breadcrumbs.page}</span>
          </div>



          <div className="topbar-right">
            <button
              className="topbar-bell-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="topbar-role-pill">{user?.role ?? 'EMPLOYEE'}</div>
            <div className="topbar-avatar">{initials}</div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Request Asset Modal for Employees */}
      <RequestAssetModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequestSubmitted={() => {
          // If on tickets or assets page, user can view the new ticket
        }}
      />
    </div>
  );
};

export default AppLayout;
