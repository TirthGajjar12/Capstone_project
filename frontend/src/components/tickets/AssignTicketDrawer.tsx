import React, { useState, useEffect } from 'react';
import { Ticket, User } from '../../types';
import { ticketService, userService } from '../../services/ticketService';

interface AssignTicketDrawerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  onSwitchToHardware?: (ticket: Ticket) => void;
}

export const AssignTicketDrawer: React.FC<AssignTicketDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  onAssigned,
  onSwitchToHardware,
}) => {
  const [search, setSearch] = useState('');
  const [supportStaff, setSupportStaff] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search when user types or on drawer open
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedUser(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all active users and filter to SUPPORT / ADMIN staff
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
      await ticketService.assign(ticket.id, selectedUser.id);
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign ticket.');
    } finally {
      setAssigning(false);
    }
  };

  const getPriorityColor = (p: string) => {
    const priority = (p || '').toUpperCase();
    if (priority === 'CRITICAL') return { color: '#dc2626', bg: '#fee2e2' };
    if (priority === 'HIGH') return { color: '#ea580c', bg: '#ffedd5' };
    if (priority === 'MEDIUM') return { color: '#2563eb', bg: '#dbeafe' };
    return { color: '#059669', bg: '#d1fae5' };
  };

  const pStyle = getPriorityColor(ticket.priority);

  const isHardwareRequest =
    Boolean(ticket &&
    (ticket.category || '').toLowerCase() === 'hardware' &&
    (ticket.title.toLowerCase().startsWith('hardware request') ||
      ticket.title.toLowerCase().includes('request:') ||
      ticket.title.toLowerCase().includes('request equipment') ||
      (ticket.description || '').toLowerCase().includes('requested equipment:')));

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div className="drawer-kicker">INCIDENT DISPATCH & WORKFLOW</div>
            <h2 className="drawer-title">Assign Support Ticket</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {/* Hardware Request Notice & Switch */}
        {isHardwareRequest && (
          <div
            style={{
              background: '#e0e7ff',
              border: '1.5px solid #818cf8',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#3730a3', fontWeight: 700, fontSize: '0.86rem' }}>
              <span>📦</span>
              <span>Hardware Allocation Request</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#4338ca', lineHeight: 1.4 }}>
              This is a hardware request for <strong>{ticket.title}</strong>. For hardware requests, available devices should be provisioned from inventory rather than assigning an engineer.
            </p>
            {onSwitchToHardware && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onSwitchToHardware(ticket);
                }}
                style={{
                  alignSelf: 'flex-start',
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  background: '#4f46e5',
                  borderColor: '#4338ca',
                }}
              >
                📦 Open Hardware Inventory
              </button>
            )}
          </div>
        )}

        {/* Selected Ticket Summary Card */}
        <div className="drawer-asset-card" style={{ marginBottom: '1.25rem' }}>
          <div className="drawer-asset-badge">
            <span className="drawer-asset-icon">🎫</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span className="drawer-asset-tag">{ticketNumber}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    color: pStyle.color,
                    background: pStyle.bg,
                    textTransform: 'uppercase',
                  }}
                >
                  {ticket.priority}
                </span>
              </div>
              <div className="drawer-asset-name" style={{ marginTop: '0.2rem' }}>
                {ticket.title}
              </div>
            </div>
          </div>

          <div className="drawer-asset-meta" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div>
              <span className="drawer-meta-label">Category:</span> {ticket.category}
            </div>
            <div>
              <span className="drawer-meta-label">Requester:</span> {requesterName}
            </div>
            {ticket.asset && (
              <div style={{ width: '100%', color: '#6366f1' }}>
                <span className="drawer-meta-label">Asset:</span>{' '}
                {ticket.asset.asset_tag || `AST-${ticket.asset.id}`} ({ticket.asset.brand} {ticket.asset.model})
              </div>
            )}
          </div>

          {ticket.description && (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                marginTop: '0.65rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--color-border)',
                lineHeight: 1.4,
              }}
            >
              {ticket.description.length > 120 ? `${ticket.description.slice(0, 120)}…` : ticket.description}
            </div>
          )}
        </div>

        {/* Search Support Engineers */}
        <div className="drawer-section">
          <label className="drawer-label">Assign To IT Support Engineer</label>
          <div className="drawer-search-wrapper">
            <span>🔍</span>
            <input
              type="text"
              className="drawer-search-input"
              placeholder="Search support staff by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <p className="drawer-hint">
            Select an IT support engineer or admin to take ownership of this incident.
          </p>
        </div>

        {/* Support Staff Scrollable List */}
        <div className="drawer-user-list">
          {loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              Finding engineers…
            </div>
          ) : supportStaff.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              No support engineers found matching "{search}".
            </div>
          ) : (
            supportStaff.map((staff) => {
              const isSelected = selectedUser?.id === staff.id;
              const staffInitials = staff.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={staff.id}
                  className={`drawer-user-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(staff)}
                >
                  <div className="drawer-user-avatar">{staffInitials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="drawer-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {staff.full_name}
                      </div>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          background: staff.role === 'ADMIN' ? 'rgba(139, 58, 4, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                          color: staff.role === 'ADMIN' ? '#8b3a04' : '#2563eb',
                        }}
                      >
                        {staff.role}
                      </span>
                    </div>
                    <div className="drawer-user-email" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {staff.email}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="assigned_support_user"
                    checked={isSelected}
                    onChange={() => setSelectedUser(staff)}
                    style={{ accentColor: '#8b3a04', cursor: 'pointer' }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              padding: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.8rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
          <button
            type="button"
            className="btn-warm-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={assigning}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-warm-terracotta"
            style={{ flex: 1 }}
            disabled={!selectedUser || assigning}
            onClick={handleConfirm}
          >
            {assigning ? 'Assigning…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTicketDrawer;
