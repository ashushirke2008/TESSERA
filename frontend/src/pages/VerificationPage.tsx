import React, { useState } from 'react';
import {
  Building2,
  Calculator,
  Shield,
  ClipboardCheck,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { triggerAdapterVerify, uploadEvidence } from '../services/api';

export const VerificationPage: React.FC = () => {
  const [selectedAssetId, setSelectedAssetId] = useState('AST-LAND-001');
  const [selectedService, setSelectedService] = useState('government-registry');
  const [selectedScenario, setSelectedScenario] = useState('SUCCESS');
  const [executing, setExecuting] = useState(false);
  const [adapterResult, setAdapterResult] = useState<any>(null);
  const [adapterError, setAdapterError] = useState<string | null>(null);

  // Evidence upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('TITLE_DEED');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const adapters = [
    {
      id: 'government-registry',
      name: 'Government Registry Adapter',
      icon: Building2,
      description: 'Verifies title deeds, cadastral surveys, and municipal asset ownership records.',
    },
    {
      id: 'valuation-service',
      name: 'Valuation Service Adapter',
      icon: Calculator,
      description: 'Provides certified appraisal quotes and algorithmic fair-market valuation checks.',
    },
    {
      id: 'insurance-service',
      name: 'Insurance Service Adapter',
      icon: Shield,
      description: 'Validates coverage policies, underwriting limits, and loss history.',
    },
    {
      id: 'inspection-service',
      name: 'Inspection Service Adapter',
      icon: ClipboardCheck,
      description: 'Validates physical inspection certificates, odometer audits, and surveyor stamps.',
    },
  ];

  const handleRunAdapter = async () => {
    setExecuting(true);
    setAdapterResult(null);
    setAdapterError(null);
    try {
      const res = await triggerAdapterVerify(selectedService, selectedAssetId, selectedScenario);
      setAdapterResult(res);
    } catch (err) {
      setAdapterError((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadEvidence(selectedAssetId, docType, uploadFile);
      setUploadResult(res);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Evidence & Verification Pipeline</h2>
          <p className="page-subtitle">
            Orchestrate external adapters, simulate deterministic verification scenarios, and upload SHA-256 evidence
          </p>
        </div>
      </div>

      {/* Adapter Simulator Panel */}
      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Play size={18} style={{ color: 'var(--primary)' }} />
            <span>Interactive External Adapter Simulator</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Stage 4 Verification Engine
          </span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Target Asset ID</label>
              <input
                type="text"
                className="form-input code-font"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adapter Service</label>
              <select
                className="form-select"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
              >
                {adapters.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Deterministic Scenario</label>
              <select
                className="form-select"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
              >
                <option value="SUCCESS">SUCCESS (Clean verification)</option>
                <option value="NOT_FOUND">NOT_FOUND (Missing official record)</option>
                <option value="STALE">STALE (Exceeded freshness limit)</option>
                <option value="EXPIRED">EXPIRED (Policy expired)</option>
                <option value="FAILED">FAILED (Defects or non-compliance)</option>
                <option value="UNAVAILABLE">UNAVAILABLE (503 Gateway Down)</option>
              </select>
            </div>

            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleRunAdapter}
                disabled={executing}
                style={{ height: 42, width: '100%', justifyContent: 'center' }}
              >
                <Play size={16} />
                <span>{executing ? 'Executing...' : 'Trigger Adapter'}</span>
              </button>
            </div>
          </div>

          {adapterError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.85rem 1rem',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}
            >
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
              {adapterError}
            </div>
          )}

          {adapterResult && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: `1px solid ${adapterResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '1.25rem',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: adapterResult.success ? 'var(--success)' : 'var(--danger)' }}>
                  {adapterResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>{adapterResult.message}</span>
                </div>
                <span className="code-font" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {adapterResult.timestamp}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Authority: <strong style={{ color: '#ffffff' }}>{adapterResult.provenance?.registryAuthority}</strong> | Protocol: {adapterResult.provenance?.protocolVersion}
              </div>
              <div className="code-font" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: 4 }}>
                Attestation SHA-256: {adapterResult.provenance?.attestationHash}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Upload Section */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Upload size={18} style={{ color: 'var(--accent-blue)' }} />
            <span>Off-Chain Evidence Upload & SHA-256 Anchor</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            MinIO Object Store + Fabric Commitment
          </span>
        </div>
        <div className="panel-body">
          <form onSubmit={handleUpload}>
            <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Document Category</label>
                <select
                  className="form-select"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="TITLE_DEED">Title Deed / Cadastral Survey</option>
                  <option value="APPRAISAL_REPORT">Independent Appraisal Report</option>
                  <option value="INSURANCE_CERTIFICATE">Insurance Policy Certificate</option>
                  <option value="INSPECTION_AUDIT">Physical Inspection Stamp</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Document File (PDF, PNG, JPEG, JSON)</label>
                <input
                  type="file"
                  required
                  className="form-input"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile}>
              <Upload size={16} />
              <span>{uploading ? 'Computing SHA-256 & Uploading...' : 'Upload & Anchor Hash on Ledger'}</span>
            </button>
          </form>

          {uploadResult && (
            <div
              style={{
                marginTop: '1.25rem',
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '1rem',
                borderRadius: 8,
                fontSize: '0.8rem',
              }}
            >
              <div style={{ color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>
                Evidence File Anchored on Blockchain!
              </div>
              <div>ID: <span className="code-font">{uploadResult.evidenceId}</span></div>
              <div>Storage URI: <span className="code-font">{uploadResult.storageUri}</span></div>
              <div style={{ marginTop: 4 }}>
                SHA-256 Digest: <span className="code-font" style={{ color: 'var(--accent-cyan)' }}>{uploadResult.hashSha256}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
