import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';

/**
 * AssetForm — create a new IT asset (Admin only).
 *
 * POST /assets { asset_tag, asset_type, brand, model, serial_number, purchase_date }
 * Returns: the newly created Asset with an auto-generated asset_tag if left empty.
 */
const AssetForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assetTag, setAssetTag] = useState('');
  const [assetType, setAssetType] = useState('Laptop');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
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
        purchase_date: purchaseDate || undefined,
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
    <>
      <div className="page-header">
        <div>
          <h1>Add Asset</h1>
          <p>Register a new IT asset in the system</p>
        </div>
      </div>

      <div className="page-body form-page">
        <div className="form-card">
          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="asset-type">Asset Type *</label>
                <select
                  id="asset-type"
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

              <div className="form-group">
                <label htmlFor="asset-tag">Asset Tag (Optional)</label>
                <input
                  id="asset-tag"
                  type="text"
                  placeholder="e.g. LAP-1099 (Leave empty to auto-generate)"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="asset-brand">Brand *</label>
                <input
                  id="asset-brand"
                  type="text"
                  placeholder="e.g. Dell, HP, Lenovo"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="asset-model">Model *</label>
                <input
                  id="asset-model"
                  type="text"
                  placeholder="e.g. Latitude 5520"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="asset-serial">Serial Number *</label>
                <input
                  id="asset-serial"
                  type="text"
                  placeholder="e.g. SN-XYZ12345"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="asset-purchase-date">Purchase Date</label>
                <input
                  id="asset-purchase-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Add Asset'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/assets')}
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

export default AssetForm;