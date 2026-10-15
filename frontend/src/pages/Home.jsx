import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth ? useAuth() : {};

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0 3rem 0' }}>
      {/* Welcome Hero */}
      <div className="inventory-hero" style={{ marginBottom: '2rem' }}>
        <div className="inventory-hero-left">
          <div className="inventory-kicker">
            <span className="kicker-dot">●</span> Portal Hub
          </div>
          <h1 className="inventory-title">
            Welcome, {user?.full_name || 'Team Member'}
          </h1>
          <p className="inventory-subtitle">
            Quick navigation and access to company IT assets, equipment provisioning, and support requests.
          </p>
        </div>

        <div className="inventory-hero-actions">
          <Link to="/dashboard" className="btn-warm-terracotta">
            <span>Open Dashboard →</span>
          </Link>
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="modern-form-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#8b3a04',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              fontWeight: 700,
            }}
          >
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
              {user?.full_name || 'Authenticated User'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="warm-pill warm-pill-assigned" style={{ fontSize: '0.72rem' }}>
                ● {user?.role || 'EMPLOYEE'}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Functional Navigation Cards Grid */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '1.5rem 0 1rem 0' }}>
          Available Workspaces & Services
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Card 1: Dashboard */}
          <div
            className="fleet-card interactive-filter"
            onClick={() => navigate('/dashboard')}
            style={{ padding: '1.25rem' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📊</div>
            <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Operational Dashboard
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              View overview metrics, recent tickets, hardware status, and resolution progress.
            </p>
          </div>

          {/* Card 2: Tickets */}
          <div
            className="fleet-card interactive-filter"
            onClick={() => navigate('/tickets')}
            style={{ padding: '1.25rem' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎫</div>
            <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Support Tickets
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Check ticket queue, track status updates, and view resolutions from the IT team.
            </p>
          </div>

          {/* Card 3: Asset Inventory */}
          <div
            className="fleet-card interactive-filter"
            onClick={() => navigate('/assets')}
            style={{ padding: '1.25rem' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>💻</div>
            <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Hardware & Inventory
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Explore the company device catalog, hardware specifications, and assignments.
            </p>
          </div>

          {/* Card 4: New Ticket */}
          <div
            className="fleet-card interactive-filter"
            onClick={() => navigate('/tickets/create')}
            style={{ padding: '1.25rem' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>➕</div>
            <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Submit New Ticket
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Report technical problems, software bugs, network failures, or access issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
