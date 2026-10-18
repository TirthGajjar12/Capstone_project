import React, { useState, useEffect } from 'react';
import { Asset, User } from '../../types';
import { IconLaptop, IconUser } from '../common/Icons';
import { assetService, userService } from '../../services/ticketService';

interface AssignAssetDrawerProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignAssetDrawer: React.FC<AssignAssetDrawerProps> = ({
  asset,
  isOpen,
  onClose,
  onAssigned,
}) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
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
        const results = await userService.search(search, 15, 'EMPLOYEE');
        setUsers(results.filter((u) => u.role === 'EMPLOYEE'));
      } catch (err: any) {
        setError('Failed to load employee directory.');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

  if (!isOpen || !asset) return null;

  const tag = asset.asset_tag || asset.asset_id || `AST-${asset.id}`;

  const handleConfirm = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    setError(null);
    try {
      await assetService.assign(String(asset.id), selectedUser.id);
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign asset.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div className="drawer-kicker">PROVISIONING WORKFLOW</div>
            <h2 className="drawer-title">Assign Hardware</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {/* Selected Asset Summary Card */}
        <div className="drawer-asset-card">
          <div className="drawer-asset-badge">
            <span className="drawer-asset-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconLaptop size={18} color="var(--color-accent)" />
            </span>
            <div>
              <div className="drawer-asset-tag">{tag}</div>
              <div className="drawer-asset-name">
                {asset.brand} {asset.model}
              </div>
            </div>
          </div>
          <div className="drawer-asset-meta">
            <div>
              <span className="drawer-meta-label">Type:</span> {asset.asset_type}
            </div>
            <div>
              <span className="drawer-meta-label">Serial:</span>{' '}
              <code className="drawer-serial">{asset.serial_number}</code>
            </div>
          </div>
        </div>

        {/* Employee Search Input */}
        <div className="drawer-section">
          <label className="drawer-label" htmlFor="employee-search">
            Search Employee
          </label>
          <div className="drawer-search-wrapper">
            <span className="drawer-search-icon">🔍</span>
            <input
              id="employee-search"
              type="text"
              className="drawer-search-input"
              placeholder="Search by name, email, or dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {loading && <div className="drawer-spinner" />}
          </div>
          <p className="drawer-hint">
            Querying active directory on-demand to keep payload minimal.
          </p>
        </div>

        {error && <div className="drawer-error">{error}</div>}

        {/* Employee Results List */}
        <div className="drawer-user-list">
          {users.length === 0 && !loading ? (
            <div className="drawer-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <IconUser size={28} color="var(--color-text-secondary)" />
              <p style={{ marginTop: '0.4rem' }}>No active employees found matching "{search}"</p>
            </div>
          ) : (
            users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const initials = u.full_name
                ? u.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : '??';

              return (
                <div
                  key={u.id}
                  className={`drawer-user-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="drawer-user-avatar">{initials}</div>
                  <div className="drawer-user-info">
                    <div className="drawer-user-name">{u.full_name}</div>
                    <div className="drawer-user-sub">
                      {u.email} · <span className="drawer-role-tag">{u.role}</span>
                    </div>
                  </div>
                  <div className="drawer-user-radio">
                    <input
                      type="radio"
                      name="selected_user"
                      checked={isSelected}
                      onChange={() => setSelectedUser(u)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="drawer-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={assigning}>
            Cancel
          </button>
          <button
            className="btn btn-primary drawer-confirm-btn"
            disabled={!selectedUser || assigning}
            onClick={handleConfirm}
          >
            {assigning ? 'Assigning…' : selectedUser ? `Assign to ${selectedUser.full_name.split(' ')[0]}` : 'Select Employee'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAssetDrawer;
