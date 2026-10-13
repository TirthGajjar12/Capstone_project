import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const navigate = useNavigate();
  const { user: authUser, logout: authLogout } = useAuth ? useAuth() : {};

  // Read from auth context
  const user = authUser;

  const handleLogout = () => {
    if (authLogout) {
      authLogout();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #0f172a)', color: 'var(--text-primary, #f8fafc)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.75rem',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border, #334155)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🖥️</span>
            <div>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>IT Asset Manager</h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>Dashboard & Testing Home</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border, #475569)',
              background: 'transparent',
              color: '#f87171',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Log Out
          </button>
        </header>

        {/* User Status Card */}
        <div style={{
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border, #334155)',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>
                Hello, {user?.full_name || 'Authenticated User'}! 👋
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
                Successfully authenticated via Login/Signup
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            background: 'var(--bg-input, #0f172a)',
            borderRadius: '8px',
            border: '1px solid var(--border, #334155)'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.05em' }}>Email</span>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600 }}>{user?.email || 'Not specified'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.05em' }}>Role</span>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: '#38bdf8' }}>{user?.role || 'EMPLOYEE'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.05em' }}>Employee ID</span>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600 }}>{user?.employee_id || 'EMP-101'}</p>
            </div>
          </div>
        </div>

        {/* Dummy Quick Stats */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary, #94a3b8)' }}>Testing Overview</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{ padding: '1.25rem', background: 'var(--bg-card, #1e293b)', borderRadius: '10px', border: '1px solid var(--border, #334155)' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.25rem' }}>12</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>Assigned Assets</p>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--bg-card, #1e293b)', borderRadius: '10px', border: '1px solid var(--border, #334155)' }}>
            <span style={{ fontSize: '1.5rem' }}>🎫</span>
            <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.25rem' }}>3</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>Open Tickets</p>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--bg-card, #1e293b)', borderRadius: '10px', border: '1px solid var(--border, #334155)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.25rem' }}>4h SLA</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>Avg. Response</p>
          </div>
          <div style={{ padding: '1.25rem', background: 'var(--bg-card, #1e293b)', borderRadius: '10px', border: '1px solid var(--border, #334155)' }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.25rem' }}>98%</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>Uptime</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default HomePage;
