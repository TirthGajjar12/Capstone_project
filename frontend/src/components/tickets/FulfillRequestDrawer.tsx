import React, { useState, useEffect } from 'react';
import { Ticket, Asset } from '../../types';
import { ticketService, assetService } from '../../services/ticketService';

interface FulfillRequestDrawerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignedAndResolved: () => void;
}

export const FulfillRequestDrawer: React.FC<FulfillRequestDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  onAssignedAndResolved,
}) => {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract requested hardware type from title or description
  const extractRequestedType = (): string => {
    if (!ticket) return '';
    if (ticket.title && ticket.title.includes(':')) {
      return ticket.title.split(':')[1].trim();
    }
    const desc = ticket.description || '';
    const match = desc.match(/Requested Equipment:\s*([^\n\r]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return ticket.title || '';
  };

  const requestedType = extractRequestedType();

  const requesterName =
    ticket?.created_by_name ||
    (ticket?.created_by && typeof ticket.created_by === 'object'
      ? (ticket.created_by as any).full_name
      : null) ||
    'Employee';

  useEffect(() => {
    if (!isOpen || !ticket) {
      setSelectedAsset(null);
      setSearch('');
      setCategoryFilter('ALL');
      setResolutionNotes('');
      setError(null);
      return;
    }

    // Auto-select category filter based on requested hardware (e.g., Monitor -> MONITOR)
    const reqUpper = extractRequestedType().toUpperCase();
    const matchedCategory = ['LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'PRINTER'].find((c) =>
      reqUpper.includes(c)
    );
    setCategoryFilter(matchedCategory || 'ALL');

    const loadAvailableAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const assets = await assetService.getAll('AVAILABLE');
        setAvailableAssets(assets);
      } catch (err: any) {
        setError('Failed to fetch available hardware inventory.');
        setAvailableAssets([]);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableAssets();
  }, [isOpen, ticket]);

  // Update default resolution notes when selected asset changes
  useEffect(() => {
    if (selectedAsset && ticket) {
      setResolutionNotes(
        `Hardware provisioned: Assigned ${selectedAsset.asset_tag || `AST-${selectedAsset.id}`} (${selectedAsset.brand} ${selectedAsset.model}) to ${requesterName}.`
      );
    }
  }, [selectedAsset, ticket, requesterName]);

  if (!isOpen || !ticket) return null;

  // Filter available assets
  const filteredAssets = availableAssets.filter((a) => {
    if (categoryFilter !== 'ALL') {
      const type = (a.asset_type || '').toUpperCase();
      if (categoryFilter === 'LAPTOP' && !type.includes('LAPTOP')) return false;
      if (categoryFilter === 'MONITOR' && !type.includes('MONITOR')) return false;
      if (categoryFilter === 'MOUSE' && !type.includes('MOUSE')) return false;
      if (categoryFilter === 'KEYBOARD' && !type.includes('KEYBOARD')) return false;
      if (categoryFilter === 'PRINTER' && !type.includes('PRINTER')) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const tag = (a.asset_tag || a.asset_id || '').toLowerCase();
      const brand = (a.brand || '').toLowerCase();
      const model = (a.model || '').toLowerCase();
      const type = (a.asset_type || '').toLowerCase();
      const serial = (a.serial_number || '').toLowerCase();

      if (!tag.includes(q) && !brand.includes(q) && !model.includes(q) && !type.includes(q) && !serial.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleConfirmAssign = async () => {
    if (!selectedAsset) {
      setError('Please select an available hardware asset to assign.');
      return;
    }

    const isMatchedType =
      !requestedType ||
      selectedAsset.asset_type?.toLowerCase().includes(requestedType.toLowerCase()) ||
      requestedType.toLowerCase().includes(selectedAsset.asset_type?.toLowerCase() || '');

    if (!isMatchedType) {
      const confirmed = window.confirm(
        `Notice: The selected asset is a "${selectedAsset.asset_type}", but the user requested "${requestedType}". Proceed with this equipment substitution?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const notes =
        resolutionNotes.trim() ||
        `Hardware provisioned: Assigned ${selectedAsset.asset_tag} to ${requesterName}.`;
      await ticketService.resolve(ticket.id, notes, selectedAsset.id);
      onAssignedAndResolved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign hardware asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveWithoutAsset = async () => {
    const notes = window.prompt(
      'Enter resolution summary (resolving request without assigning new hardware):',
      'Request processed and resolved.'
    );
    if (!notes || !notes.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await ticketService.resolve(ticket.id, notes.trim());
      onAssignedAndResolved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to resolve request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div className="drawer-kicker">EQUIPMENT FULFILLMENT</div>
            <h2 className="drawer-title" style={{ fontSize: '1.35rem' }}>Assign Hardware</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {/* Ticket Details Summary Card */}
        <div
          className="drawer-asset-card"
          style={{ background: 'var(--color-bg-secondary, #fafaf9)', border: '1px solid #e7ded4', padding: '0.85rem 1rem', marginBottom: '1rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#6366f1' }}>
              🎫 {ticket.ticket_number || `INC-${ticket.id}`}
            </span>
            <span style={{ fontSize: '0.74rem', background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
              👤 For: {requesterName}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
            {ticket.title}
          </div>
          {ticket.description && (
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                margin: '0.35rem 0 0 0',
                whiteSpace: 'pre-line',
                maxHeight: '65px',
                overflowY: 'auto',
              }}
            >
              {ticket.description}
            </p>
          )}
        </div>

        {/* Search & Category Filter */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div className="drawer-search-wrapper" style={{ marginBottom: '0.5rem' }}>
            <span className="drawer-search-icon">🔍</span>
            <input
              type="text"
              className="drawer-search-input"
              placeholder="Search available inventory (brand, model, tag)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && <div className="drawer-spinner" />}
          </div>

          {/* Type Quick Chips */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {['ALL', 'LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'PRINTER'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.18rem 0.5rem',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: categoryFilter === cat ? '#6366f1' : '#e5e7eb',
                  background: categoryFilter === cat ? '#6366f1' : 'transparent',
                  color: categoryFilter === cat ? '#fff' : 'inherit',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="drawer-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

        {/* Available Hardware List */}
        <div
          className="drawer-user-list"
          style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem' }}
        >
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              Loading available inventory…
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="drawer-empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem' }}>📦</span>
              <p style={{ margin: '0.5rem 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                No available assets found {categoryFilter !== 'ALL' ? `in category "${categoryFilter}"` : 'in inventory'}.
              </p>
              {categoryFilter !== 'ALL' && (
                <button
                  type="button"
                  className="btn-warm-secondary"
                  onClick={() => setCategoryFilter('ALL')}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', marginTop: '0.25rem' }}
                >
                  Show All Available Inventory
                </button>
              )}
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              const isMatch =
                requestedType &&
                (asset.asset_type?.toLowerCase().includes(requestedType.toLowerCase()) ||
                  requestedType.toLowerCase().includes(asset.asset_type?.toLowerCase() || ''));

              return (
                <div
                  key={asset.id}
                  className={`drawer-user-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedAsset(asset)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    marginBottom: '0.4rem',
                    border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                    background: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {asset.asset_type?.toUpperCase().includes('LAPTOP')
                        ? '💻'
                        : asset.asset_type?.toUpperCase().includes('MONITOR')
                        ? '🖥️'
                        : asset.asset_type?.toUpperCase().includes('MOUSE')
                        ? '🖱️'
                        : asset.asset_type?.toUpperCase().includes('KEYBOARD')
                        ? '⌨️'
                        : '📦'}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                          {asset.asset_tag || `AST-${asset.id}`}
                        </span>
                        {isMatch && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              background: '#ecfdf5',
                              color: '#059669',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              fontWeight: 700,
                            }}
                          >
                            🎯 Requested Match
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        {asset.brand} {asset.model} · <span style={{ fontSize: '0.72rem' }}>{asset.asset_type}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        S/N: {asset.serial_number}
                      </div>
                    </div>
                  </div>

                  <input
                    type="radio"
                    name="selected_asset"
                    checked={isSelected}
                    onChange={() => setSelectedAsset(asset)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Selected Asset Confirmation Box */}
        {selectedAsset && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.65rem 0.85rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.2rem' }}>
              ✓ Selected for assignment:
            </div>
            <div style={{ color: '#15803d' }}>
              <strong>{selectedAsset.asset_tag}</strong> ({selectedAsset.brand} {selectedAsset.model}) will be assigned to <strong>{requesterName}</strong>, and this ticket will be marked as Resolved.
            </div>
          </div>
        )}

        {/* Drawer Footer Actions */}
        <div className="drawer-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResolveWithoutAsset}
            disabled={submitting}
            style={{ fontSize: '0.76rem', padding: '0.45rem 0.75rem' }}
            title="Resolve without assigning an asset from inventory"
          >
            Resolve without Asset
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedAsset || submitting}
              onClick={handleConfirmAssign}
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.95rem',
                background: selectedAsset ? '#4f46e5' : undefined,
                borderColor: selectedAsset ? '#4338ca' : undefined,
              }}
            >
              {submitting ? 'Assigning…' : '📦 Assign & Resolve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FulfillRequestDrawer;
