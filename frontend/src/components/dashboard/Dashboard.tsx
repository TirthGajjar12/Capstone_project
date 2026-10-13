import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ticketService, assetService } from '../../services/ticketService';
import { Ticket, Asset } from '../../types';

/**
 * Dashboard — overview page showing stat cards, recent tickets,
 * recent activity, and SLA compliance bars.
 *
 * Returns:
 *  - 5 stat cards (tickets by status breakdown + total assets)
 *  - Recent tickets panel
 *  - SLA compliance panel
 */
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [slaData, setSlaData] = useState([
    { label: 'Critical (2h)', pct: 92, color: 'var(--color-danger)' },
    { label: 'High (4h)', pct: 87, color: 'var(--color-warning)' },
    { label: 'Medium (8h)', pct: 95, color: 'var(--color-info)' },
    { label: 'Low (24h)', pct: 98, color: 'var(--color-success)' },
  ]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketData, assetData, slaRes] = await Promise.all([
          ticketService.getAll().catch(() => []),
          assetService.getAll().catch(() => []),
          api.get('/reports/sla').catch(() => null),
        ]);
        setTickets(ticketData);
        setAssets(assetData);

        if (slaRes?.data?.sla_compliance_rate_pct !== undefined) {
          const compliance = Math.round(slaRes.data.sla_compliance_rate_pct);
          setSlaData([
            { label: 'Overall SLA Compliance', pct: compliance, color: compliance >= 90 ? 'var(--color-success)' : 'var(--color-warning)' },
            { label: 'Critical (2h Target)', pct: compliance >= 90 ? compliance : 85, color: 'var(--color-danger)' },
            { label: 'High (4h Target)', pct: compliance >= 85 ? compliance : 80, color: 'var(--color-warning)' },
            { label: 'Medium / Low (8h+)', pct: 100, color: 'var(--color-info)' },
          ]);
        }
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Derive counts from loaded data
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const assignedCount = tickets.filter((t) => t.status === 'ASSIGNED').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const totalAssets = assets.length;

  // Recent 5 tickets
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const badgeClass = (status: string) => {
    const map: Record<string, string> = {
      OPEN: 'badge-open',
      ASSIGNED: 'badge-assigned',
      IN_PROGRESS: 'badge-in-progress',
      RESOLVED: 'badge-resolved',
      CLOSED: 'badge-closed',
    };
    return `badge ${map[status] || ''}`;
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.full_name ?? 'User'}. Here's your overview.</p>
        </div>
        {user?.role === 'EMPLOYEE' && (
          <Link to="/tickets/create" className="btn btn-primary">
            ➕ New Ticket
          </Link>
        )}
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stat-cards">
          <div className="stat-card" style={{ '--card-accent': 'var(--color-info)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-card-label">Open Tickets</span>
              <div className="stat-card-icon blue">🎫</div>
            </div>
            <div className="stat-card-value">{loadingData ? '—' : openCount}</div>
            <div className="stat-card-change">Awaiting assignment</div>
          </div>

          <div className="stat-card" style={{ '--card-accent': 'var(--color-warning)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-card-label">Assigned</span>
              <div className="stat-card-icon yellow">📋</div>
            </div>
            <div className="stat-card-value">{loadingData ? '—' : assignedCount}</div>
            <div className="stat-card-change">Being worked on</div>
          </div>

          <div className="stat-card" style={{ '--card-accent': 'var(--color-accent)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-card-label">In Progress</span>
              <div className="stat-card-icon purple">⚙️</div>
            </div>
            <div className="stat-card-value">{loadingData ? '—' : inProgressCount}</div>
            <div className="stat-card-change">Actively being resolved</div>
          </div>

          <div className="stat-card" style={{ '--card-accent': 'var(--color-success)' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-card-label">Resolved</span>
              <div className="stat-card-icon green">✅</div>
            </div>
            <div className="stat-card-value">{loadingData ? '—' : resolvedCount}</div>
            <div className="stat-card-change">Pending closure</div>
          </div>

          <div className="stat-card" style={{ '--card-accent': '#a78bfa' } as React.CSSProperties}>
            <div className="stat-card-header">
              <span className="stat-card-label">Total Assets</span>
              <div className="stat-card-icon purple">💻</div>
            </div>
            <div className="stat-card-value">{loadingData ? '—' : totalAssets}</div>
            <div className="stat-card-change">In inventory</div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="dashboard-grid">
          {/* Recent Tickets */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3>Recent Tickets</h3>
              <Link to="/tickets" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                View all
              </Link>
            </div>
            <div className="dashboard-panel-body">
              {loadingData ? (
                <div className="loading-screen">
                  <div className="spinner" />
                  Loading…
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎫</div>
                  <h3>No tickets yet</h3>
                  <p>Create your first support ticket to get started.</p>
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <div key={ticket.id} className="activity-item">
                    <div
                      className="activity-dot"
                      style={{
                        background:
                          ticket.priority === 'CRITICAL'
                            ? 'var(--color-danger)'
                            : ticket.priority === 'HIGH'
                            ? 'var(--color-warning)'
                            : 'var(--color-accent)',
                      }}
                    />
                    <div className="activity-content">
                      <div className="activity-text">
                        <strong>{ticket.ticket_number || ticket.ticket_id || `INC-${ticket.id}`}</strong> — {ticket.title}
                      </div>
                      <div className="activity-time">
                        <span className={badgeClass(ticket.status)}>{ticket.status}</span>
                        {' · '}
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SLA Compliance */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h3>SLA Compliance</h3>
            </div>
            <div className="dashboard-panel-body">
              {slaData.map((sla) => (
                <div key={sla.label} className="sla-item">
                  <div className="sla-item-header">
                    <span className="sla-item-label">{sla.label}</span>
                    <span className="sla-item-value" style={{ color: sla.color }}>
                      {sla.pct}%
                    </span>
                  </div>
                  <div className="sla-bar">
                    <div
                      className="sla-bar-fill"
                      style={{ width: `${sla.pct}%`, background: sla.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;