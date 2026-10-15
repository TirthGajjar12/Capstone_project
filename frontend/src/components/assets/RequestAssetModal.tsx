import React, { useState } from 'react';
import { assetService } from '../../services/ticketService';

interface RequestAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted?: () => void;
}

const EQUIPMENT_OPTIONS = [
  { label: 'Laptop / Workstation', type: 'Laptop' },
  { label: 'External Monitor / Display', type: 'Monitor' },
  { label: 'Keyboard', type: 'Keyboard' },
  { label: 'Mouse / Trackpad', type: 'Mouse' },
  { label: 'Printer / Scanner', type: 'Printer' },
];

export const RequestAssetModal: React.FC<RequestAssetModalProps> = ({
  isOpen,
  onClose,
  onRequestSubmitted,
}) => {
  const [selectedType, setSelectedType] = useState('Laptop');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason or business justification.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const ticket = await assetService.requestAsset({
        asset_type: selectedType,
        reason: reason.trim(),
      });
      setSuccessTicket(ticket.ticket_number || `TKT-${ticket.id}`);
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit equipment request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setSuccessTicket(null);
    setReason('');
    setSelectedType('Laptop');
    setError(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleDone}>
      <div className="modal-content request-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div className="modal-kicker">Equipment Provisioning</div>
            <h2 className="modal-title">Request Hardware & Equipment</h2>
          </div>
          <button className="modal-close-btn" onClick={handleDone} aria-label="Close modal">
            ✕
          </button>
        </div>

        {successTicket ? (
          <div className="request-success-panel">
            <div className="request-success-icon">✅</div>
            <h3>Request Submitted</h3>
            <p>
              Your equipment request has been logged under support ticket <strong>{successTicket}</strong>. The IT support team will review available inventory and allocate your hardware.
            </p>
            <div className="request-success-sla">
              Status: <strong>Open Ticket #{successTicket}</strong>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn-warm-terracotta"
                onClick={handleDone}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

            {/* Equipment Type */}
            <div className="form-group">
              <label htmlFor="request-device-type" className="form-label">
                Required Equipment Type *
              </label>
              <select
                id="request-device-type"
                className="form-control"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <option key={opt.type} value={opt.type}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason / Justification */}
            <div className="form-group">
              <label htmlFor="request-reason" className="form-label">
                Business Justification / Reason *
              </label>
              <textarea
                id="request-reason"
                className="form-control"
                rows={3}
                placeholder="Explain why this equipment is needed (e.g. current device broken, joining new project, need additional screen)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-warm-secondary"
                onClick={handleDone}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-warm-terracotta"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RequestAssetModal;
