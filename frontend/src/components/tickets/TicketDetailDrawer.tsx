import React, { useState, useEffect } from 'react';
import { Ticket, TicketPriority } from '../../types';
import { IconBox, IconLaptop } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/ticketService';

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  isEmployee?: boolean;
  onCloseTicket?: (ticketId: number) => void;
  onOpenAssignAsset?: (ticket: Ticket) => void;
  onResolveTicket?: (ticketId: number) => void;
  onTicketUpdated?: (ticket: Ticket) => void;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  isEmployee: isEmployeeProp,
  onCloseTicket,
  onOpenAssignAsset,
  onResolveTicket,
  onTicketUpdated,
}) => {
  const { user } = useAuth();
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(ticket);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(ticket?.priority || 'MEDIUM');
  const [priorityReason, setPriorityReason] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [prioritySuccess, setPrioritySuccess] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTicket(ticket);
    setIsEditingPriority(false);
    setPriorityReason('');
    setPriorityError(null);
    setPrioritySuccess(null);
    if (ticket) {
      setSelectedPriority(ticket.priority);
    }
  }, [ticket]);

  if (!isOpen || !currentTicket) return null;

  const isAdmin = user?.role === 'ADMIN';
  const isSupport = user?.role === 'SUPPORT';
  const isEmployee = user ? user.role === 'EMPLOYEE' : Boolean(isEmployeeProp);
  const isAssignedToMe = Boolean(
    user &&
    (currentTicket.assigned_to_id === user.id ||
      (typeof currentTicket.assigned_to === 'object' && (currentTicket.assigned_to as any)?.id === user.id))
  );

  const canChangePriority =
    !isEmployee &&
    (isAdmin || (isSupport && isAssignedToMe)) &&
    currentTicket.status !== 'RESOLVED' &&
    currentTicket.status !== 'CLOSED';

  const ticketNumber = currentTicket.ticket_number || currentTicket.ticket_id || `INC-${currentTicket.id}`;
  const requesterName =
    currentTicket.created_by_name ||
    (currentTicket.created_by && typeof currentTicket.created_by === 'object'
      ? (currentTicket.created_by as any).full_name
      : null) ||
    'Employee';

  const assignedName =
    currentTicket.assigned_to_name ||
    (currentTicket.assigned_to && typeof currentTicket.assigned_to === 'object'
      ? (currentTicket.assigned_to as any).full_name
      : null);

  const isHardwareRequest =
    (currentTicket.category || '').toLowerCase() === 'hardware' &&
    (currentTicket.title.toLowerCase().startsWith('hardware request') ||
      currentTicket.title.toLowerCase().includes('request:') ||
      currentTicket.title.toLowerCase().includes('request equipment') ||
      (currentTicket.description || '').toLowerCase().includes('requested equipment:'));

  const createdDate = currentTicket.created_at
    ? new Date(currentTicket.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const resolvedDate = currentTicket.resolved_at
    ? new Date(currentTicket.resolved_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const slaDeadlineFormatted = currentTicket.sla_deadline
    ? new Date(currentTicket.sla_deadline).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const isBreached = Boolean(
    currentTicket.is_sla_breached ||
    currentTicket.sla_breached ||
    (currentTicket.sla_deadline &&
      new Date(currentTicket.sla_deadline) < new Date() &&
      currentTicket.status !== 'RESOLVED' &&
      currentTicket.status !== 'CLOSED')
  );

  const handleUpdatePriority = async () => {
    if (!currentTicket) return;
    setUpdatingPriority(true);
    setPriorityError(null);
    setPrioritySuccess(null);
    try {
      const updated = await ticketService.updatePriority(
        currentTicket.id,
        selectedPriority,
        priorityReason.trim() || undefined
      );
      setCurrentTicket(updated);
      setPrioritySuccess(`Priority updated to ${selectedPriority}. SLA deadline recalculated.`);
      setIsEditingPriority(false);
      setPriorityReason('');
      onTicketUpdated?.(updated);
    } catch (err: any) {
      setPriorityError(err?.response?.data?.detail || 'Failed to update priority.');
    } finally {
      setUpdatingPriority(false);
    }
  };

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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span
            className={`warm-pill warm-pill-${
              currentTicket.status === 'RESOLVED'
                ? 'resolved'
                : currentTicket.status === 'CLOSED'
                ? 'closed'
                : currentTicket.status === 'IN_PROGRESS'
                ? 'progress'
                : currentTicket.status === 'ASSIGNED'
                ? 'assigned'
                : 'open'
            }`}
            style={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            ● {currentTicket.status.replace('_', ' ')}
          </span>

          <span
            className={`badge badge-${currentTicket.priority?.toLowerCase() || 'medium'}`}
            style={{ fontSize: '0.72rem' }}
          >
            {currentTicket.priority}
          </span>

          {canChangePriority && (
            <button
              type="button"
              className={`btn-edit-priority-toggle ${isEditingPriority ? 'active' : ''}`}
              onClick={() => {
                setIsEditingPriority((prev) => !prev);
                setPriorityError(null);
                setPrioritySuccess(null);
              }}
              title="Change ticket priority and recalculate SLA deadline"
            >
              <span>✏️</span>
              <span>{isEditingPriority ? 'Close Priority Editor' : 'Edit Priority'}</span>
            </button>
          )}

          <span className="warm-pill warm-pill-neutral" style={{ fontSize: '0.72rem' }}>
            📁 {currentTicket.category}
          </span>

          {currentTicket.assignment_mode && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                background: currentTicket.assignment_mode === 'AUTO' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                color: currentTicket.assignment_mode === 'AUTO' ? '#4f46e5' : '#4b5563',
              }}
            >
              {currentTicket.assignment_mode === 'AUTO' ? '🤖 Auto-Assigned' : '👤 Manually Assigned'}
            </span>
          )}

          {currentTicket.asset && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <IconLaptop size={11} /> {currentTicket.asset.asset_tag || `AST-${currentTicket.asset.id}`}
            </span>
          )}
        </div>

        {/* SLA Information Bar */}
        {slaDeadlineFormatted && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              background: isBreached ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${isBreached ? '#fecaca' : '#bbf7d0'}`,
              color: isBreached ? '#b91c1c' : '#166534',
              marginBottom: '0.85rem',
            }}
          >
            <span>
              <strong>SLA Target:</strong> {slaDeadlineFormatted}
            </span>
            <span
              style={{
                fontWeight: 700,
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: isBreached ? '#fee2e2' : '#dcfce7',
                color: isBreached ? '#dc2626' : '#15803d',
              }}
            >
              {isBreached ? '⚠️ BREACHED' : '✓ IN COMPLIANCE'}
            </span>
          </div>
        )}

        {/* Priority Editor Form (Theme Matched) */}
        {isEditingPriority && (
          <div className="priority-editor-box">
            <div className="priority-editor-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🎯</span>
                <span>Change Ticket Priority</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingPriority(false);
                  setPriorityError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  color: 'inherit',
                  opacity: 0.6,
                  padding: '0.1rem 0.35rem',
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="priority-editor-subheader">
              Selecting a new priority automatically recalculates the SLA resolution target deadline.
            </div>

            {/* Quick Select Chips */}
            <div className="priority-chips-grid">
              <button
                type="button"
                className={`priority-chip-btn ${selectedPriority === 'LOW' ? 'selected-low' : ''}`}
                onClick={() => setSelectedPriority('LOW')}
              >
                <span className="priority-chip-title" style={{ color: '#059669' }}>
                  🟢 Low
                </span>
                <span className="priority-chip-sla">24h SLA</span>
              </button>
              <button
                type="button"
                className={`priority-chip-btn ${selectedPriority === 'MEDIUM' ? 'selected-medium' : ''}`}
                onClick={() => setSelectedPriority('MEDIUM')}
              >
                <span className="priority-chip-title" style={{ color: '#2563eb' }}>
                  🔵 Medium
                </span>
                <span className="priority-chip-sla">8h SLA</span>
              </button>
              <button
                type="button"
                className={`priority-chip-btn ${selectedPriority === 'HIGH' ? 'selected-high' : ''}`}
                onClick={() => setSelectedPriority('HIGH')}
              >
                <span className="priority-chip-title" style={{ color: '#ea580c' }}>
                  🟠 High
                </span>
                <span className="priority-chip-sla">4h SLA</span>
              </button>
              <button
                type="button"
                className={`priority-chip-btn ${selectedPriority === 'CRITICAL' ? 'selected-critical' : ''}`}
                onClick={() => setSelectedPriority('CRITICAL')}
              >
                <span className="priority-chip-title" style={{ color: '#dc2626' }}>
                  🔴 Critical
                </span>
                <span className="priority-chip-sla">2h SLA</span>
              </button>
            </div>

            {/* Dropdown Menu (Theme-matched) */}
            <div style={{ marginBottom: '0.65rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'inherit',
                  opacity: 0.85,
                }}
              >
                Or select from dropdown:
              </label>
              <select
                className="priority-select-dropdown"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
              >
                <option value="LOW">🟢 LOW — 24 Hour SLA Target</option>
                <option value="MEDIUM">🔵 MEDIUM — 8 Hour SLA Target</option>
                <option value="HIGH">🟠 HIGH — 4 Hour SLA Target</option>
                <option value="CRITICAL">🔴 CRITICAL — 2 Hour SLA Target</option>
              </select>
            </div>

            {/* Optional Reason Input */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'inherit',
                  opacity: 0.85,
                }}
              >
                Audit Reason (Optional):
              </label>
              <input
                type="text"
                className="priority-reason-input"
                placeholder="e.g. Executive escalation, operational urgency, customer impact..."
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
              />
            </div>

            {priorityError && (
              <div
                style={{
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  marginBottom: '0.65rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '4px',
                  background: 'rgba(220, 38, 38, 0.08)',
                }}
              >
                ⚠️ {priorityError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-warm-secondary"
                onClick={() => {
                  setIsEditingPriority(false);
                  setPriorityError(null);
                }}
                disabled={updatingPriority}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-warm-terracotta"
                onClick={handleUpdatePriority}
                disabled={updatingPriority || selectedPriority === currentTicket.priority}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
              >
                {updatingPriority ? 'Updating...' : `Set to ${selectedPriority}`}
              </button>
            </div>
          </div>
        )}

        {prioritySuccess && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              color: '#059669',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              marginBottom: '0.85rem',
            }}
          >
            ✓ {prioritySuccess}
          </div>
        )}

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {/* PROMINENT RESOLUTION NOTICE (Crucial for Requester!) */}
          {currentTicket.resolution_notes ? (
            <div
              style={{
                background: currentTicket.status === 'RESOLVED' ? '#ecfdf5' : '#f5f5f4',
                border: `1.5px solid ${currentTicket.status === 'RESOLVED' ? '#10b981' : '#d6d3d1'}`,
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.15rem' }}>{currentTicket.status === 'RESOLVED' ? '✅' : 'ℹ️'}</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    color: currentTicket.status === 'RESOLVED' ? '#065f46' : '#292524',
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
                  color: currentTicket.status === 'RESOLVED' ? '#047857' : '#44403c',
                  background: 'rgba(255, 255, 255, 0.7)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                {currentTicket.resolution_notes}
              </div>

              {resolvedDate && (
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.4rem', textAlign: 'right' }}>
                  Resolved on: {resolvedDate}
                </div>
              )}

              {currentTicket.asset && (
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
                  <IconLaptop size={14} color="var(--color-accent)" />
                  <span>
                    Hardware Assigned:{' '}
                    <strong>{currentTicket.asset.asset_tag}</strong> ({currentTicket.asset.brand} {currentTicket.asset.model})
                  </span>
                </div>
              )}
            </div>
          ) : currentTicket.status === 'RESOLVED' ? (
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
              {currentTicket.title}
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
                {currentTicket.category}
              </div>
            </div>

            {currentTicket.description && (
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
                  {currentTicket.description}
                </div>
              </div>
            )}
          </div>

          {/* History / Audit Log */}
          {currentTicket.history && currentTicket.history.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Activity & Workflow History
              </div>

              <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: '0.75rem', marginLeft: '0.35rem' }}>
                {currentTicket.history.map((h, i) => {
                  let actionTitle = 'Action logged';
                  let actionColor = '#6366f1';

                  const actor = h.changed_by_name || (h.changed_by_id ? `User #${h.changed_by_id}` : 'System');
                  const isSystem = !h.changed_by_id || actor.toLowerCase() === 'system';

                  if (h.action_type === 'CREATED') {
                    actionTitle = `Ticket created by ${actor}`;
                    actionColor = '#10b981';
                  } else if (h.action_type === 'AUTO_ASSIGNMENT') {
                    actionTitle = `🤖 System auto-assigned to ${h.new_assignee_name || 'Support engineer'}`;
                    actionColor = '#6366f1';
                  } else if (h.action_type === 'ASSIGNED') {
                    actionTitle = `👤 Assigned to ${h.new_assignee_name || 'engineer'} by ${actor}`;
                    actionColor = '#2563eb';
                  } else if (h.action_type === 'REASSIGNED') {
                    actionTitle = `🔄 Reassigned: ${h.previous_assignee_name || 'Unassigned'} → ${h.new_assignee_name || 'engineer'} by ${actor}`;
                    actionColor = '#d97706';
                  } else if (h.action_type === 'PRIORITY_CHANGED') {
                    actionTitle = `🔥 Priority changed: ${h.previous_priority || 'N/A'} → ${h.new_priority} by ${actor}`;
                    actionColor = '#dc2626';
                  } else if (h.new_status) {
                    actionTitle = (h.previous_status || h.old_status)
                      ? `Status changed: ${h.previous_status || h.old_status} → ${h.new_status} by ${actor}`
                      : `Status set to ${h.new_status} by ${actor}`;
                    actionColor = '#4f46e5';
                  }

                  return (
                    <div key={h.id || i} style={{ marginBottom: '0.75rem', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '-1.05rem',
                          top: '0.2rem',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: actionColor,
                        }}
                      />
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {actionTitle}
                      </div>
                      {h.comment && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            marginTop: '0.15rem',
                            background: 'rgba(0, 0, 0, 0.02)',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                            borderLeft: `2px solid ${actionColor}`,
                          }}
                        >
                          {h.comment}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                        {h.created_at ? new Date(h.created_at).toLocaleString() : ''}
                        {isSystem && ' • Automated Task'}
                      </div>
                    </div>
                  );
                })}
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
          {isEmployee && currentTicket.status === 'RESOLVED' && onCloseTicket && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onCloseTicket(currentTicket.id);
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

          {/* Support / Admin Actions in Drawer */}
          {!isEmployee && currentTicket.status !== 'RESOLVED' && currentTicket.status !== 'CLOSED' && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {isHardwareRequest && onOpenAssignAsset && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenAssignAsset(currentTicket);
                  }}
                  style={{ fontSize: '0.8rem', background: '#4f46e5', borderColor: '#4338ca' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><IconBox size={13} /> Assign Hardware</span>
                </button>
              )}
              {onResolveTicket && !isHardwareRequest && (currentTicket.status === 'IN_PROGRESS' || currentTicket.status === 'ASSIGNED') && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onResolveTicket(currentTicket.id);
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
