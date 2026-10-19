import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { assetService } from '../../services/ticketService';
import { Asset } from '../../types';
import { useAuth } from '../../context/AuthContext';
import AssignAssetDrawer from './AssignAssetDrawer';
import RequestAssetModal from './RequestAssetModal';
import useWebSocket from '../../hooks/useWebSocket';
import { IconBox, IconLaptop, IconUser, IconWrench, IconDownload, IconPlus, IconSparkles, IconSearch, IconArrowRight, IconAlert } from '../common/Icons';

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
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Counts for staff hero cards
  const [summaryCounts, setSummaryCounts] = useState({ total: 0, active: 0, stock: 0, repair: 0 });

  const fetchSummaryCounts = async () => {
    try {
      const all = await assetService.getAll();
      setSummaryCounts({
        total: all.length,
        active: all.filter((a) => a.status === 'ASSIGNED').length,
        stock: all.filter((a) => a.status === 'AVAILABLE').length,
        repair: all.filter((a) => a.status === 'UNDER_REPAIR').length,
      });
    } catch {
      // ignore
    }
  };

  const isFirstMount = useRef(true);
  const filterChangeTriggered = useRef(false);

  const fetchAssets = async (pageToFetch: number = currentPage) => {
    setLoading(true);
    try {
      const skip = (pageToFetch - 1) * itemsPerPage;
      const statusParam = isAvailablePage ? 'AVAILABLE' : (statusFilter || undefined);
      let typeParam: string | undefined = undefined;
      if (typeFilter === 'LAPTOPS') typeParam = 'Laptop';
      else if (typeFilter === 'MONITORS') typeParam = 'Monitor';
      else if (typeFilter === 'PERIPHERALS') typeParam = 'Keyboard,Mouse,Printer';

      const res = await assetService.getPaginated(
        statusParam,
        typeParam,
        search.trim() || undefined,
        skip,
        itemsPerPage
      );
      setAssets(res.items);
      setTotalItems(res.total);
    } catch {
      setAssets([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterChangeTriggered.current = true;
    setCurrentPage(1);
    fetchAssets(1);
    fetchSummaryCounts();
  }, [statusFilter, typeFilter, search, isAvailablePage]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (filterChangeTriggered.current) {
      filterChangeTriggered.current = false;
      return;
    }
    fetchAssets(currentPage);
    fetchSummaryCounts();
  }, [currentPage]);

  useWebSocket(() => {
    fetchAssets();
    fetchSummaryCounts();
  });

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
      await fetchSummaryCounts();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to return asset.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const paginatedAssets = assets;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Counts for staff
  const totalCount = summaryCounts.total;
  const activeCount = summaryCounts.active;
  const stockCount = summaryCounts.stock;
  const repairCount = summaryCounts.repair;
  const hasActiveFilter = Boolean(search.trim() || (typeFilter && typeFilter !== 'ALL') || (statusFilter && (!isAvailablePage || statusFilter !== 'AVAILABLE')));

  const exportCSV = async () => {
    const all = await assetService.getAll();
    const headers = ['Asset Tag', 'Type', 'Brand', 'Model', 'Serial Number', 'Status', 'Assigned To'];
    const rows = all.map((a) => [
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
    if (s === 'RETIRED') return <span className="warm-pill warm-pill-closed">● RETIRED</span>;
    if (s === 'LOST') return <span className="warm-pill warm-pill-maintenance">● LOST</span>;
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
              ? hasActiveFilter
                ? `Showing ${totalItems} matching assigned device${totalItems === 1 ? '' : 's'}.`
                : assets.length === 0
                ? 'No hardware currently allocated to your account. Submit an equipment request below if you need devices.'
                : `You currently have ${totalItems} device${totalItems === 1 ? '' : 's'} assigned for daily company work.`
              : isAvailablePage
              ? `${stockCount} available devices in reserve. Click 'Assign' to immediately allocate hardware to an employee.`
              : `${totalCount} registered company devices across active assignments and reserve inventory.`}
          </p>
        </div>

        <div className="inventory-hero-actions">
          {/* CSV Export for Staff */}
          {isStaff && (
            <button type="button" className="btn-warm-secondary" onClick={exportCSV}>
              <span className="btn-icon"><IconDownload size={15} /></span> Export CSV
            </button>
          )}

          {/* Add Asset is strictly ADMIN only */}
          {isAdmin && (
            <Link to="/assets/create" className="btn-warm-terracotta">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><IconPlus size={15} /> Add Asset</span>
            </Link>
          )}

          {/* Request Asset is strictly EMPLOYEE only */}
          {isEmployee && (
            <button
              type="button"
              className="btn-warm-terracotta"
              onClick={() => setRequestModalOpen(true)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><IconSparkles size={15} /> Request Equipment</span>
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
              <IconLaptop size={18} color="var(--color-text-secondary)" />
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
              <IconBox size={18} color="#10b981" />
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
              <IconUser size={18} color="#6366f1" />
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
              <IconWrench size={18} color="#f59e0b" />
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
            <IconArrowRight size={16} color="var(--color-accent)" />
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
          <span className="inventory-search-icon"><IconSearch size={15} /></span>
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
              <option value="RETIRED">Retired</option>
              <option value="LOST">Lost</option>
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
        ) : paginatedAssets.length === 0 ? (
          <div className="inventory-empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', opacity: 0.6 }}>
              <IconBox size={38} color="var(--color-text-secondary)" />
            </div>
            <h3 style={{ margin: '0.75rem 0 0.35rem 0' }}>
              {isEmployee && !hasActiveFilter
                ? 'No Devices Assigned'
                : isAvailablePage
                ? 'No Available Inventory in Reserve'
                : 'No Devices Found'}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.88rem' }}>
              {isEmployee && !hasActiveFilter
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
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <IconUser size={13} color="var(--color-accent)" /> {assignedName}
                          </span>
                        ) : (
                          <span style={{ color: '#888', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <IconBox size={13} /> Available in Stock
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><IconAlert size={12} /> Report</span>
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
            Showing <strong>{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> -{' '}
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