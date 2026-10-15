import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ticketService, assetService } from '../../services/ticketService';
import { Ticket, Asset } from '../../types';
import RequestAssetModal from '../assets/RequestAssetModal';
import useWebSocket from '../../hooks/useWebSocket';

interface SlaData {
  total_tickets: number;
  resolved_tickets: number;
  open_tickets: number;
  breached_tickets: number;
  resolved_breached_tickets?: number;
  active_overdue_tickets?: number;
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const fetchData = async () => {
    setLoadingData(true);
    setFetchError(null);
    try {
      const [ticketData, assetData] = await Promise.all([
        ticketService.getAll(),
        assetService.getAll(),
      ]);
      setTickets(ticketData);
      setAssets(assetData);

      // Fetch live SLA report from backend (scoped to user role: enterprise for staff, personal for employee)
      try {
        const res = await api.get('/reports/sla');
        setSlaData(res.data);
      } catch {
        setSlaData(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Unable to connect to the server or load dashboard data.';
      setFetchError(msg);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useWebSocket(() => {
    fetchData();
  });

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

  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  // Accurate SLA Compliance Rate: use backend response or calculate from tickets (including active overdue)
  const complianceRate = (() => {
    if (slaData && typeof slaData.sla_compliance_rate_pct === 'number') {
      return Math.round(slaData.sla_compliance_rate_pct);
    }
    const resolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
    const active = tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    const nowMs = Date.now();
    const isBreached = (t: Ticket) => {
      if (typeof t.is_sla_breached === 'boolean') return t.is_sla_breached;
      if (!t.sla_deadline) return false;
      const deadline = new Date(t.sla_deadline).getTime();
      if (t.resolved_at) return new Date(t.resolved_at).getTime() > deadline;
      return nowMs > deadline;
    };
    const breachedResolved = resolved.filter(isBreached).length;
    const activeOverdue = active.filter(isBreached).length;
    const evaluated = resolved.length + activeOverdue;
    const compliant = resolved.length - breachedResolved;
    if (evaluated > 0) return Math.round((compliant / evaluated) * 100);
    return tickets.length > 0 ? 100 : null;
  })();

  const activeOverdueCount = slaData?.active_overdue_tickets ?? (() => {
    const active = tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    const nowMs = Date.now();
    return active.filter((t) => {
      if (typeof t.is_sla_breached === 'boolean') return t.is_sla_breached;
      if (!t.sla_deadline) return false;
      return nowMs > new Date(t.sla_deadline).getTime();
    }).length;
  })();

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

      {/* API / Server Connection Error Alert */}
      {fetchError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Failed to load workspace data:</strong> {fetchError}
            </div>
          </div>
          <button
            type="button"
            className="btn-warm-secondary"
            onClick={fetchData}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            🔄 Retry
          </button>
        </div>
      )}

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
          <div className="metric-subtext">
            {totalTickets > 0 ? `${resolutionRate}% resolution rate` : 'No tickets logged'}
          </div>
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
          {/* Employee Support Hub Card (Only shown to Employees) */}
          {isEmployee && (
            <div className="warm-card" style={{ padding: '1.25rem' }}>
              <div className="warm-card-header" style={{ marginBottom: '0.85rem' }}>
                <div className="warm-card-title-group">
                  <span className="warm-card-icon">💡</span>
                  <h2 className="warm-card-title">Employee Support Hub</h2>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ background: 'var(--color-bg-secondary, #fafaf9)', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e7ded4' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                    ⚡ Intelligent Triage
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Submit requests describing your issue. Automated NLP triage assigns appropriate priority and routes urgent requests for expedited attention.
                  </div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary, #fafaf9)', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e7ded4' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                    📦 Equipment Requests
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Need a replacement laptop, external monitor, or peripherals? Use "Request Equipment" to submit a hardware allocation request.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service & SLA Metrics Card (Rendered for both Admin/Staff and Employees with accurate rates) */}
          <div className="warm-card sla-card">
            <div className="warm-card-header">
              <div className="warm-card-title-group">
                <span className="warm-card-icon">📊</span>
                <h2 className="warm-card-title">Service & SLA Metrics</h2>
              </div>
              <span className="sla-period-tag" style={!slaData ? { background: '#f3f4f6', color: '#6b7280' } : undefined}>
                {isEmployee ? 'My Requests SLA' : 'Enterprise SLA'}
              </span>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>SLA Compliance Rate</span>
                {complianceRate !== null ? (
                  <span
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: complianceRate >= 80 ? '#10b981' : complianceRate >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {complianceRate}%
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>
                    {totalTickets === 0 ? 'No requests yet' : 'Data Unavailable'}
                  </span>
                )}
              </div>
              {complianceRate !== null ? (
                <div className="sla-progress-track">
                  <div
                    className="sla-progress-fill"
                    style={{
                      width: `${complianceRate}%`,
                      backgroundColor: complianceRate >= 80 ? '#10b981' : complianceRate >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                  {totalTickets === 0
                    ? 'Submit a ticket to start tracking SLA performance.'
                    : 'No SLA performance data has been calculated yet.'}
                </div>
              )}
              {slaData && slaData.avg_resolution_time_hours > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#78716c', marginTop: '0.4rem' }}>
                  Average resolution time: <strong>{slaData.avg_resolution_time_hours} hours</strong>
                </div>
              )}
              {activeOverdueCount > 0 && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#dc2626',
                    fontWeight: 600,
                    marginTop: '0.4rem',
                    background: 'rgba(239, 68, 68, 0.08)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  ⚠️ {activeOverdueCount} active ticket(s) currently past SLA deadline
                </div>
              )}
            </div>

            {/* Real Priority Distribution from tickets */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.75rem',
                }}
              >
                {isEmployee ? 'My Tickets by Priority' : 'Tickets by Priority'}
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