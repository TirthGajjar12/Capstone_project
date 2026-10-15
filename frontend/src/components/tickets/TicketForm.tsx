import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService, assetService } from '../../services/ticketService';
import { Asset } from '../../types';

export const TicketForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Guard: strictly only employees can create support tickets
  useEffect(() => {
    if (user && user.role !== 'EMPLOYEE') {
      navigate('/tickets', { replace: true });
    }
  }, [user, navigate]);

  const preselectedAssetId = searchParams.get('asset_id') || '';
  const preselectedAssetName = searchParams.get('asset_name') || '';

  const [title, setTitle] = useState(
    preselectedAssetName ? `Issue with ${preselectedAssetName}` : ''
  );
  const [description, setDescription] = useState('');
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(preselectedAssetId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      // Category and Priority are automatically determined by backend NLP & rule-based triage
      await ticketService.create({
        title: title.trim(),
        description: description.trim(),
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
    <div className="modern-form-wrapper">
      <div className="modern-form-header">
        <Link to="/tickets" className="form-back-link">
          ← Back to Support Tickets
        </Link>
        <h1 className="modern-form-title">Create Support Ticket</h1>
        <p className="modern-form-subtitle">
          Submit a new technical request, software glitch, or hardware problem.
        </p>
      </div>

      <div className="modern-form-card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Affected Device Selector */}
          <div className="form-group">
            <label htmlFor="ticket-asset" className="form-label">
              Affected Device / Hardware (Optional)
            </label>
            <select
              id="ticket-asset"
              className="form-control"
              value={selectedAssetId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAssetId(val);
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
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              Select the assigned device experiencing this problem, or leave empty for general requests.
            </div>
          </div>

          {/* Ticket Title */}
          <div className="form-group">
            <label htmlFor="ticket-title" className="form-label">
              Subject / Summary *
            </label>
            <input
              id="ticket-title"
              className="form-control"
              type="text"
              placeholder="e.g. Laptop screen flickering, VPN connection failing, Request Figma license"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>


          {/* Detailed Description */}
          <div className="form-group">
            <label htmlFor="ticket-description" className="form-label">
              Description & Steps to Reproduce *
            </label>
            <textarea
              id="ticket-description"
              className="form-control"
              placeholder="Provide details about the issue: what error appeared, when it began, and any troubleshooting steps tried..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
            />
          </div>

          {/* Form Actions */}
          <div className="form-card-footer">
            <button
              type="button"
              className="btn-warm-secondary"
              onClick={() => navigate('/tickets')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-warm-terracotta"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketForm;