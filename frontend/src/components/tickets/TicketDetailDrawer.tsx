import React from 'react';
import { Ticket } from '../../types';

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  isEmployee: boolean;
  onCloseTicket?: (ticketId: number) => void;
  onOpenAssignAsset?: (ticket: Ticket) => void;
  onResolveTicket?: (ticketId: number) => void;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  isEmployee,
  onCloseTicket,
  onOpenAssignAsset,
  onResolveTicket,
}) => {
  if (!isOpen || !ticket) return null;

  const ticketNumber = ticket.ticket_number || ticket.ticket_id || `INC-${ticket.id}`;
  const requesterName =
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

  const isHardwareRequest =
    ticket.category === 'Hardware' &&
    (ticket.title.toLowerCase().startsWith('hardware request') ||
      ticket.title.toLowerCase().includes('request:') ||
      ticket.title.toLowerCase().includes('request equipment') ||
      ticket.description.toLowerCase().includes('requested equipment:'));

  const createdDate = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const resolvedDate = ticket.resolved_at
    ? new Date(ticket.resolved_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        style={{ width: '520px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header" style={{ marginBottom: '1rem' }}>
          <div>
            <div className="drawer-kicker">TICKET INSPECTION & RESOLUTION AUDIT</div>
            <h2 className="drawer-title" style={{ fontSize: '1.4rem' }}>{ticketNumber}</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {/* Status & Priority Badge Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span
            className={`warm-pill warm-pill-${
              ticket.status === 'RESOLVED'
                ? 'resolved'
                : ticket.status === 'CLOSED'
                ? 'closed'
                : ticket.status === 'IN_PROGRESS'
                ? 'progress'
                : ticket.status === 'ASSIGNED'
                ? 'assigned'
                : 'open'
            }`}
            style={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            ● {ticket.status.replace('_', ' ')}
          </span>

          <span
            className={`badge badge-${ticket.priority?.toLowerCase() || 'medium'}`}
            style={{ fontSize: '0.72rem' }}
          >
            {ticket.priority}
          </span>

          <span className="warm-pill warm-pill-neutral" style={{ fontSize: '0.72rem' }}>
            📁 {ticket.category}
          </span>

          {ticket.asset && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              💻 {ticket.asset.asset_tag || `AST-${ticket.asset.id}`}
            </span>
          )}
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {/* PROMINENT RESOLUTION NOTICE (Crucial for Requester!) */}
          {ticket.resolution_notes ? (
            <div
              style={{
                background: ticket.status === 'RESOLVED' ? '#ecfdf5' : '#f5f5f4',
                border: `1.5px solid ${ticket.status === 'RESOLVED' ? '#10b981' : '#d6d3d1'}`,
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.15rem' }}>{ticket.status === 'RESOLVED' ? '✅' : 'ℹ️'}</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    color: ticket.status === 'RESOLVED' ? '#065f46' : '#292524',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Resolution Reason / Actions Taken
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  color: ticket.status === 'RESOLVED' ? '#047857' : '#44403c',
                  background: 'rgba(255, 255, 255, 0.7)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                {ticket.resolution_notes}
              </div>

              {resolvedDate && (
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.4rem', textAlign: 'right' }}>
                  Resolved on: {resolvedDate}
                </div>
              )}

              {ticket.asset && (
                <div
                  style={{
                    marginTop: '0.65rem',
                    padding: '0.5rem 0.75rem',
                    background: '#e0e7ff',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    color: '#3730a3',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <span>💻</span>
                  <span>
                    Hardware Assigned:{' '}
                    <strong>{ticket.asset.asset_tag}</strong> ({ticket.asset.brand} {ticket.asset.model})
                  </span>
                </div>
              )}
            </div>
          ) : ticket.status === 'RESOLVED' ? (
            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                color: '#92400e',
              }}
            >
              ⚠️ This ticket has been marked as Resolved without additional notes.
            </div>
          ) : null}

          {/* Ticket Information Card */}
          <div
            style={{
              background: 'var(--color-bg-secondary, #fafaf9)',
              border: '1px solid #e7ded4',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
              {ticket.title}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Requester: </span>
                <strong>{requesterName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Assigned To: </span>
                <strong style={{ color: assignedName ? '#6366f1' : '#888' }}>
                  {assignedName || 'Unassigned'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Created: </span>
                {createdDate}
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Category: </span>
                {ticket.category}
              </div>
            </div>

            {ticket.description && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                  Description / Request Details:
                </div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-primary, #ffffff)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {ticket.description}
                </div>
              </div>
            )}
          </div>

          {/* History / Audit Log */}
          {ticket.history && ticket.history.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Activity & Workflow History
              </div>

              <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: '0.75rem', marginLeft: '0.35rem' }}>
                {ticket.history.map((h, i) => (
                  <div key={h.id || i} style={{ marginBottom: '0.65rem', position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-1.05rem',
                        top: '0.25rem',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#6366f1',
                      }}
                    />
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {h.new_status
                        ? (h.previous_status || h.old_status)
                          ? `Status changed: ${h.previous_status || h.old_status} → ${h.new_status}`
                          : `Status set to ${h.new_status}`
                        : 'Action performed'}
                    </div>
                    {h.comment && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.1rem' }}>
                        {h.comment}
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                      {h.created_at ? new Date(h.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div
          className="drawer-footer"
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8rem' }}>
            Close View
          </button>

          {/* Employee Close Confirmation Action */}
          {isEmployee && ticket.status === 'RESOLVED' && onCloseTicket && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onCloseTicket(ticket.id);
                onClose();
              }}
              style={{
                fontSize: '0.8rem',
                background: '#059669',
                borderColor: '#047857',
              }}
            >
              ✓ Confirm & Close Ticket
            </button>
          )}

          {/* Support Actions in Drawer */}
          {!isEmployee && (ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS') && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {isHardwareRequest && onOpenAssignAsset && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenAssignAsset(ticket);
                  }}
                  style={{ fontSize: '0.8rem', background: '#4f46e5', borderColor: '#4338ca' }}
                >
                  📦 Assign Hardware
                </button>
              )}
              {onResolveTicket && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onResolveTicket(ticket.id);
                  }}
                  style={{ fontSize: '0.8rem', background: '#059669', borderColor: '#047857' }}
                >
                  Resolve
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailDrawer;
