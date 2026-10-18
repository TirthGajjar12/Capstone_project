import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, User } from '../../types';
import { ticketService, userService } from '../../services/ticketService';
import { IconBox, IconTicket, IconUser } from '../common/Icons';

interface AssignTicketDrawerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  onSwitchToHardware?: (ticket: Ticket) => void;
  allTickets?: Ticket[];
}

export const AssignTicketDrawer: React.FC<AssignTicketDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  onAssigned,
  onSwitchToHardware,
  allTickets = [],
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPPORT' | 'ADMIN'>('ALL');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'AVAILABLE' | 'LIGHT'>('ALL');
  const [supportStaff, setSupportStaff] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute active workload for each engineer across current tickets
  const engineerWorkloads = useMemo(() => {
    const map: Record<number, number> = {};
    allTickets.forEach((t) => {
      const aid = t.assigned_to_id || (typeof t.assigned_to === 'object' ? t.assigned_to?.id : null);
      if (aid && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')) {
        map[aid] = (map[aid] || 0) + 1;
      }
    });
    return map;
  }, [allTickets]);

  // Debounced search when user types or on modal open
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedUser(null);
      setReason('');
      setError(null);
      setRoleFilter('ALL');
      setWorkloadFilter('ALL');
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch users from directory with on-demand search
        const results = await userService.search(search, 100);
        const staffOnly = results.filter((u) => u.role === 'SUPPORT' || u.role === 'ADMIN');
        setSupportStaff(staffOnly);
      } catch {
        setError('Failed to load support engineers directory.');
        setSupportStaff([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

  // Filter and sort staff
  const filteredAndSortedStaff = useMemo(() => {
    return supportStaff
      .filter((staff) => {
        if (roleFilter !== 'ALL' && staff.role !== roleFilter) return false;
        const workload = engineerWorkloads[staff.id] || 0;
        if (workloadFilter === 'AVAILABLE' && workload > 0) return false;
        if (workloadFilter === 'LIGHT' && workload > 2) return false;
        return true;
      })
      .sort((a, b) => {
        const wA = engineerWorkloads[a.id] || 0;
        const wB = engineerWorkloads[b.id] || 0;
        if (wA !== wB) return wA - wB; // Least loaded first
        return a.full_name.localeCompare(b.full_name);
      });
  }, [supportStaff, roleFilter, workloadFilter, engineerWorkloads]);

  if (!isOpen || !ticket) return null;

  const ticketNumber = ticket.ticket_number || `#TCK-${String(ticket.id).padStart(3, '0')}`;
  const requesterName =
    (typeof ticket.created_by === 'object' && ticket.created_by
      ? ticket.created_by.full_name
      : null) ||
    (ticket as any).requester_name ||
    'Employee';

  const handleConfirm = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    setError(null);
    try {
      await ticketService.assign(ticket.id, selectedUser.id, reason.trim() || undefined);
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign ticket.');
    } finally {
      setAssigning(false);
    }
  };

  const isHardwareRequest = Boolean(
    ticket &&
      (ticket.category || '').toLowerCase() === 'hardware' &&
      (ticket.title.toLowerCase().startsWith('hardware request') ||
        ticket.title.toLowerCase().includes('request:') ||
        ticket.title.toLowerCase().includes('request equipment') ||
        (ticket.description || '').toLowerCase().includes('requested equipment:'))
  );

  return (
    <div className="enterprise-modal-overlay" onClick={onClose}>
      <div
        className="enterprise-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-ticket-modal-title"
      >
        {/* Modal Header */}
        <div className="enterprise-modal-header">
          <div>
            <div className="enterprise-modal-kicker">ENTERPRISE DISPATCH DIRECTORY</div>
            <h2 id="assign-ticket-modal-title" className="enterprise-modal-title">
              Assign Support Ticket
            </h2>
          </div>
          <button className="enterprise-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Ticket Context Banner */}
        <div className="enterprise-modal-context-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
              <IconTicket size={16} color="var(--color-accent)" /> {ticketNumber}
            </span>
            <span className={`badge badge-${ticket.priority?.toLowerCase() || 'medium'}`} style={{ fontSize: '0.72rem' }}>
              {ticket.priority}
            </span>
            <span className="warm-pill warm-pill-neutral" style={{ fontSize: '0.72rem' }}>
              📁 {ticket.category}
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
              <strong>Title:</strong> {ticket.title}
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
              <strong>Requester:</strong> {requesterName}
            </span>
            {ticket.asset && (
              <span style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>
                💻 {ticket.asset.asset_tag || `AST-${ticket.asset.id}`}
              </span>
            )}
          </div>

          {/* Quick Hardware inventory switch if applicable */}
          {isHardwareRequest && onSwitchToHardware && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                onSwitchToHardware(ticket);
              }}
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconBox size={13} /> Open Hardware Inventory
              </span>
            </button>
          )}
        </div>

        {/* Toolbar: Search & Faceted Filter Chips */}
        <div className="enterprise-modal-toolbar">
          <div className="enterprise-modal-search">
            <span className="enterprise-modal-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search directory by engineer name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Role & Workload Faceted Filters */}
          <div className="enterprise-modal-filters">
            <span style={{ fontSize: '0.74rem', fontWeight: 600, opacity: 0.7 }}>Role:</span>
            <button
              type="button"
              className={`enterprise-filter-chip ${roleFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setRoleFilter('ALL')}
            >
              All Staff
            </button>
            <button
              type="button"
              className={`enterprise-filter-chip ${roleFilter === 'SUPPORT' ? 'active' : ''}`}
              onClick={() => setRoleFilter('SUPPORT')}
            >
              IT Support
            </button>
            <button
              type="button"
              className={`enterprise-filter-chip ${roleFilter === 'ADMIN' ? 'active' : ''}`}
              onClick={() => setRoleFilter('ADMIN')}
            >
              System Admin
            </button>

            <span style={{ fontSize: '0.74rem', fontWeight: 600, opacity: 0.7, marginLeft: '0.4rem' }}>Workload:</span>
            <button
              type="button"
              className={`enterprise-filter-chip ${workloadFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setWorkloadFilter('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={`enterprise-filter-chip ${workloadFilter === 'AVAILABLE' ? 'active' : ''}`}
              onClick={() => setWorkloadFilter('AVAILABLE')}
              title="Show engineers with 0 active tickets"
            >
              Available Now (0)
            </button>
            <button
              type="button"
              className={`enterprise-filter-chip ${workloadFilter === 'LIGHT' ? 'active' : ''}`}
              onClick={() => setWorkloadFilter('LIGHT')}
              title="Show engineers with ≤ 2 active tickets"
            >
              Light Load (≤2)
            </button>
          </div>
        </div>

        {/* Directory Data Table (Multi-Column Wide Enterprise Layout) */}
        <div className="enterprise-modal-body">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              Querying enterprise directory…
            </div>
          ) : filteredAndSortedStaff.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              <IconUser size={32} color="var(--color-text-secondary)" />
              <p style={{ marginTop: '0.5rem' }}>
                No IT support engineers match the search criteria & filters.
              </p>
            </div>
          ) : (
            <table className="enterprise-directory-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Select</th>
                  <th>Engineer & Contact</th>
                  <th style={{ width: '130px' }}>Role</th>
                  <th style={{ width: '180px' }}>Current Workload</th>
                  <th style={{ width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStaff.map((staff) => {
                  const isSelected = selectedUser?.id === staff.id;
                  const workload = engineerWorkloads[staff.id] || 0;
                  const initials = staff.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const workloadClass =
                    workload === 0 ? 'workload-low' : workload <= 2 ? 'workload-med' : 'workload-high';

                  return (
                    <tr
                      key={staff.id}
                      className={`enterprise-directory-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(staff)}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="radio"
                          name="selected_support_engineer"
                          checked={isSelected}
                          onChange={() => setSelectedUser(staff)}
                          style={{ accentColor: '#8b3a04', cursor: 'pointer' }}
                        />
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--color-accent, #8b3a04)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {staff.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background:
                              staff.role === 'ADMIN' ? 'rgba(139, 58, 4, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                            color: staff.role === 'ADMIN' ? '#8b3a04' : '#2563eb',
                          }}
                        >
                          {staff.role}
                        </span>
                      </td>

                      <td>
                        <span className={`workload-indicator ${workloadClass}`}>
                          ● {workload} active ticket{workload === 1 ? '' : 's'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Ready
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Reason for Assignment / Audit Note */}
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #ebdccf', background: 'var(--color-bg-primary)' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem', opacity: 0.85 }}>
            Audit Reason for Assignment / Reassignment (Optional):
          </label>
          <input
            type="text"
            className="priority-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Workload balancing, specialist domain expertise, priority escalation..."
          />
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              margin: '0.5rem 1.5rem',
              padding: '0.5rem 0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.78rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Footer: Selection Summary & Actions */}
        <div className="enterprise-modal-footer">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {selectedUser ? (
              <span>
                Assigning to: <strong>{selectedUser.full_name}</strong> ({selectedUser.role} ·{' '}
                {engineerWorkloads[selectedUser.id] || 0} active tickets)
              </span>
            ) : (
              <span>Please select an engineer from the directory above.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="button" className="btn-warm-secondary" onClick={onClose} disabled={assigning}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-warm-terracotta"
              disabled={!selectedUser || assigning}
              onClick={handleConfirm}
              style={{ minWidth: '150px' }}
            >
              {assigning ? 'Assigning…' : selectedUser ? `Confirm Assignment` : 'Select Engineer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignTicketDrawer;
