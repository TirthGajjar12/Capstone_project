import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ticketService, userService } from '../../services/ticketService';
import { Ticket, TicketStatus, User } from '../../types';
import { useAuth } from '../../context/AuthContext';

/**
 * TicketList — data-table of support tickets with role-based workflow actions.
 * - Employees: see their own tickets, can report issues, and close resolved tickets.
 * - Support: see all tickets, can take tickets, start working, and resolve with notes.
 * - Admin: full visibility, can assign tickets to support staff and manage statuses.
 */
const TicketList: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [supportStaff, setSupportStaff] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const isEmployee = user?.role === 'EMPLOYEE';
  const isSupport = user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN';

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketService.getAll(statusFilter || undefined, search || undefined);
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
  }, [statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
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

  const handleClose = async (ticketId: number) => {
    if (!window.confirm('Confirm that this issue has been resolved to your satisfaction and close ticket?')) {
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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      OPEN: 'badge-open',
      ASSIGNED: 'badge-assigned',
      IN_PROGRESS: 'badge-in-progress',
      RESOLVED: 'badge-resolved',
      CLOSED: 'badge-closed',
    };
    return `badge ${map[status] || ''}`;
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      LOW: 'badge-low',
      MEDIUM: 'badge-medium',
      HIGH: 'badge-high',
      CRITICAL: 'badge-critical',
    };
    return `badge ${map[p] || ''}`;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tickets</h1>
          <p>
            {isEmployee
              ? 'Track and manage your submitted support requests'
              : 'Triage, assign, and resolve user support requests'}
          </p>
        </div>

        {/* Only EMPLOYEE can create new tickets */}
        {isEmployee && (
          <Link to="/tickets/create" className="btn btn-primary">
            ➕ New Ticket
          </Link>
        )}
      </div>

      <div className="page-body">
        <div className="data-table-wrapper">
          {/* Toolbar */}
          <form className="data-table-toolbar" onSubmit={handleSearch}>
            <div className="data-table-search">
              <span className="search-icon">🔍</span>
              <input
                id="ticket-search"
                type="text"
                placeholder={
                  isEmployee
                    ? 'Search your tickets…'
                    : 'Search tickets by keyword, employee…'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="data-table-filter">
              <select
                id="ticket-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>

          {/* Table */}
          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              {isEmployee ? (
                <>
                  <h3>No Tickets Found</h3>
                  <p>You have not submitted any support tickets matching this filter.</p>
                </>
              ) : (
                <>
                  <h3>No Tickets Found</h3>
                  <p>No support requests match the selected filters.</p>
                </>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title</th>
                  <th>Related Device</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  {!isEmployee && <th>Created By</th>}
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
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
                  const isAssignedToMe =
                    user &&
                    ((typeof ticket.assigned_to === 'number' && ticket.assigned_to === user.id) ||
                      (ticket.assigned_to && typeof ticket.assigned_to === 'object' && (ticket.assigned_to as any).id === user.id));

                  return (
                    <tr key={ticket.id}>
                      <td><strong>{ticketNumber}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ticket.title}</div>
                        {ticket.resolution_notes && (
                          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.2rem' }}>
                            ✓ {ticket.resolution_notes}
                          </div>
                        )}
                      </td>
                      <td>
                        {ticket.asset ? (
                          <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
                            💻 {ticket.asset.asset_tag} ({ticket.asset.model})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>{ticket.category}</td>
                      <td>
                        <span className={priorityBadge(ticket.priority)}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      {!isEmployee && <td>{createdByName}</td>}
                      <td>{assignedName ?? <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>Unassigned</span>}</td>
                      <td>{new Date(ticket.created_at).toLocaleDateString()}</td>

                      {/* Role-Specific Actions */}
                      <td>
                        {/* 1. EMPLOYEE Actions */}
                        {isEmployee && (
                          <>
                            {ticket.status === 'RESOLVED' ? (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', background: '#10b981', borderColor: '#10b981' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleClose(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : '✅ Close Ticket'}
                              </button>
                            ) : ticket.status === 'CLOSED' ? (
                              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>Closed</span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem' }}>In Queue</span>
                            )}
                          </>
                        )}

                        {/* 2. IT SUPPORT Actions */}
                        {isSupport && (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {ticket.status === 'OPEN' && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleAssignToMe(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : '🙋 Take'}
                              </button>
                            )}

                            {ticket.status === 'ASSIGNED' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', color: '#fbbf24' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleStartWork(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : '⚙️ Start'}
                              </button>
                            )}

                            {ticket.status === 'IN_PROGRESS' && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', background: '#10b981', borderColor: '#10b981' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleResolve(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : '✨ Resolve'}
                              </button>
                            )}

                            {ticket.status === 'RESOLVED' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleClose(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : 'Close'}
                              </button>
                            )}

                            {ticket.status === 'CLOSED' && (
                              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>Closed</span>
                            )}
                          </div>
                        )}

                        {/* 3. ADMIN Actions */}
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            {ticket.status === 'OPEN' && (
                              <select
                                style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem', borderRadius: '4px', maxWidth: '130px' }}
                                defaultValue=""
                                onChange={(e) => handleAdminAssign(ticket.id, Number(e.target.value))}
                              >
                                <option value="" disabled>Assign to…</option>
                                {supportStaff.map((s) => (
                                  <option key={s.id} value={s.id}>{s.full_name}</option>
                                ))}
                              </select>
                            )}

                            {ticket.status === 'ASSIGNED' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', color: '#fbbf24' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleStartWork(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : 'Start'}
                              </button>
                            )}

                            {ticket.status === 'IN_PROGRESS' && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', background: '#10b981', borderColor: '#10b981' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleResolve(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : 'Resolve'}
                              </button>
                            )}

                            {ticket.status === 'RESOLVED' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                                disabled={actionLoadingId === ticket.id}
                                onClick={() => handleClose(ticket.id)}
                              >
                                {actionLoadingId === ticket.id ? '…' : 'Close'}
                              </button>
                            )}

                            {ticket.status === 'CLOSED' && (
                              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>Closed</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default TicketList;