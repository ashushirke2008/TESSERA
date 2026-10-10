import React, { useState } from 'react';
import { PlusCircle, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { NavPage } from '../types';
import { createAsset } from '../services/api';

interface AssetRegistrationPageProps {
  onNavigate: (page: NavPage) => void;
}

export const AssetRegistrationPage: React.FC<AssetRegistrationPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    assetId: `AST-REG-${Date.now().toString().slice(-4)}`,
    name: '',
    assetType: 'LAND',
    declaredValue: '500000',
    currency: 'USD',
    rawFingerprint: 'US-CA PARCEL-9921',
    cadastralId: 'CAD-9921',
    jurisdiction: 'US-CA',
    areaSqMeters: '50000',
    vin: '1HGCR2F83HA123456',
    make: 'Tesla',
    model: 'Semi Autonomous',
    siloId: 'SILO-08',
    commodityGrade: 'Hard Red Winter Grade 1',
    metricTons: '500',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedAsset, setSubmittedAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let metadata: Record<string, string> = {};
      if (formData.assetType === 'LAND') {
        metadata = {
          cadastralId: formData.cadastralId,
          jurisdiction: formData.jurisdiction,
          areaSqMeters: formData.areaSqMeters,
        };
      } else if (formData.assetType === 'VEHICLE') {
        metadata = {
          vin: formData.vin,
          make: formData.make,
          model: formData.model,
        };
      } else if (formData.assetType === 'GRAIN') {
        metadata = {
          siloId: formData.siloId,
          commodityGrade: formData.commodityGrade,
          metricTons: formData.metricTons,
        };
      }

      const created = await createAsset({
        assetId: formData.assetId,
        assetType: formData.assetType,
        name: formData.name,
        declaredValue: Number(formData.declaredValue),
        currency: formData.currency,
        rawFingerprint: formData.rawFingerprint,
        metadata,
      });

      setSubmittedAsset(created);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Register Real-World Asset</h2>
          <p className="page-subtitle">
            Commit asset specification to Hyperledger Fabric world state with deterministic fingerprinting
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('registry')}>
          Cancel
        </button>
      </div>

      <div className="panel" style={{ maxWidth: 840, margin: '0 auto 2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <PlusCircle size={18} style={{ color: 'var(--primary)' }} />
            <span>Asset Registration Form</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Template: {formData.assetType} v1.0
          </span>
        </div>

        <div className="panel-body">
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.85rem 1rem',
                borderRadius: 8,
                color: 'var(--danger)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
              }}
            >
              <strong>Registration Failed:</strong> {error}
            </div>
          )}

          {submittedAsset ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
                Asset Registered on Fabric Ledger
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 480, margin: '0 auto 1.5rem' }}>
                Asset successfully registered with deterministic key and fingerprint index.
              </p>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  padding: '1rem',
                  borderRadius: 8,
                  marginBottom: '1.5rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  color: 'var(--text-secondary)',
                }}
              >
                <div>ID: {submittedAsset.assetId}</div>
                <div>Name: {submittedAsset.name}</div>
                <div>Fingerprint: {submittedAsset.fingerprint}</div>
                <div>Owner: {submittedAsset.owner}</div>
                <div>Value: ${submittedAsset.declaredValue.toLocaleString()} {submittedAsset.currency}</div>
                <div>Status: {submittedAsset.status}</div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSubmittedAsset(null);
                  onNavigate('registry');
                }}
              >
                View in Asset Registry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Asset ID</label>
                  <input
                    type="text"
                    required
                    className="form-input code-font"
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Asset Category Template</label>
                  <select
                    className="form-select"
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                  >
                    <option value="LAND">Real Estate (LAND Template)</option>
                    <option value="VEHICLE">Vehicle (VEHICLE Template)</option>
                    <option value="GRAIN">Agricultural (GRAIN Template)</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Asset Title / Commercial Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pacific Renewable Energy Field 2B"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Declared Valuation</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      required
                      className="form-input"
                      style={{ flex: 1 }}
                      value={formData.declaredValue}
                      onChange={(e) => setFormData({ ...formData, declaredValue: e.target.value })}
                    />
                    <select
                      className="form-select"
                      style={{ width: 90 }}
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Physical Identifier / Raw Fingerprint</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US-CA PARCEL-9921 or VIN-12345"
                    className="form-input code-font"
                    value={formData.rawFingerprint}
                    onChange={(e) => setFormData({ ...formData, rawFingerprint: e.target.value })}
                  />
                </div>

                {/* Template Specific Fields */}
                {formData.assetType === 'LAND' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Cadastral / Parcel ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.cadastralId}
                        onChange={(e) => setFormData({ ...formData, cadastralId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Jurisdiction</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.jurisdiction}
                        onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {formData.assetType === 'VEHICLE' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Make & Manufacturer</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Model Designation</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {formData.assetType === 'GRAIN' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Silo Identifier</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.siloId}
                        onChange={(e) => setFormData({ ...formData, siloId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Commodity Grade</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.commodityGrade}
                        onChange={(e) => setFormData({ ...formData, commodityGrade: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="form-group full-width">
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '1rem',
                      borderRadius: 8,
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <FileText size={20} style={{ color: 'var(--accent-blue)', marginTop: 2 }} />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: '#ffffff' }}>Deterministic Ledger Verification:</strong>
                      <p style={{ marginTop: 4 }}>
                        Fingerprints are normalized and indexed on the blockchain. Any duplicate submission of the same physical parcel, VIN, or commodity batch will be rejected atomically by Fabric validation rules.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--warning)' }}>
                  <ShieldAlert size={15} />
                  <span>Submission requires ISSUER_REGISTRAR or ADMINISTRATOR role.</span>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Committing to Fabric...' : 'Register Asset on Ledger'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
