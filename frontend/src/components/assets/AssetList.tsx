import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { assetService } from '../../services/ticketService';
import { Asset } from '../../types';
import { useAuth } from '../../context/AuthContext';
import AssignAssetDrawer from './AssignAssetDrawer';
import RequestAssetModal from './RequestAssetModal';

interface AssetListProps {
  availableOnly?: boolean;
}

export const AssetList: React.FC<AssetListProps> = ({ availableOnly = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAvailablePage = availableOnly || location.pathname === '/inventory/available';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT';
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(isAvailablePage ? 'AVAILABLE' : '');
  const [loading, setLoading] = useState(true);

  // Assignment Drawer state
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<Asset | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Request Asset Modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await assetService.getAll(isAvailablePage ? 'AVAILABLE' : (statusFilter || undefined));
      setAssets(data);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [statusFilter, isAvailablePage]);

  // Open Assign Drawer for specific asset
  const handleOpenAssign = (asset: Asset) => {
    setSelectedAssetForAssign(asset);
    setIsDrawerOpen(true);
  };

  const handleReturn = async (assetId: number) => {
    if (!window.confirm('Return this asset back to the available inventory pool?')) {
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

  // Filter assets by search and type tabs
  const filtered = assets.filter((a) => {
    const matchesSearch =
      !search ||
      (a.asset_tag || a.asset_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.brand && a.brand.toLowerCase().includes(search.toLowerCase())) ||
      (a.model && a.model.toLowerCase().includes(search.toLowerCase())) ||
      (a.serial_number && a.serial_number.toLowerCase().includes(search.toLowerCase())) ||
      (a.assigned_to_name && a.assigned_to_name.toLowerCase().includes(search.toLowerCase()));

    let matchesType = true;
    if (typeFilter === 'LAPTOPS') {
      matchesType = (a.asset_type || '').toUpperCase().includes('LAPTOP');
    } else if (typeFilter === 'MONITORS') {
      matchesType = (a.asset_type || '').toUpperCase().includes('MONITOR');
    } else if (typeFilter === 'PERIPHERALS') {
      const t = (a.asset_type || '').toUpperCase();
      matchesType = t.includes('MOUSE') || t.includes('KEYBOARD') || t.includes('PRINTER') || t.includes('DOCK') || t.includes('HEADSET');
    }

    return matchesSearch && matchesType;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedAssets = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Counts for staff
  const totalCount = assets.length;
  const activeCount = assets.filter((a) => a.status === 'ASSIGNED').length;
  const stockCount = assets.filter((a) => a.status === 'AVAILABLE').length;
  const repairCount = assets.filter((a) => a.status === 'UNDER_REPAIR').length;

  const exportCSV = () => {
    const headers = ['Asset Tag', 'Type', 'Brand', 'Model', 'Serial Number', 'Status', 'Assigned To'];
    const rows = filtered.map((a) => [
      a.asset_tag || `AST-${a.id}`,
      a.asset_type,
      a.brand,
      a.model,
      a.serial_number,
      a.status,
      a.assigned_to_name || 'Unassigned',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Asset_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'AVAILABLE') return <span className="warm-pill warm-pill-available">● AVAILABLE</span>;
    if (s === 'ASSIGNED') return <span className="warm-pill warm-pill-assigned">● ASSIGNED</span>;
    if (s === 'UNDER_REPAIR') return <span className="warm-pill warm-pill-maintenance">● UNDER REPAIR</span>;
    return <span className="warm-pill warm-pill-neutral">● {status}</span>;
  };

  return (
    <div className="asset-inventory-page">
      {/* ==================== 1. HERO HEADER (Role & Page Aware) ==================== */}
      <div className="inventory-hero">
        <div className="inventory-hero-left">
          <div className="inventory-kicker">
            <span className="kicker-dot">●</span>{' '}
            {isEmployee
              ? 'My Workstation'
              : isAvailablePage
              ? 'Hardware Provisioning'
              : 'Enterprise Assets'}
          </div>
          <h1 className="inventory-title">
            {isEmployee
              ? 'My Assigned Devices'
              : isAvailablePage
              ? 'Available Inventory (Ready to Assign)'
              : 'Asset Directory'}
          </h1>
          <p className="inventory-subtitle">
            {isEmployee
              ? assets.length === 0
                ? 'No hardware currently allocated to your account. Submit an equipment request below if you need devices.'
                : `You currently have ${assets.length} device${assets.length > 1 ? 's' : ''} assigned for daily company work.`
              : isAvailablePage
              ? `${stockCount} available devices in reserve. Click 'Assign' to immediately allocate hardware to an employee.`
              : `${totalCount} registered company devices across active assignments and reserve inventory.`}
          </p>
        </div>

        <div className="inventory-hero-actions">
          {/* CSV Export for Staff */}
          {isStaff && (
            <button type="button" className="btn-warm-secondary" onClick={exportCSV}>
              <span className="btn-icon">📥</span> Export CSV
            </button>
          )}

          {/* Add Asset is strictly ADMIN only */}
          {isAdmin && (
            <Link to="/assets/create" className="btn-warm-terracotta">
              <span>+ Add Asset</span>
            </Link>
          )}

          {/* Request Asset is strictly EMPLOYEE only */}
          {isEmployee && (
            <button
              type="button"
              className="btn-warm-terracotta"
              onClick={() => setRequestModalOpen(true)}
            >
              <span>✨ Request Equipment</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== 2. STAFF METRIC CARDS (Hidden for Employees) ==================== */}
      {isStaff && !isAvailablePage && (
        <div className="fleet-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div
            className={`fleet-card interactive-filter ${!statusFilter ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter('')}
            title="Click to view all assets"
          >
            <div className="fleet-card-header">
              <span className="fleet-card-label">TOTAL ASSETS</span>
              <span className="fleet-card-icon">💻</span>
            </div>
            <div className="fleet-card-body">
              <span className="fleet-number">{totalCount}</span>
              <span className="fleet-sublabel">registered in catalog</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#888', marginTop: '0.4rem' }}>
              ● Click to view all
            </div>
          </div>

          <div
            className={`fleet-card interactive-filter ${statusFilter === 'AVAILABLE' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? '' : 'AVAILABLE')}
            title="Click to filter Available assets"
          >
            <div className="fleet-card-header">
              <span className="fleet-card-label">AVAILABLE</span>
              <span className="fleet-card-icon">📦</span>
            </div>
            <div className="fleet-card-body">
              <span className="fleet-number" style={{ color: '#10b981' }}>{stockCount}</span>
              <span className="fleet-sublabel">ready to assign</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: statusFilter === 'AVAILABLE' ? '#10b981' : '#888', marginTop: '0.4rem' }}>
              {statusFilter === 'AVAILABLE' ? '✓ Filter active' : '● Click to filter stock'}
            </div>
          </div>

          <div
            className={`fleet-card interactive-filter ${statusFilter === 'ASSIGNED' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'ASSIGNED' ? '' : 'ASSIGNED')}
            title="Click to filter Assigned assets"
          >
            <div className="fleet-card-header">
              <span className="fleet-card-label">ASSIGNED</span>
              <span className="fleet-card-icon">👤</span>
            </div>
            <div className="fleet-card-body">
              <span className="fleet-number" style={{ color: '#6366f1' }}>{activeCount}</span>
              <span className="fleet-sublabel">currently in use</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: statusFilter === 'ASSIGNED' ? '#6366f1' : '#888', marginTop: '0.4rem' }}>
              {statusFilter === 'ASSIGNED' ? '✓ Filter active' : '● Click to filter in-use'}
            </div>
          </div>

          <div
            className={`fleet-card interactive-filter ${statusFilter === 'UNDER_REPAIR' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'UNDER_REPAIR' ? '' : 'UNDER_REPAIR')}
            title="Click to filter Maintenance assets"
          >
            <div className="fleet-card-header">
              <span className="fleet-card-label">UNDER REPAIR</span>
              <span className="fleet-card-icon">🛠️</span>
            </div>
            <div className="fleet-card-body">
              <span className="fleet-number" style={{ color: '#f59e0b' }}>{repairCount}</span>
              <span className="fleet-sublabel">maintenance & service</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: statusFilter === 'UNDER_REPAIR' ? '#f59e0b' : '#888', marginTop: '0.4rem' }}>
              {statusFilter === 'UNDER_REPAIR' ? '✓ Filter active' : '● Click to filter repair'}
            </div>
          </div>
        </div>
      )}

      {/* Available Page Focus Header */}
      {isStaff && isAvailablePage && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-secondary)', padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>👉</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Hardware Assignment Mode: Select any device below to allocate it to an employee.
            </span>
          </div>
          <span className="warm-pill warm-pill-available">
            ● {stockCount} In Stock
          </span>
        </div>
      )}

      {/* ==================== 3. SEARCH & TYPE FILTER TOOLBAR ==================== */}
      <div className="inventory-toolbar">
        <div className="inventory-search-wrap" style={{ flex: 1 }}>
          <span className="inventory-search-icon">🔍</span>
          <input
            type="text"
            placeholder={isEmployee ? 'Search your assigned devices...' : 'Search by tag, brand, model, serial, or employee...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="inventory-type-tabs">
          <button
            type="button"
            className={`type-tab ${typeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setTypeFilter('ALL')}
          >
            All Types
          </button>
          <button
            type="button"
            className={`type-tab ${typeFilter === 'LAPTOPS' ? 'active' : ''}`}
            onClick={() => setTypeFilter('LAPTOPS')}
          >
            Laptops
          </button>
          <button
            type="button"
            className={`type-tab ${typeFilter === 'MONITORS' ? 'active' : ''}`}
            onClick={() => setTypeFilter('MONITORS')}
          >
            Monitors
          </button>
          <button
            type="button"
            className={`type-tab ${typeFilter === 'PERIPHERALS' ? 'active' : ''}`}
            onClick={() => setTypeFilter('PERIPHERALS')}
          >
            Peripherals
          </button>
        </div>

        {/* Dropdown status filter for staff on general assets page */}
        {!isAvailablePage && isStaff && (
          <div className="inventory-status-select-wrap">
            <span className="status-prefix">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="inventory-status-select"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_REPAIR">Under Repair</option>
            </select>
          </div>
        )}
      </div>

      {/* ==================== 4. SINGLE-LINE CLEAN TABLE ==================== */}
      <div className="inventory-table-container">
        {loading ? (
          <div className="inventory-loading-screen" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" />
            Loading hardware catalog…
          </div>
        ) : filtered.length === 0 ? (
          <div className="inventory-empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <span className="empty-icon" style={{ fontSize: '2.5rem' }}>📦</span>
            <h3 style={{ margin: '0.75rem 0 0.35rem 0' }}>
              {isEmployee ? 'No Devices Assigned' : isAvailablePage ? 'No Available Inventory in Reserve' : 'No Devices Found'}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.88rem' }}>
              {isEmployee
                ? 'You do not have any devices assigned yet. Click Request Equipment to submit a provisioning request.'
                : isAvailablePage
                ? 'All devices are currently allocated to team members. No reserve hardware available.'
                : 'No assets match your search keywords or active filters.'}
            </p>
            {isEmployee && (
              <button
                type="button"
                className="btn-warm-terracotta"
                onClick={() => setRequestModalOpen(true)}
                style={{ marginTop: '1.25rem' }}
              >
                Request Equipment
              </button>
            )}
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th style={{ width: '95px' }}>ASSET TAG</th>
                <th>DEVICE MODEL</th>
                <th style={{ width: '90px' }}>TYPE</th>
                <th style={{ width: '130px' }}>SERIAL NO.</th>
                {!isEmployee && <th style={{ width: '140px' }}>ASSIGNED TO</th>}
                <th style={{ width: '105px' }}>STATUS</th>
                <th style={{ textAlign: 'right', width: '95px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssets.map((asset) => {
                const tag = asset.asset_tag || `AST-${asset.id}`;
                const assignedName =
                  asset.assigned_to_name ||
                  (typeof asset.assigned_to === 'object' && asset.assigned_to
                    ? (asset.assigned_to as any).full_name
                    : null);

                return (
                  <tr key={asset.id} className="inventory-row">
                    {/* Tag */}
                    <td className="cell-tag" style={{ whiteSpace: 'nowrap' }}>
                      <strong>{tag}</strong>
                    </td>

                    {/* Equipment Name */}
                    <td className="cell-equipment" style={{ fontWeight: 600 }}>
                      {asset.brand} {asset.model}
                    </td>

                    {/* Type */}
                    <td className="cell-type" style={{ whiteSpace: 'nowrap' }}>
                      <span className="type-pill">{(asset.asset_type || 'HARDWARE').toUpperCase()}</span>
                    </td>

                    {/* Serial Number (Strict single line) */}
                    <td className="cell-serial" style={{ whiteSpace: 'nowrap' }}>
                      <code>{asset.serial_number}</code>
                    </td>

                    {/* Assigned User / Stock */}
                    {!isEmployee && (
                      <td className="cell-location" style={{ whiteSpace: 'nowrap' }}>
                        {asset.status === 'ASSIGNED' && assignedName ? (
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            👤 {assignedName}
                          </span>
                        ) : (
                          <span style={{ color: '#888', fontStyle: 'italic' }}>
                            📦 Available in Stock
                          </span>
                        )}
                      </td>
                    )}

                    {/* Status Pill */}
                    <td className="cell-status" style={{ whiteSpace: 'nowrap' }}>
                      {getStatusBadge(asset.status)}
                    </td>

                    {/* Actions */}
                    <td className="cell-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {/* Available: Assign button strictly ONLY on Available Inventory page */}
                      {isStaff && isAvailablePage && asset.status === 'AVAILABLE' && (
                        <button
                          type="button"
                          className="btn-assign-action"
                          onClick={() => handleOpenAssign(asset)}
                          title="Assign hardware to employee"
                        >
                          👤+ Assign
                        </button>
                      )}

                      {/* Assigned: Return button on Directory page */}
                      {isStaff && !isAvailablePage && asset.status === 'ASSIGNED' && (
                        <button
                          type="button"
                          className="btn-return-action"
                          disabled={actionLoadingId === asset.id}
                          onClick={() => handleReturn(asset.id)}
                          title="Return back to stock"
                        >
                          {actionLoadingId === asset.id ? '…' : 'Return'}
                        </button>
                      )}

                      {/* Employee: Report issue */}
                      {isEmployee && (
                        <button
                          type="button"
                          className="btn-report-action"
                          onClick={() =>
                            navigate(
                              `/tickets/create?asset_id=${asset.id}&asset_name=${encodeURIComponent(
                                `${tag} (${asset.brand} ${asset.model})`
                              )}`
                            )
                          }
                        >
                          🎫 Report
                        </button>
                      )}

                      {/* Neutral dash if no action is needed for this row */}
                      {isStaff && !isAvailablePage && asset.status !== 'ASSIGNED' && (
                        <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Bottom Pagination */}
        <div className="inventory-pagination">
          <div className="pagination-count">
            Showing <strong>{filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> -{' '}
            <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> devices
          </div>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assign Hardware Slide-Out Drawer */}
      <AssignAssetDrawer
        asset={selectedAssetForAssign}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAssetForAssign(null);
        }}
        onAssigned={() => {
          fetchAssets();
        }}
      />

      {/* Request Asset Modal (for Employees) */}
      <RequestAssetModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequestSubmitted={() => {
          fetchAssets();
        }}
      />
    </div>
  );
};

export default AssetList;