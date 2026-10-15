import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ticketService, userService } from '../../services/ticketService';
import { Ticket, TicketStatus, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import useWebSocket from '../../hooks/useWebSocket';
import FulfillRequestDrawer from './FulfillRequestDrawer';
import TicketDetailDrawer from './TicketDetailDrawer';

export const TicketList: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [supportStaff, setSupportStaff] = useState<User[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Fulfill Hardware Request Drawer State
  const [fulfillTicket, setFulfillTicket] = useState<Ticket | null>(null);
  const [isFulfillDrawerOpen, setIsFulfillDrawerOpen] = useState(false);

  // Ticket Detail Drawer State
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';
  const isSupport = user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN';

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

  const fetchStaff = async () => {
    if (isAdmin || isSupport) {
      try {
        const allUsers = await userService.getAll();
        setSupportStaff(allUsers.filter((u) => u.role === 'SUPPORT' || u.role === 'ADMIN'));
      } catch {
        setSupportStaff([]);
      }
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [user]);

  // Real-time synchronization via WebSocket
  useWebSocket(() => {
    fetchTickets();
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Workflow Handlers
  const handleAssignToMe = async (ticketId: number) => {
    if (!user) return;
    setActionLoadingId(ticketId);
    try {
      await ticketService.assign(ticketId, user.id);
      await fetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to assign ticket.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminAssign = async (ticketId: number, targetUserId: number) => {
    if (!targetUserId) return;
    setActionLoadingId(ticketId);
    try {
      await ticketService.assign(ticketId, targetUserId);
      await fetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to assign ticket.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartWork = async (ticketId: number) => {
    setActionLoadingId(ticketId);
    try {
      await ticketService.updateStatus(ticketId, 'IN_PROGRESS', 'Work started by IT support.');
      await fetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update ticket status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (ticketId: number) => {
    const notes = window.prompt('Enter resolution summary / actions taken:');
    if (!notes || !notes.trim()) return;

    setActionLoadingId(ticketId);
    try {
      await ticketService.resolve(ticketId, notes.trim());
      await fetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to resolve ticket.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenFulfill = (ticket: Ticket) => {
    setFulfillTicket(ticket);
    setIsFulfillDrawerOpen(true);
  };

  const handleOpenDetail = (ticket: Ticket) => {
    setDetailTicket(ticket);
    setIsDetailDrawerOpen(true);
  };

  const handleClose = async (ticketId: number) => {
    const target = tickets.find((t) => t.id === ticketId);
    const reasonText = target?.resolution_notes
      ? `\n\nIT Support Resolution Note:\n"${target.resolution_notes}"\n\n`
      : '\n\n';

    if (
      !window.confirm(
        `Confirm that this issue has been resolved to your satisfaction?${reasonText}Click OK to officially close this ticket.`
      )
    ) {
      return;
    }
    setActionLoadingId(ticketId);
    try {
      await ticketService.close(ticketId);
      await fetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to close ticket.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'RESOLVED') return <span className="warm-pill warm-pill-resolved">● RESOLVED</span>;
    if (s === 'CLOSED') return <span className="warm-pill warm-pill-closed">● CLOSED</span>;
    if (s === 'IN_PROGRESS') return <span className="warm-pill warm-pill-progress">● IN PROGRESS</span>;
    if (s === 'ASSIGNED') return <span className="warm-pill warm-pill-assigned">● ASSIGNED</span>;
    return <span className="warm-pill warm-pill-open">● OPEN</span>;
  };

  const getPriorityBadge = (p: string) => {
    const priority = p.toUpperCase();
    if (priority === 'CRITICAL') return <span className="badge badge-critical">CRITICAL</span>;
    if (priority === 'HIGH') return <span className="badge badge-high">HIGH</span>;
    if (priority === 'MEDIUM') return <span className="badge badge-medium">MEDIUM</span>;
    return <span className="badge badge-low">LOW</span>;
  };

  // Filter client-side by status, priority, category & search
  const filteredTickets = tickets.filter((t) => {
    // 1. Status Filter Tab
    if (statusFilter === 'OPEN' && t.status !== 'OPEN') return false;
    if (statusFilter === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS' && t.status !== 'ASSIGNED') return false;
    if (statusFilter === 'RESOLVED' && t.status !== 'RESOLVED') return false;
    if (statusFilter === 'CLOSED' && t.status !== 'CLOSED') return false;

    // 2. Dropdown Filters
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;

    // 3. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const num = (t.ticket_number || t.ticket_id || `INC-${t.id}`).toLowerCase();
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const prio = (t.priority || '').toLowerCase();
      const req = (
        t.created_by_name ||
        (typeof t.created_by === 'object' && t.created_by ? (t.created_by as any).full_name : '') ||
        ''
      ).toLowerCase();
      const ass = (
        t.assigned_to_name ||
        (typeof t.assigned_to === 'object' && t.assigned_to ? (t.assigned_to as any).full_name : '') ||
        ''
      ).toLowerCase();
      const dev = (
        t.asset
          ? `${t.asset.asset_tag || ''} ${t.asset.brand || ''} ${t.asset.model || ''}`
          : ''
      ).toLowerCase();

      if (
        !num.includes(q) &&
        !title.includes(q) &&
        !desc.includes(q) &&
        !cat.includes(q) &&
        !prio.includes(q) &&
        !req.includes(q) &&
        !ass.includes(q) &&
        !dev.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  // Accurate counts for status tabs (always computed from full dataset)
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;

  return (
    <div className="tickets-management-page">
      {/* Hero Header */}
      <div className="inventory-hero">
        <div className="inventory-hero-left">
          <div className="inventory-kicker">
            <span className="kicker-dot">●</span> Support Operations
          </div>
          <h1 className="inventory-title">Support Tickets</h1>
          <p className="inventory-subtitle">
            {isEmployee
              ? 'Track resolution progress on your submitted technical requests.'
              : 'Triage, assign, and manage enterprise IT support requests.'}
          </p>
        </div>

        <div className="inventory-hero-actions">
          {isEmployee && (
            <Link to="/tickets/create" className="btn-warm-terracotta">
              <span>+ New Ticket</span>
            </Link>
          )}
        </div>
      </div>

      {/* Status Filter Chips Bar */}
      <div className="status-chip-bar">
        <button
          type="button"
          className={`status-chip ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          All Tickets <span className="status-chip-count">{totalCount}</span>
        </button>
        <button
          type="button"
          className={`status-chip ${statusFilter === 'OPEN' ? 'active' : ''}`}
          onClick={() => setStatusFilter('OPEN')}
        >
          Open <span className="status-chip-count">{openCount}</span>
        </button>
        <button
          type="button"
          className={`status-chip ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setStatusFilter('IN_PROGRESS')}
        >
          In Progress <span className="status-chip-count">{inProgressCount}</span>
        </button>
        <button
          type="button"
          className={`status-chip ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('RESOLVED')}
        >
          Resolved <span className="status-chip-count">{resolvedCount}</span>
        </button>
        <button
          type="button"
          className={`status-chip ${statusFilter === 'CLOSED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('CLOSED')}
        >
          Closed <span className="status-chip-count">{closedCount}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="inventory-toolbar">
        <form onSubmit={handleSearch} className="inventory-search-wrap" style={{ flex: 1 }}>
          <span className="inventory-search-icon">🔍</span>
          <input
            type="text"
            placeholder={isEmployee ? 'Search your tickets by keyword...' : 'Search tickets by number, keyword, employee...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '130px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Network</option>
            <option value="Access">Access</option>
            <option value="Other">Other</option>
          </select>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '120px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="inventory-table-card">
        {loading ? (
          <div className="dash-loading-state" style={{ padding: '3rem' }}>
            Loading tickets…
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="dash-empty-tickets" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem' }}>🎫</span>
            <h3 style={{ margin: '0.75rem 0 0.25rem 0' }}>No Tickets Found</h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.88rem' }}>
              No support requests match your current search or status filter.
            </p>
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>TICKET ID</th>
                <th>SUBJECT & DETAILS</th>
                <th style={{ width: '90px' }}>CATEGORY</th>
                <th style={{ width: '80px' }}>PRIORITY</th>
                <th style={{ width: '105px' }}>STATUS</th>
                {!isEmployee && <th style={{ width: '120px' }}>REQUESTER</th>}
                <th style={{ width: '120px' }}>ASSIGNED TO</th>
                <th style={{ width: '65px' }}>CREATED</th>
                <th style={{ textAlign: 'right', width: '90px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => {
                const ticketNumber = ticket.ticket_number || ticket.ticket_id || `INC-${ticket.id}`;
                const createdByName =
                  ticket.created_by_name ||
                  (ticket.created_by && typeof ticket.created_by === 'object'
                    ? (ticket.created_by as any).full_name
                    : null) ||
                  'Employee';
                const assignedName =
                  ticket.assigned_to_name ||
                  (ticket.assigned_to && typeof ticket.assigned_to === 'object'
                    ? (ticket.assigned_to as any).full_name
                    : null);
                const isAssignedToMe = Boolean(
                  user &&
                  (ticket.assigned_to_id === user.id ||
                    (typeof ticket.assigned_to === 'number' && ticket.assigned_to === user.id) ||
                    (ticket.assigned_to && typeof ticket.assigned_to === 'object' && (ticket.assigned_to as any).id === user.id))
                );

                const createdDate = ticket.created_at
                  ? new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Recent';

                return (
                  <tr key={ticket.id}>
                    <td>
                      <strong
                        className="ticket-id-tag"
                        onClick={() => handleOpenDetail(ticket)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full ticket details and resolution audit"
                      >
                        {ticketNumber}
                      </strong>
                    </td>
                    <td
                      style={{ maxWidth: '320px' }}
                      title={`${ticket.title}${ticket.resolution_notes ? ` | Resolution: ${ticket.resolution_notes}` : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          onClick={() => handleOpenDetail(ticket)}
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                          }}
                          title="Click to view ticket details"
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
                        {ticket.status === 'RESOLVED' && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#059669',
                              background: 'rgba(16, 185, 129, 0.12)',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              flexShrink: 0,
                              fontWeight: 600,
                            }}
                          >
                            ✓ Solved
                          </span>
                        )}
                      </div>

                      {/* Prominent Resolution Reason Callout for the Requester & Staff */}
                      {ticket.resolution_notes && (
                        <div
                          onClick={() => handleOpenDetail(ticket)}
                          style={{
                            marginTop: '0.35rem',
                            fontSize: '0.74rem',
                            background: ticket.status === 'RESOLVED' ? '#ecfdf5' : '#f5f5f4',
                            color: ticket.status === 'RESOLVED' ? '#047857' : '#57534e',
                            borderLeft: `3px solid ${ticket.status === 'RESOLVED' ? '#10b981' : '#a8a29e'}`,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0 4px 4px 0',
                            lineHeight: 1.35,
                            cursor: 'pointer',
                            display: 'block',
                          }}
                          title="Click to inspect resolution audit and full details"
                        >
                          <span style={{ fontWeight: 700 }}>Resolution Reason: </span>
                          <span>{ticket.resolution_notes}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="warm-pill warm-pill-neutral" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                        {ticket.category}
                      </span>
                    </td>
                    <td>{getPriorityBadge(ticket.priority)}</td>
                    <td>{getStatusBadge(ticket.status)}</td>
                    {!isEmployee && (
                      <td
                        style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                        title={createdByName}
                      >
                        {createdByName}
                      </td>
                    )}
                    <td
                      style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
                      title={assignedName || 'Unassigned'}
                    >
                      {assignedName ? (
                        <span style={{ color: isAssignedToMe ? '#6366f1' : 'inherit', fontWeight: isAssignedToMe ? 700 : 500 }}>
                          {assignedName} {isAssignedToMe && '(You)'}
                        </span>
                      ) : (
                        <span style={{ color: '#888', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {createdDate}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const isHardwareRequest =
                          ticket.category === 'Hardware' &&
                          (ticket.title.toLowerCase().startsWith('hardware request') ||
                            ticket.title.toLowerCase().includes('request:') ||
                            ticket.title.toLowerCase().includes('request equipment') ||
                            ticket.description.toLowerCase().includes('requested equipment:'));

                        const canTake = (isSupport || isAdmin) && ticket.status === 'OPEN';
                        const canStart = (isSupport || isAdmin) && ticket.status === 'ASSIGNED' && (isAssignedToMe || isAdmin);
                        const canResolve = (isSupport || isAdmin) && (ticket.status === 'IN_PROGRESS' || ticket.status === 'ASSIGNED') && (isAssignedToMe || isAdmin);
                        const canClose = isEmployee && ticket.status === 'RESOLVED';

                        if (!canTake && !canStart && !canResolve && !canClose) {
                          return <span style={{ fontSize: '0.75rem', color: '#a8a29e' }}>—</span>;
                        }

                        return (
                          <div style={{ display: 'inline-flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            {canTake && (
                              <button
                                type="button"
                                className="action-btn-sm action-btn-take"
                                onClick={() => handleAssignToMe(ticket.id)}
                                disabled={actionLoadingId === ticket.id}
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.74rem' }}
                                title="Take this open ticket"
                              >
                                Take
                              </button>
                            )}

                            {canStart && (
                              <button
                                type="button"
                                className="action-btn-sm action-btn-take"
                                onClick={() => handleStartWork(ticket.id)}
                                disabled={actionLoadingId === ticket.id}
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.74rem' }}
                                title="Start work on this ticket"
                              >
                                Start
                              </button>
                            )}

                            {canResolve && isHardwareRequest && (
                              <button
                                type="button"
                                className="action-btn-sm action-btn-assign-asset"
                                onClick={() => handleOpenFulfill(ticket)}
                                disabled={actionLoadingId === ticket.id}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
                                title="Assign an available asset to fulfill this request"
                              >
                                📦 Assign
                              </button>
                            )}

                            {canResolve && !isHardwareRequest && (
                              <button
                                type="button"
                                className="action-btn-sm action-btn-resolve"
                                onClick={() => handleResolve(ticket.id)}
                                disabled={actionLoadingId === ticket.id}
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.74rem' }}
                                title="Resolve ticket"
                              >
                                Resolve
                              </button>
                            )}

                            {canClose && (
                              <button
                                type="button"
                                className="action-btn-sm action-btn-close"
                                onClick={() => handleClose(ticket.id)}
                                disabled={actionLoadingId === ticket.id}
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.74rem' }}
                                title="Close ticket"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="inventory-pagination">
          <div className="pagination-count">
            Showing <strong>{filteredTickets.length}</strong> of <strong>{totalCount}</strong> support tickets
          </div>
        </div>
      </div>

      {/* Fulfill Hardware Request Drawer */}
      <FulfillRequestDrawer
        ticket={fulfillTicket}
        isOpen={isFulfillDrawerOpen}
        onClose={() => {
          setIsFulfillDrawerOpen(false);
          setFulfillTicket(null);
        }}
        onAssignedAndResolved={() => {
          fetchTickets();
        }}
      />

      {/* Ticket Detail & Resolution Audit Drawer */}
      <TicketDetailDrawer
        ticket={detailTicket}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setDetailTicket(null);
        }}
        isEmployee={isEmployee}
        onCloseTicket={handleClose}
        onOpenAssignAsset={handleOpenFulfill}
        onResolveTicket={handleResolve}
      />
    </div>
  );
};

export default TicketList;