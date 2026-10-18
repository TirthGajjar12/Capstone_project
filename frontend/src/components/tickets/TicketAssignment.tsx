import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/ticketService';
import { Ticket } from '../../types';
import AssignTicketDrawer from './AssignTicketDrawer';
import FulfillRequestDrawer from './FulfillRequestDrawer';
import TicketDetailDrawer from './TicketDetailDrawer';
import useWebSocket from '../../hooks/useWebSocket';
import { IconBox, IconLaptop, IconUser } from '../common/Icons';

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

  // Selected ticket for assign staff drawer
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<Ticket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Selected ticket for hardware fulfillment drawer
  const [fulfillTicket, setFulfillTicket] = useState<Ticket | null>(null);
  const [isFulfillDrawerOpen, setIsFulfillDrawerOpen] = useState(false);

  // Selected ticket for inspection & priority editing drawer
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const handleOpenDetail = (ticket: Ticket) => {
    setDetailTicket(ticket);
    setIsDetailDrawerOpen(true);
  };

  const isHardwareRequest = (t: Ticket) => {
    const title = (t.title || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return (
      (t.category || '').toLowerCase() === 'hardware' &&
      (title.startsWith('hardware request') ||
        title.includes('request:') ||
        title.includes('request equipment') ||
        desc.includes('requested equipment:'))
    );
  };

  const handleOpenAssign = (ticket: Ticket) => {
    setSelectedTicketForAssign(ticket);
    setIsDrawerOpen(true);
  };

  const handleOpenFulfill = (ticket: Ticket) => {
    setFulfillTicket(ticket);
    setIsFulfillDrawerOpen(true);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getAll(undefined, undefined, 0, 500);
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useWebSocket(() => {
    fetchTickets();
  });

  useEffect(() => {
    fetchTickets();
  }, []);



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

  // Workload mapping: engineer ID -> number of active (ASSIGNED / IN_PROGRESS) tickets
  const engineerWorkloads = React.useMemo(() => {
    const map: Record<number, number> = {};
    tickets.forEach((t) => {
      const aid = t.assigned_to_id || (typeof t.assigned_to === 'object' ? (t.assigned_to as any)?.id : null);
      if (aid && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')) {
        map[aid] = (map[aid] || 0) + 1;
      }
    });
    return map;
  }, [tickets]);

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
                <th style={{ width: '180px' }}>ASSIGNED ENGINEER</th>
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

                const assignedId = ticket.assigned_to_id || (typeof ticket.assigned_to === 'object' ? (ticket.assigned_to as any)?.id : null);
                const workload = assignedId ? engineerWorkloads[assignedId] || 0 : 0;
                const isAssigned = Boolean(assignedName || assignedId);

                return (
                  <tr key={ticket.id} className="inventory-row">
                    {/* Ticket ID */}
                    <td className="cell-tag" style={{ whiteSpace: 'nowrap' }}>
                      <strong
                        onClick={() => handleOpenDetail(ticket)}
                        style={{ cursor: 'pointer', color: 'var(--color-accent)' }}
                        title="Click to view details and change priority"
                      >
                        {ticketNumber}
                      </strong>
                    </td>

                    {/* Title & Asset info strictly single line */}
                    <td
                      style={{ maxWidth: '300px', overflow: 'hidden' }}
                      title={`${ticket.title}${ticket.asset ? ` | Device: ${ticket.asset.brand} ${ticket.asset.model}` : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <span
                          onClick={() => handleOpenDetail(ticket)}
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}
                          title="Click to view details and change priority"
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
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <IconLaptop size={11} /> {ticket.asset.asset_tag || `AST-${ticket.asset.id}`}
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
                    <td
                      onClick={() => handleOpenDetail(ticket)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view details or edit priority"
                    >
                      {getPriorityBadge(ticket.priority)}
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(ticket.status)}</td>

                    {/* Requester */}
                    <td
                      style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                      title={requesterName}
                    >
                      👤 {requesterName}
                    </td>

                    {/* Current Assignee, Workload & Auto/Manual Indicator */}
                    <td
                      style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                      title={isAssigned ? `${assignedName || `Staff #${assignedId}`} (${workload} active tickets) [${ticket.assignment_mode || 'MANUAL'}]` : 'Unassigned'}
                    >
                      {isAssigned ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 600, color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🛠️ {assignedName || `Staff #${assignedId}`}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#4b5563',
                              background: 'rgba(107, 114, 128, 0.1)',
                              padding: '0.05rem 0.3rem',
                              borderRadius: '4px',
                              flexShrink: 0,
                            }}
                            title={`Active workload: ${workload} tickets`}
                          >
                            {workload}
                          </span>
                          {ticket.assignment_mode === 'AUTO' ? (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.08rem 0.32rem',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#4f46e5',
                                flexShrink: 0,
                              }}
                              title="Assigned automatically by system workload dispatch"
                            >
                              🤖 Auto
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.08rem 0.32rem',
                                borderRadius: '4px',
                                background: 'rgba(107, 114, 128, 0.12)',
                                color: '#4b5563',
                                flexShrink: 0,
                              }}
                              title="Assigned manually by administrator"
                            >
                              👤 Manual
                            </span>
                          )}
                        </div>
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
                      {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--color-text-secondary, #6b7280)',
                            fontStyle: 'italic',
                            padding: '0.2rem 0.5rem',
                          }}
                          title="Completed tickets cannot be assigned or reassigned"
                        >
                          Completed
                        </span>
                      ) : isHardwareRequest(ticket) ? (
                        <button
                          type="button"
                          className="btn-assign-action"
                          onClick={() => handleOpenFulfill(ticket)}
                          title="Provision available hardware inventory to fulfill this request"
                          style={{
                            padding: '0.22rem 0.65rem',
                            fontSize: '0.76rem',
                            background: '#4f46e5',
                            borderColor: '#4338ca',
                            color: '#ffffff',
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><IconBox size={13} /> Fulfill Hardware</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-assign-action"
                          onClick={() => handleOpenAssign(ticket)}
                          title="Assign or reassign support engineer"
                          style={{ padding: '0.22rem 0.55rem', fontSize: '0.76rem' }}
                        >
                          {isAssigned ? 'Reassign' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><IconUser size={13} /> Assign</span>}
                        </button>
                      )}
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

      {/* Slide-out Ticket Assignment Drawer (for regular support tickets) */}
      <AssignTicketDrawer
        ticket={selectedTicketForAssign}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTicketForAssign(null);
        }}
        onAssigned={fetchTickets}
        onSwitchToHardware={handleOpenFulfill}
        allTickets={tickets}
      />

      {/* Hardware Request Fulfillment Drawer (shows available hardware inventory) */}
      <FulfillRequestDrawer
        ticket={fulfillTicket}
        isOpen={isFulfillDrawerOpen}
        onClose={() => {
          setIsFulfillDrawerOpen(false);
          setFulfillTicket(null);
        }}
        onAssignedAndResolved={fetchTickets}
      />

      {/* Ticket Detail & Priority Edit Drawer */}
      <TicketDetailDrawer
        ticket={detailTicket}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setDetailTicket(null);
        }}
        isEmployee={false}
        onOpenAssignAsset={handleOpenFulfill}
        onTicketUpdated={(updated) => {
          setDetailTicket(updated);
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
        }}
      />
    </div>
  );
};

export default TicketAssignment;
