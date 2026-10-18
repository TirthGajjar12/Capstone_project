import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { assetService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { IconAlert } from '../common/Icons';

export const AssetForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assetTag, setAssetTag] = useState('');
  const [assetType, setAssetType] = useState('Laptop');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/assets', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await assetService.create({
        asset_tag: assetTag.trim() || undefined,
        asset_type: assetType,
        brand: brand.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim(),
      });
      navigate('/assets');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create asset. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modern-form-wrapper">
      <div className="modern-form-header">
        <Link to="/assets" className="form-back-link">
          ← Back to Asset Inventory
        </Link>
        <h1 className="modern-form-title">Provision New Hardware</h1>
        <p className="modern-form-subtitle">
          Register a new IT device into the central hardware catalog and inventory pool.
        </p>
      </div>

      <div className="modern-form-card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><IconAlert size={16} /> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            {/* Asset Type */}
            <div className="form-group">
              <label htmlFor="asset-type" className="form-label">
                Equipment Type *
              </label>
              <select
                id="asset-type"
                className="form-control"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
              >
                <option value="Laptop">Laptop</option>
                <option value="Monitor">Monitor</option>
                <option value="Keyboard">Keyboard</option>
                <option value="Mouse">Mouse</option>
                <option value="Printer">Printer</option>
              </select>
            </div>

            {/* Custom Asset Tag */}
            <div className="form-group">
              <label htmlFor="asset-tag" className="form-label">
                Asset Tag (Optional)
              </label>
              <input
                id="asset-tag"
                className="form-control"
                type="text"
                placeholder="e.g. LAP-1099 (Leave empty to auto-generate)"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            {/* Brand */}
            <div className="form-group">
              <label htmlFor="asset-brand" className="form-label">
                Brand / Manufacturer *
              </label>
              <input
                id="asset-brand"
                className="form-control"
                type="text"
                placeholder="e.g. Apple, Dell, Lenovo, HP, Logitech"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
            </div>

            {/* Model */}
            <div className="form-group">
              <label htmlFor="asset-model" className="form-label">
                Model Name / Spec *
              </label>
              <input
                id="asset-model"
                className="form-control"
                type="text"
                placeholder="e.g. Latitude 5540, MacBook Pro 16, MX Master 3S"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Serial Number */}
          <div className="form-group">
            <label htmlFor="asset-serial" className="form-label">
              Hardware Serial Number *
            </label>
            <input
              id="asset-serial"
              className="form-control"
              type="text"
              placeholder="e.g. SN-88492019-B"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
            />
          </div>

          {/* Form Actions */}
          <div className="form-card-footer">
            <button
              type="button"
              className="btn-warm-secondary"
              onClick={() => navigate('/assets')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-warm-terracotta"
              disabled={submitting}
            >
              {submitting ? 'Registering…' : 'Save to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetForm;