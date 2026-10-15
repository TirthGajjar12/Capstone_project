import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ticketService, assetService } from '../../services/ticketService';
import { Ticket, Asset } from '../../types';
import RequestAssetModal from '../assets/RequestAssetModal';

interface SlaData {
  total_tickets: number;
  resolved_tickets: number;
  open_tickets: number;
  breached_tickets: number;
  sla_compliance_rate_pct: number;
  avg_resolution_time_hours: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [slaData, setSlaData] = useState<SlaData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketData, assetData] = await Promise.all([
          ticketService.getAll().catch(() => []),
          assetService.getAll().catch(() => []),
        ]);
        setTickets(ticketData);
        setAssets(assetData);

        // Fetch real SLA report if staff
        if (isStaff) {
          try {
            const res = await api.get('/reports/sla');
            setSlaData(res.data);
          } catch {
            setSlaData(null);
          }
        }
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user, isStaff]);

  // Real Counts
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const assignedCount = tickets.filter((t) => t.status === 'ASSIGNED').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const totalTickets = tickets.length;
  const totalAssets = assets.length;
  const stockCount = assets.filter((a) => a.status === 'AVAILABLE').length;

  // Real Priority distribution
  const criticalCount = tickets.filter((t) => t.priority === 'CRITICAL').length;
  const highCount = tickets.filter((t) => t.priority === 'HIGH').length;
  const mediumCount = tickets.filter((t) => t.priority === 'MEDIUM').length;
  const lowCount = tickets.filter((t) => t.priority === 'LOW').length;

  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 100;
  const complianceRate = slaData ? Math.round(slaData.sla_compliance_rate_pct) : resolutionRate;

  // Recent tickets (latest 4)
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  // Active hardware assigned to this specific user (for employee view)
  const assignedHardware = assets.find(
    (a) =>
      a.assigned_to_id === user?.id ||
      (typeof a.assigned_to === 'object' && a.assigned_to !== null && (a.assigned_to as any).id === user?.id)
  );

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'User';
  const roleLabel =
    user?.role === 'ADMIN'
      ? 'System Administrator'
      : user?.role === 'SUPPORT'
      ? 'IT Support Specialist'
      : 'Employee Portal';

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'RESOLVED') return <span className="warm-pill warm-pill-resolved">● RESOLVED</span>;
    if (s === 'CLOSED') return <span className="warm-pill warm-pill-closed">● CLOSED</span>;
    if (s === 'IN_PROGRESS') return <span className="warm-pill warm-pill-progress">● IN PROGRESS</span>;
    if (s === 'ASSIGNED') return <span className="warm-pill warm-pill-assigned">● ASSIGNED</span>;
    return <span className="warm-pill warm-pill-open">● OPEN</span>;
  };

  return (
    <div className="dashboard-container">
      {/* ==================== 1. TOP BANNER / GREETING ==================== */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-kicker">
            <span className="dash-kicker-role">{roleLabel}</span>
            <span className="dash-kicker-dot">●</span>
            <span className="dash-kicker-user">{user?.email}</span>
          </div>
          <h1 className="dash-title">Welcome, {firstName}</h1>
          <p className="dash-subtitle">
            {isEmployee
              ? 'Track your assigned hardware and support requests in one place.'
              : user?.role === 'SUPPORT'
              ? 'Triage support tickets, resolve user issues, and allocate available inventory.'
              : 'Complete IT administrative oversight: hardware inventory, user accounts, and SLA performance.'}
          </p>
        </div>

        <div className="dash-hero-actions">
          {/* Employee Actions */}
          {isEmployee && (
            <>
              <button
                type="button"
                className="btn-warm-secondary"
                onClick={() => setRequestModalOpen(true)}
              >
                <span>✨ Request Equipment</span>
              </button>
              <Link to="/tickets/create" className="btn-warm-terracotta">
                <span>+ New Ticket</span>
              </Link>
            </>
          )}

          {/* Support Actions */}
          {user?.role === 'SUPPORT' && (
            <>
              <Link to="/tickets" className="btn-warm-secondary">
                <span>🎫 View Ticket Queue</span>
              </Link>
              <Link to="/inventory/available" className="btn-warm-terracotta">
                <span>👤+ Assign Hardware</span>
              </Link>
            </>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <>
              <Link to="/tickets/assign" className="btn-warm-secondary">
                <span>👥 Assign Tickets</span>
              </Link>
              <Link to="/assets/create" className="btn-warm-terracotta">
                <span>+ Add Asset</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ==================== 2. STAT CARDS ROW ==================== */}
      <div className="dash-metrics-grid">
        <div className="dash-metric-card" onClick={() => navigate('/tickets')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-label">OPEN TICKETS</span>
            <div className="metric-icon-box">🎫</div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{openCount}</span>
            <span className="metric-unit">active</span>
          </div>
          <div className="metric-subtext">Awaiting resolution</div>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/tickets')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-label">IN PROGRESS</span>
            <div className="metric-icon-box">⚡</div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{inProgressCount + assignedCount}</span>
            <span className="metric-unit">working</span>
          </div>
          <div className="metric-subtext">Assigned to support staff</div>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/tickets')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-label">RESOLVED</span>
            <div className="metric-icon-box">✅</div>
          </div>
          <div className="metric-body">
            <span className="metric-value resolved-number">{resolvedCount}</span>
            <span className="metric-unit resolved-unit">closed</span>
          </div>
          <div className="metric-subtext">{resolutionRate}% resolution rate</div>
        </div>

        <div className="dash-metric-card" onClick={() => navigate('/assets')} style={{ cursor: 'pointer' }}>
          <div className="metric-header">
            <span className="metric-label">HARDWARE</span>
            <div className="metric-icon-box">💻</div>
          </div>
          <div className="metric-body">
            <span className="metric-value">
              {isEmployee ? (assignedHardware ? 1 : 0) : totalAssets}
            </span>
            <span className="metric-unit">{isEmployee ? 'assigned' : 'total'}</span>
          </div>
          <div className="metric-subtext">
            {isEmployee
              ? (assignedHardware ? 'Assigned to your profile' : 'No device allocated')
              : `${stockCount} available to assign`}
          </div>
        </div>
      </div>

      {/* ==================== 3. SPLIT WORKSPACE ==================== */}
      <div className="dash-split-layout">
        {/* Left Column: Recent Tickets + Hardware / Allocation Panel */}
        <div className="dash-left-column">
          <div className="warm-card">
            <div className="warm-card-header">
              <div className="warm-card-title-group">
                <span className="warm-card-icon">🗂️</span>
                <h2 className="warm-card-title">Recent Support Tickets</h2>
              </div>
              <Link to="/tickets" className="warm-view-all-link">
                View all ({totalTickets}) <span>→</span>
              </Link>
            </div>

            <div className="recent-tickets-list">
              {loadingData ? (
                <div className="dash-loading-state">Loading support tickets…</div>
              ) : recentTickets.length === 0 ? (
                <div className="dash-empty-tickets">
                  <span>🎫</span>
                  <p>No recent tickets found. All systems operational.</p>
                </div>
              ) : (
                recentTickets.map((t) => {
                  const tNum = t.ticket_number || `INC-${t.id}`;
                  const createdDate = t.created_at
                    ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Recent';
                  return (
                    <div
                      key={t.id}
                      className="ticket-row-item"
                      onClick={() => navigate('/tickets')}
                    >
                      <div className="ticket-row-left">
                        <div className="ticket-type-icon">
                          {t.category === 'Hardware' ? '💻' : t.category === 'Network' ? '🌐' : t.category === 'Access' ? '🔑' : '⚙️'}
                        </div>
                        <div className="ticket-info">
                          <div className="ticket-title-line">
                            <strong className="ticket-id-tag">{tNum}</strong>
                            <span className="ticket-sep">—</span>
                            <span className="ticket-subject">{t.title}</span>
                          </div>
                          <div className="ticket-submeta">
                            <span>📅 {createdDate}</span>
                            <span className="meta-dot">•</span>
                            <span>{t.category}</span>
                            <span className="meta-dot">•</span>
                            <span>Priority: {t.priority}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ticket-row-right">
                        {getStatusBadge(t.status)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Device Card — Strictly role-aware */}
          {isEmployee ? (
            assignedHardware ? (
              <div className="equipment-card" onClick={() => navigate('/assets')}>
                <div className="equipment-card-left">
                  <div className="equipment-icon-box">💻</div>
                  <div className="equipment-info">
                    <div className="equipment-title">
                      {assignedHardware.brand} {assignedHardware.model}
                    </div>
                    <div className="equipment-meta">
                      Asset Tag: <strong>{assignedHardware.asset_tag}</strong> · Type: {assignedHardware.asset_type} · Serial: {assignedHardware.serial_number}
                    </div>
                  </div>
                </div>
                <div className="equipment-card-right">
                  <span className="warm-pill warm-pill-assigned">● ASSIGNED</span>
                  <span className="equipment-arrow">›</span>
                </div>
              </div>
            ) : (
              <div className="equipment-card request-nudge" onClick={() => setRequestModalOpen(true)}>
                <div className="equipment-card-left">
                  <div className="equipment-icon-box">📦</div>
                  <div className="equipment-info">
                    <div className="equipment-title">No Device Assigned</div>
                    <div className="equipment-meta">Need a company laptop or peripheral? Click to submit an equipment request.</div>
                  </div>
                </div>
                <div className="equipment-card-right">
                  <span className="btn-warm-terracotta" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                    Request Equipment
                  </span>
                </div>
              </div>
            )
          ) : (
            /* Staff Spotlight Card (Support & Admin do NOT see 'Request Equipment') */
            <div className="equipment-card" onClick={() => navigate('/inventory/available')} style={{ cursor: 'pointer' }}>
              <div className="equipment-card-left">
                <div className="equipment-icon-box">📦</div>
                <div className="equipment-info">
                  <div className="equipment-title">Available Inventory Pool ({stockCount} Devices Ready)</div>
                  <div className="equipment-meta">
                    Unassigned hardware and peripherals ready for immediate deployment to employees.
                  </div>
                </div>
              </div>
              <div className="equipment-card-right">
                <span className="btn-warm-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                  Assign Stock →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real SLA Metrics & Tailored Quick Actions */}
        <div className="dash-right-column">
          {/* Real Metrics Card */}
          <div className="warm-card sla-card">
            <div className="warm-card-header">
              <div className="warm-card-title-group">
                <span className="warm-card-icon">📊</span>
                <h2 className="warm-card-title">Service & SLA Metrics</h2>
              </div>
              <span className="sla-period-tag">Live Data</span>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>SLA Compliance Rate</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: complianceRate >= 80 ? '#10b981' : '#f59e0b' }}>
                  {complianceRate}%
                </span>
              </div>
              <div className="sla-progress-track">
                <div
                  className="sla-progress-fill"
                  style={{
                    width: `${complianceRate}%`,
                    backgroundColor: complianceRate >= 80 ? '#10b981' : '#f59e0b',
                  }}
                />
              </div>
              {slaData && slaData.avg_resolution_time_hours > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#78716c', marginTop: '0.4rem' }}>
                  Average resolution time: <strong>{slaData.avg_resolution_time_hours} hours</strong>
                </div>
              )}
            </div>

            {/* Real Priority Distribution from tickets */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Tickets by Priority
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#ef4444' }}>●</span> Critical
                  </span>
                  <strong>{criticalCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#f59e0b' }}>●</span> High
                  </span>
                  <strong>{highCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#3b82f6' }}>●</span> Medium
                  </span>
                  <strong>{mediumCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#10b981' }}>●</span> Low
                  </span>
                  <strong>{lowCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Strictly Role-Tailored Quick Actions Card */}
          <div className="warm-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem 0' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Employee Actions Only */}
              {isEmployee && (
                <>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/tickets/create')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>➕ Submit Support Ticket</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => setRequestModalOpen(true)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>✨ Request Equipment</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/assets')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>💻 View My Devices</span>
                  </button>
                </>
              )}

              {/* Support Actions Only */}
              {user?.role === 'SUPPORT' && (
                <>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/tickets')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>🎫 Triage Support Ticket Queue</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/inventory/available')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>👤+ Assign Available Hardware</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/assets')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>💻 Browse Asset Directory</span>
                  </button>
                </>
              )}

              {/* Admin Actions Only */}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/assets/create')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>📦 Add New Asset to Catalog</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/tickets/assign')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>👥 Dispatch & Assign Tickets</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/inventory/available')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>👤+ Assign Available Hardware</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/assets')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>💻 Manage Asset Catalog</span>
                  </button>
                  <button
                    type="button"
                    className="btn-warm-secondary"
                    onClick={() => navigate('/tickets')}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <span>🎫 Review All Tickets</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Request Modal (Only rendered for Employees) */}
      {isEmployee && (
        <RequestAssetModal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          onRequestSubmitted={() => {
            ticketService.getAll().then(setTickets);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;