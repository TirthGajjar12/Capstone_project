import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * AppLayout — wraps all authenticated pages with a sidebar + content area.
 * The <Outlet /> renders the matched child route.
 */
const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="app-layout">
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🖥️</div>
          <div>
            <h2>IT Asset Mgr</h2>
            <span>v1.0.0</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Main</div>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="link-icon">📊</span>
              Dashboard
            </NavLink>
            <NavLink
              to="/tickets"
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="link-icon">🎫</span>
              Tickets
            </NavLink>
            <NavLink
              to="/assets"
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="link-icon">💻</span>
              Assets
            </NavLink>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Actions</div>
            {user?.role === 'EMPLOYEE' && (
              <NavLink
                to="/tickets/create"
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span className="link-icon">➕</span>
                New Ticket
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/assets/create"
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span className="link-icon">📦</span>
                Add Asset
              </NavLink>
            )}
          </div>
        </nav>

        {/* User footer */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name ?? 'User'}</div>
            <div className="sidebar-user-role">{user?.role ?? '—'}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
