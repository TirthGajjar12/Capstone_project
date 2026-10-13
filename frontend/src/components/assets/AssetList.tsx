import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assetService, userService } from '../../services/ticketService';
import { Asset, User } from '../../types';
import { useAuth } from '../../context/AuthContext';

/**
 * AssetList — data-table of IT assets with role-based visibility & actions.
 * - Employees: see ONLY hardware assigned to them, with a quick 'Report Issue' button.
 * - Admin/Support: see all inventory assets with assignment management controls.
 */
const AssetList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedUserForAsset, setSelectedUserForAsset] = useState<Record<number, number>>({});

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT';
  const isEmployee = user?.role === 'EMPLOYEE';

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await assetService.getAll(statusFilter || undefined);
      setAssets(data);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (isStaff) {
      try {
        const uList = await userService.getAll();
        setUsers(uList);
      } catch {
        setUsers([]);
      }
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [user]);

  // Client-side search filter
  const filtered = search
    ? assets.filter(
        (a) =>
          ((a.asset_id || a.asset_tag || '').toLowerCase().includes(search.toLowerCase())) ||
          (a.brand && a.brand.toLowerCase().includes(search.toLowerCase())) ||
          (a.model && a.model.toLowerCase().includes(search.toLowerCase())) ||
          (a.serial_number && a.serial_number.toLowerCase().includes(search.toLowerCase())),
      )
    : assets;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      AVAILABLE: 'badge-available',
      ASSIGNED: 'badge-assigned',
      UNDER_REPAIR: 'badge-under-repair',
      RETIRED: 'badge-retired',
      LOST: 'badge-lost',
    };
    return `badge ${map[status] || ''}`;
  };

  const getAssignedName = (asset: Asset) => {
    if (asset.assigned_to_name) return asset.assigned_to_name;
    if (asset.assigned_to && typeof asset.assigned_to === 'object') {
      const u = asset.assigned_to as any;
      return u.full_name || u.email;
    }
    return null;
  };

  const isAssignedToMe = (asset: Asset) => {
    if (!user) return false;
    if (asset.assigned_to_id === user.id) return true;
    if (typeof asset.assigned_to === 'object' && asset.assigned_to !== null) {
      return (asset.assigned_to as any).id === user.id;
    }
    return asset.assigned_to === user.id;
  };

  const handleAssign = async (assetId: number) => {
    const targetUserId = selectedUserForAsset[assetId];
    if (!targetUserId) {
      alert('Please select an employee to assign this asset to.');
      return;
    }
    setActionLoadingId(assetId);
    try {
      await assetService.assign(String(assetId), targetUserId);
      await fetchAssets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to assign asset.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReturn = async (assetId: number) => {
    if (!window.confirm('Are you sure you want to return this asset back to the available pool?')) {
      return;
    }
    setActionLoadingId(assetId);
    try {
      await assetService.returnAsset(String(assetId));
      await fetchAssets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to return asset.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Assets</h1>
          <p>
            {isEmployee
              ? 'View hardware and equipment assigned to your account'
              : 'View and manage all IT assets in inventory'}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Link to="/assets/create" className="btn btn-primary">
            📦 Add Asset
          </Link>
        )}
      </div>

      <div className="page-body">
        <div className="data-table-wrapper">
          {/* Toolbar */}
          <div className="data-table-toolbar">
            <div className="data-table-search">
              <span className="search-icon">🔍</span>
              <input
                id="asset-search"
                type="text"
                placeholder={
                  isEmployee
                    ? 'Search your assigned hardware…'
                    : 'Search assets by tag, brand, model…'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isStaff && (
              <div className="data-table-filter">
                <select
                  id="asset-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="UNDER_REPAIR">Under Repair</option>
                  <option value="RETIRED">Retired</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              Loading assets…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💻</div>
              {isEmployee ? (
                <>
                  <h3>No Hardware Assigned</h3>
                  <p>You currently do not have any IT equipment assigned to your account.</p>
                </>
              ) : (
                <>
                  <h3>No assets found</h3>
                  <p>Try adjusting your filters or register a new asset.</p>
                </>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => {
                  const tag = asset.asset_tag || asset.asset_id || `AST-${asset.id}`;
                  const assignedName = getAssignedName(asset);
                  return (
                    <tr key={asset.id}>
                      <td><strong>{tag}</strong></td>
                      <td>{asset.asset_type}</td>
                      <td>{asset.brand}</td>
                      <td>{asset.model}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {asset.serial_number}
                      </td>
                      <td>
                        <span className={statusBadge(asset.status)}>
                          {asset.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {assignedName ? (
                          <span>
                            {assignedName}
                            {isAssignedToMe(asset) && ' (You)'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {/* Employee Action: Report Issue for this asset */}
                        {isEmployee && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                            onClick={() =>
                              navigate(
                                `/tickets/create?asset_id=${asset.id}&asset_name=${encodeURIComponent(
                                  `${tag} (${asset.brand} ${asset.model})`
                                )}`
                              )
                            }
                          >
                            🎫 Report Issue
                          </button>
                        )}

                        {/* Staff Actions: Assign / Return */}
                        {isStaff && (
                          <>
                            {asset.status === 'AVAILABLE' ? (
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <select
                                  style={{
                                    fontSize: '0.8rem',
                                    padding: '0.25rem 0.45rem',
                                    borderRadius: '4px',
                                    maxWidth: '150px'
                                  }}
                                  value={selectedUserForAsset[asset.id] || ''}
                                  onChange={(e) =>
                                    setSelectedUserForAsset({
                                      ...selectedUserForAsset,
                                      [asset.id]: Number(e.target.value)
                                    })
                                  }
                                >
                                  <option value="">Select Employee</option>
                                  {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.full_name} ({u.role})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                  disabled={actionLoadingId === asset.id || !selectedUserForAsset[asset.id]}
                                  onClick={() => handleAssign(asset.id)}
                                >
                                  {actionLoadingId === asset.id ? '…' : 'Assign'}
                                </button>
                              </div>
                            ) : asset.status === 'ASSIGNED' ? (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#f87171' }}
                                disabled={actionLoadingId === asset.id}
                                onClick={() => handleReturn(asset.id)}
                              >
                                {actionLoadingId === asset.id ? '…' : 'Return'}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem' }}>—</span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default AssetList;