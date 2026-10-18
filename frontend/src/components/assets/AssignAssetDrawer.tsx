import React, { useState, useEffect, useMemo } from 'react';
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
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'SUPPORT' | 'ADMIN'>('ALL');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced directory query when search changes or modal opens
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedUser(null);
      setError(null);
      setRoleFilter('ALL');
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await userService.search(search, 100);
        setUsers(results);
      } catch (err: any) {
        setError('Failed to load employee directory.');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

  // Filtered users based on role filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, roleFilter]);

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
    <div className="enterprise-modal-overlay" onClick={onClose}>
      <div
        className="enterprise-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-asset-modal-title"
      >
        {/* Modal Header */}
        <div className="enterprise-modal-header">
          <div>
            <div className="enterprise-modal-kicker">HARDWARE PROVISIONING DIRECTORY</div>
            <h2 id="assign-asset-modal-title" className="enterprise-modal-title">
              Assign Hardware to Employee
            </h2>
          </div>
          <button className="enterprise-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Hardware Context Bar */}
        <div className="enterprise-modal-context-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              <IconLaptop size={16} color="var(--color-accent)" /> {tag}
            </span>
            <span className="warm-pill warm-pill-neutral" style={{ fontSize: '0.74rem' }}>
              {asset.asset_type}
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
              <strong>Device:</strong> {asset.brand} {asset.model}
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
              <strong>Serial:</strong> <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{asset.serial_number}</code>
            </span>
            <span
              className={`badge badge-${asset.status?.toLowerCase() || 'available'}`}
              style={{ fontSize: '0.7rem' }}
            >
              {asset.status}
            </span>
          </div>
        </div>

        {/* Toolbar: Search & Faceted Role Filter Chips */}
        <div className="enterprise-modal-toolbar">
          <div className="enterprise-modal-search">
            <span className="enterprise-modal-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search employee directory by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="enterprise-modal-filters">
            <span style={{ fontSize: '0.74rem', fontWeight: 600, opacity: 0.7 }}>Filter:</span>
            <button
              type="button"
              className={`enterprise-filter-chip ${roleFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setRoleFilter('ALL')}
            >
              All Personnel ({users.length})
            </button>
            <button
              type="button"
              className={`enterprise-filter-chip ${roleFilter === 'EMPLOYEE' ? 'active' : ''}`}
              onClick={() => setRoleFilter('EMPLOYEE')}
            >
              Employees
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
              Administrators
            </button>
          </div>
        </div>

        {/* Multi-Column Enterprise Directory Data Table */}
        <div className="enterprise-modal-body">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              Searching directory…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              <IconUser size={32} color="var(--color-text-secondary)" />
              <p style={{ marginTop: '0.5rem' }}>
                No employees or staff found matching "{search}".
              </p>
            </div>
          ) : (
            <table className="enterprise-directory-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Select</th>
                  <th>Employee & Contact</th>
                  <th style={{ width: '140px' }}>Organization Role</th>
                  <th style={{ width: '130px' }}>Account Status</th>
                  <th style={{ width: '110px' }}>Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
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
                    <tr
                      key={u.id}
                      className={`enterprise-directory-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="radio"
                          name="selected_employee_for_asset"
                          checked={isSelected}
                          onChange={() => setSelectedUser(u)}
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
                              {u.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {u.email}
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
                              u.role === 'ADMIN'
                                ? 'rgba(139, 58, 4, 0.12)'
                                : u.role === 'SUPPORT'
                                ? 'rgba(37, 99, 235, 0.12)'
                                : 'rgba(107, 114, 128, 0.12)',
                            color:
                              u.role === 'ADMIN'
                                ? '#8b3a04'
                                : u.role === 'SUPPORT'
                                ? '#2563eb'
                                : 'var(--color-text-secondary)',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                          ● Active
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Eligible
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
                Assigning <strong>{tag}</strong> to: <strong>{selectedUser.full_name}</strong> (
                {selectedUser.email} · {selectedUser.role})
              </span>
            ) : (
              <span>Please select an employee from the directory to provision this hardware.</span>
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
              {assigning ? 'Assigning…' : selectedUser ? `Confirm Assignment` : 'Select Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignAssetDrawer;
