import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/ticketService';
import { Ticket } from '../../types';
import AssignTicketDrawer from './AssignTicketDrawer';

export const TicketAssignment: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'UNASSIGNED' | 'ASSIGNED' | 'HIGH_PRIORITY' | 'ALL'>('UNASSIGNED');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected ticket for drawer
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<Ticket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getAll();
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenAssign = (ticket: Ticket) => {
    setSelectedTicketForAssign(ticket);
    setIsDrawerOpen(true);
  };

  // Counts
  const totalCount = tickets.length;
  const unassignedCount = tickets.filter(
    (t) => !t.assigned_to && !t.assigned_to_id && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  ).length;
  const activeCount = tickets.filter(
    (t) => (Boolean(t.assigned_to || t.assigned_to_id) || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS') &&
      t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  ).length;
  const highPriorityCount = tickets.filter(
    (t) => (t.priority === 'CRITICAL' || t.priority === 'HIGH') && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  ).length;

  // Filter tickets
  const filtered = tickets.filter((t) => {
    // Exclude closed and resolved from triage queues unless ALL tab is active
    if (tabFilter !== 'ALL' && (t.status === 'CLOSED' || t.status === 'RESOLVED')) {
      return false;
    }

    if (tabFilter === 'UNASSIGNED') {
      const isUnassigned = !t.assigned_to && !t.assigned_to_id;
      if (!isUnassigned) return false;
    } else if (tabFilter === 'ASSIGNED') {
      const isAssigned = Boolean(t.assigned_to || t.assigned_to_id) || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS';
      if (!isAssigned) return false;
    } else if (tabFilter === 'HIGH_PRIORITY') {
      if (t.priority !== 'CRITICAL' && t.priority !== 'HIGH') return false;
    }

    if (categoryFilter && t.category !== categoryFilter) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const ticketNum = (t.ticket_number || `TCK-${t.id}`).toLowerCase();
      const title = (t.title || '').toLowerCase();
      const category = (t.category || '').toLowerCase();
      const requester = (
        typeof t.created_by === 'object' && t.created_by
          ? t.created_by.full_name
          : (t as any).requester_name || ''
      ).toLowerCase();
      const assignee = (
        typeof t.assigned_to === 'object' && t.assigned_to
          ? (t.assigned_to as any).full_name || ''
          : ''
      ).toLowerCase();

      const matches =
        ticketNum.includes(q) ||
        title.includes(q) ||
        category.includes(q) ||
        requester.includes(q) ||
        assignee.includes(q);

      if (!matches) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedTickets = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPriorityBadge = (p: string) => {
    const priority = (p || '').toUpperCase();
    if (priority === 'CRITICAL') return <span className="badge badge-critical">CRITICAL</span>;
    if (priority === 'HIGH') return <span className="badge badge-high">HIGH</span>;
    if (priority === 'MEDIUM') return <span className="badge badge-medium">MEDIUM</span>;
    return <span className="badge badge-low">LOW</span>;
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'RESOLVED') return <span className="warm-pill warm-pill-resolved">● RESOLVED</span>;
    if (s === 'CLOSED') return <span className="warm-pill warm-pill-closed">● CLOSED</span>;
    if (s === 'IN_PROGRESS') return <span className="warm-pill warm-pill-progress">● IN PROGRESS</span>;
    if (s === 'ASSIGNED') return <span className="warm-pill warm-pill-assigned">● ASSIGNED</span>;
    return <span className="warm-pill warm-pill-open">● OPEN</span>;
  };

  return (
    <div className="tickets-management-page">
      {/* ==================== 1. HERO HEADER ==================== */}
      <div className="inventory-hero">
        <div className="inventory-hero-left">
          <div className="inventory-kicker">
            <span className="kicker-dot">●</span> IT Dispatch & Operations
          </div>
          <h1 className="inventory-title">Ticket Assignment</h1>
          <p className="inventory-subtitle">
            Review unallocated support requests and dispatch them to IT support engineers for immediate resolution.
          </p>
        </div>

        <div className="inventory-hero-actions">
          <button
            type="button"
            className="btn-warm-secondary"
            onClick={fetchTickets}
            title="Refresh tickets queue"
          >
            <span>🔄 Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. TRIAGE METRIC CARDS ==================== */}
      <div className="fleet-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div
          className={`fleet-card interactive-filter ${tabFilter === 'UNASSIGNED' ? 'active-filter' : ''}`}
          onClick={() => {
            setTabFilter('UNASSIGNED');
            setCurrentPage(1);
          }}
          title="Filter unassigned tickets"
        >
          <div className="fleet-card-header">
            <span className="fleet-card-label">UNASSIGNED TICKETS</span>
            <span className="fleet-card-icon">⚠️</span>
          </div>
          <div className="fleet-card-body">
            <span className="fleet-number" style={{ color: '#ea580c' }}>
              {unassignedCount}
            </span>
            <span className="fleet-sublabel">awaiting dispatch</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: tabFilter === 'UNASSIGNED' ? '#ea580c' : '#888', marginTop: '0.4rem' }}>
            {tabFilter === 'UNASSIGNED' ? '✓ Filter active' : '● Click to filter'}
          </div>
        </div>

        <div
          className={`fleet-card interactive-filter ${tabFilter === 'HIGH_PRIORITY' ? 'active-filter' : ''}`}
          onClick={() => {
            setTabFilter('HIGH_PRIORITY');
            setCurrentPage(1);
          }}
          title="Filter critical & high priority tickets"
        >
          <div className="fleet-card-header">
            <span className="fleet-card-label">HIGH & CRITICAL SLA</span>
            <span className="fleet-card-icon">🔥</span>
          </div>
          <div className="fleet-card-body">
            <span className="fleet-number" style={{ color: '#dc2626' }}>
              {highPriorityCount}
            </span>
            <span className="fleet-sublabel">high priority</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: tabFilter === 'HIGH_PRIORITY' ? '#dc2626' : '#888', marginTop: '0.4rem' }}>
            {tabFilter === 'HIGH_PRIORITY' ? '✓ Filter active' : '● Click to filter'}
          </div>
        </div>

        <div
          className={`fleet-card interactive-filter ${tabFilter === 'ASSIGNED' ? 'active-filter' : ''}`}
          onClick={() => {
            setTabFilter('ASSIGNED');
            setCurrentPage(1);
          }}
          title="Filter in-progress tickets"
        >
          <div className="fleet-card-header">
            <span className="fleet-card-label">ACTIVE / WITH STAFF</span>
            <span className="fleet-card-icon">👤</span>
          </div>
          <div className="fleet-card-body">
            <span className="fleet-number" style={{ color: '#2563eb' }}>
              {activeCount}
            </span>
            <span className="fleet-sublabel">currently assigned</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: tabFilter === 'ASSIGNED' ? '#2563eb' : '#888', marginTop: '0.4rem' }}>
            {tabFilter === 'ASSIGNED' ? '✓ Filter active' : '● Click to filter'}
          </div>
        </div>
      </div>

      {/* ==================== 3. SEARCH & FILTER TOOLBAR ==================== */}
      <div className="inventory-toolbar">
        <div className="inventory-search-wrap" style={{ flex: 1 }}>
          <span className="inventory-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tickets by ID, title, requester, or category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="inventory-type-tabs">
          <button
            type="button"
            className={`type-tab ${tabFilter === 'UNASSIGNED' ? 'active' : ''}`}
            onClick={() => {
              setTabFilter('UNASSIGNED');
              setCurrentPage(1);
            }}
          >
            Unassigned ({unassignedCount})
          </button>
          <button
            type="button"
            className={`type-tab ${tabFilter === 'ASSIGNED' ? 'active' : ''}`}
            onClick={() => {
              setTabFilter('ASSIGNED');
              setCurrentPage(1);
            }}
          >
            Assigned ({activeCount})
          </button>
          <button
            type="button"
            className={`type-tab ${tabFilter === 'HIGH_PRIORITY' ? 'active' : ''}`}
            onClick={() => {
              setTabFilter('HIGH_PRIORITY');
              setCurrentPage(1);
            }}
          >
            High Priority ({highPriorityCount})
          </button>
          <button
            type="button"
            className={`type-tab ${tabFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => {
              setTabFilter('ALL');
              setCurrentPage(1);
            }}
          >
            All Tickets ({totalCount})
          </button>
        </div>

        <div className="inventory-status-select-wrap">
          <select
            className="inventory-status-select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Network</option>
            <option value="Access">Access</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* ==================== 4. TICKETS ASSIGNMENT TABLE ==================== */}
      <div className="inventory-table-container">
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#888' }}>
            Loading tickets queue…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🎉 All Caught Up</div>
            No tickets matching the selected filters.
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>TICKET ID</th>
                <th>ISSUE / TITLE</th>
                <th style={{ width: '90px' }}>CATEGORY</th>
                <th style={{ width: '80px' }}>PRIORITY</th>
                <th style={{ width: '100px' }}>STATUS</th>
                <th style={{ width: '120px' }}>REQUESTED BY</th>
                <th style={{ width: '130px' }}>ASSIGNED ENGINEER</th>
                <th style={{ textAlign: 'right', width: '100px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map((ticket) => {
                const ticketNumber = ticket.ticket_number || `#TCK-${String(ticket.id).padStart(3, '0')}`;
                const requesterName =
                  (typeof ticket.created_by === 'object' && ticket.created_by
                    ? ticket.created_by.full_name
                    : null) ||
                  (ticket as any).requester_name ||
                  'Employee';

                const assignedName =
                  ticket.assigned_to_name ||
                  (typeof ticket.assigned_to === 'object' && ticket.assigned_to
                    ? (ticket.assigned_to as any).full_name
                    : null);

                const isAssigned = Boolean(assignedName || ticket.assigned_to_id);

                return (
                  <tr key={ticket.id} className="inventory-row">
                    {/* Ticket ID */}
                    <td className="cell-tag" style={{ whiteSpace: 'nowrap' }}>
                      <strong>{ticketNumber}</strong>
                    </td>

                    {/* Title & Asset info strictly single line */}
                    <td
                      style={{ maxWidth: '300px', overflow: 'hidden' }}
                      title={`${ticket.title}${ticket.asset ? ` | Device: ${ticket.asset.brand} ${ticket.asset.model}` : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ticket.title}
                        </span>
                        {ticket.asset && (
                          <span
                            title={`Device: ${ticket.asset.asset_tag || `AST-${ticket.asset.id}`} (${ticket.asset.brand} ${ticket.asset.model})`}
                            style={{
                              fontSize: '0.68rem',
                              color: '#6366f1',
                              background: 'rgba(99, 102, 241, 0.1)',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              flexShrink: 0,
                              fontWeight: 600,
                            }}
                          >
                            💻 {ticket.asset.asset_tag || `AST-${ticket.asset.id}`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="warm-pill warm-pill-neutral" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                        {ticket.category}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>{getPriorityBadge(ticket.priority)}</td>

                    {/* Status */}
                    <td>{getStatusBadge(ticket.status)}</td>

                    {/* Requester */}
                    <td
                      style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                      title={requesterName}
                    >
                      👤 {requesterName}
                    </td>

                    {/* Current Assignee */}
                    <td
                      style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                      title={isAssigned ? (assignedName || `Staff #${ticket.assigned_to_id}`) : 'Unassigned'}
                    >
                      {isAssigned ? (
                        <span style={{ fontWeight: 600, color: '#2563eb' }}>
                          🛠️ {assignedName || `Staff #${ticket.assigned_to_id}`}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: '#d97706',
                            background: 'rgba(217, 119, 6, 0.1)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.74rem',
                          }}
                        >
                          ⚠️ Unassigned
                        </span>
                      )}
                    </td>

                    {/* Actions: Slide-out drawer trigger */}
                    <td className="cell-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn-assign-action"
                        onClick={() => handleOpenAssign(ticket)}
                        title="Assign or reassign support engineer"
                        style={{ padding: '0.22rem 0.55rem', fontSize: '0.76rem' }}
                      >
                        {isAssigned ? '🔄 Reassign' : '👤 Assign'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="inventory-pagination">
          <div className="pagination-count">
            Showing <strong>{filtered.length}</strong> tickets {tabFilter !== 'ALL' && `(${tabFilter})`}
          </div>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Ticket Assignment Drawer */}
      <AssignTicketDrawer
        ticket={selectedTicketForAssign}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTicketForAssign(null);
        }}
        onAssigned={fetchTickets}
      />
    </div>
  );
};

export default TicketAssignment;
