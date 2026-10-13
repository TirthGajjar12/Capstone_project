import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService, assetService } from '../../services/ticketService';
import { TicketCategory, TicketPriority, Asset } from '../../types';

/**
 * TicketForm — create a new support ticket.
 *
 * Allows normal employees to report issues for specific assigned devices.
 */
const TicketForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedAssetId = searchParams.get('asset_id') || '';
  const preselectedAssetName = searchParams.get('asset_name') || '';

  const [title, setTitle] = useState(
    preselectedAssetName ? `Issue with ${preselectedAssetName}` : ''
  );
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>(
    preselectedAssetId ? 'Hardware' : 'Hardware'
  );
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(preselectedAssetId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch assets assigned to this user so they can attach their device to the ticket
    assetService
      .getAll()
      .then((data) => {
        setMyAssets(data);
        if (preselectedAssetId) {
          setSelectedAssetId(preselectedAssetId);
        }
      })
      .catch(() => setMyAssets([]));
  }, [preselectedAssetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ticketService.create({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        created_by: user?.id,
        asset_id: selectedAssetId ? Number(selectedAssetId) : undefined,
      });
      navigate('/tickets');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create ticket. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Create Ticket</h1>
          <p>Submit a new IT support request</p>
        </div>
      </div>

      <div className="page-body form-page">
        <div className="form-card">
          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Device / Asset Selector */}
            <div className="form-group">
              <label htmlFor="ticket-asset">Affected Device / Hardware (Optional)</label>
              <select
                id="ticket-asset"
                value={selectedAssetId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAssetId(val);
                  if (val && category !== 'Hardware') {
                    setCategory('Hardware');
                  }
                  if (val && !title) {
                    const match = myAssets.find((a) => String(a.id) === val);
                    if (match) {
                      const tag = match.asset_tag || match.asset_id || `AST-${match.id}`;
                      setTitle(`Issue with ${tag} (${match.brand} ${match.model})`);
                    }
                  }
                }}
              >
                <option value="">-- No specific device / General request --</option>
                {myAssets.map((a) => {
                  const tag = a.asset_tag || a.asset_id || `AST-${a.id}`;
                  return (
                    <option key={a.id} value={a.id}>
                      {tag} — {a.brand} {a.model} ({a.asset_type})
                    </option>
                  );
                })}
              </select>
              {myAssets.length > 0 ? (
                <small style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '0.3rem', display: 'block' }}>
                  Select the assigned hardware experiencing this issue, or choose from your inventory.
                </small>
              ) : (
                <small style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '0.3rem', display: 'block' }}>
                  No hardware currently assigned to your account. You can still submit software, network, or access tickets.
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="ticket-title">Title *</label>
              <input
                id="ticket-title"
                type="text"
                placeholder="Brief summary of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="ticket-description">Description *</label>
              <textarea
                id="ticket-description"
                placeholder="Describe the issue in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ticket-category">Category</label>
                <select
                  id="ticket-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                >
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Network">Network</option>
                  <option value="Access">Access</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ticket-priority">Priority</label>
                <select
                  id="ticket-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Create Ticket'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/tickets')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default TicketForm;