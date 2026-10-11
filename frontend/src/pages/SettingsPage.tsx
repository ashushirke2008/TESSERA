import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  ShieldCheck,
  RefreshCw,
  Cpu,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { SystemReadinessData, BusinessRole, SystemComponentHealth } from '../types';
import { fetchSystemDetailedHealth } from '../services/api';

interface SettingsPageProps {
  readiness: SystemReadinessData;
  currentRole: BusinessRole;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  readiness,
  currentRole,
}) => {
  const [components, setComponents] = useState<SystemComponentHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealthReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemDetailedHealth();
      setComponents(data.components);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch detailed system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthReport();
  }, []);

  const roles = [
    {
      value: 'ADMINISTRATOR',
      name: 'System Administrator',
      desc: 'System health diagnostics, permitted application config, role administration',
      msp: 'Org1MSP Admin X.509 Certificate',
    },
    {
      value: 'ISSUER_REGISTRAR',
      name: 'Asset Issuer / Registrar',
      desc: 'Create asset drafts, submit registrations, attach authorized SHA-256 evidence',
      msp: 'Org1MSP with Registrar identity',
    },
    {
      value: 'VERIFIER',
      name: 'Accredited Verifier',
      desc: 'Review assigned evidence, verify claims, record certified appraisals',
      msp: 'Accredited Verifier MSP identity',
    },
    {
      value: 'COMPLIANCE_OFFICER',
      name: 'Compliance Officer',
      desc: 'Maker-Checker approval workflows, manage pledges and asset encumbrances',
      msp: 'Governance Board MSP identity',
    },
    {
      value: 'INVESTOR_BUYER',
      name: 'Qualified Investor / Buyer',
      desc: 'Browse permitted registry assets, view holdings, execute authorized token transfers',
      msp: 'Investor / Participant MSP identity',
    },
    {
      value: 'AUDITOR',
      name: 'Regulatory Auditor',
      desc: 'Read-only audit history queries, verify cryptographic proofs and passports',
      msp: 'Regulatory Auditor identity',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: 600,
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle size={12} />
            <span>HEALTHY</span>
          </span>
        );
      case 'degraded':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: 600,
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--warning)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <AlertTriangle size={12} />
            <span>DEGRADED</span>
          </span>
        );
      case 'unavailable':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <XCircle size={12} />
            <span>UNAVAILABLE</span>
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: '0.72rem',
              fontWeight: 600,
              background: 'rgba(107, 114, 128, 0.15)',
              color: 'var(--text-muted)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
            }}
          >
            <HelpCircle size={12} />
            <span>NOT CONFIGURED</span>
          </span>
        );
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">System Health & Diagnostics</h2>
          <p className="page-subtitle">
            Truthful operational status reporting for Hyperledger Fabric, MinIO, REST API, and RBAC
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadHealthReport} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Security Banner on Server-Enforced RBAC */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0.85rem 1.25rem',
          borderRadius: 8,
          background: 'rgba(37, 99, 235, 0.1)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          marginBottom: '1.5rem',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
        }}
      >
        <Lock size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>
          Authenticated as <strong style={{ color: '#ffffff' }}>{currentRole}</strong>.
          Role assignments are cryptographically signed and server-enforced on every request.
          Client-side role switching is prohibited. To switch identities, sign out and authenticate using
          the appropriate demo or enterprise credentials.
        </span>
      </div>

      {/* 10-Component Detailed Health Diagnostics Table */}
      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Cpu size={18} style={{ color: 'var(--primary)' }} />
            <span>Infrastructure Component Health Diagnostics</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            10 Independent Probes • Zero-Leak Redaction
          </span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {loading && components.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Probing system components...
            </div>
          ) : error ? (
            <div style={{ padding: '1.5rem', color: 'var(--danger)' }}>
              Failed to load diagnostics: {error}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Status</th>
                    <th>Explanation</th>
                    <th>Check Type</th>
                    <th>Remediation Hint</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{c.name}</td>
                      <td>{getStatusBadge(c.status)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {c.explanation}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {c.checkType}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c.safeRemediationHint}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Hyperledger Fabric Network Parameters */}
      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Server size={18} style={{ color: 'var(--accent-blue)' }} />
            <span>Hyperledger Fabric Network Parameters</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Channel: mychannel</span>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Fabric Channel Name</label>
              <input type="text" readOnly className="form-input code-font" value="mychannel" />
            </div>

            <div className="form-group">
              <label className="form-label">Canonical Production Chaincode</label>
              <input
                type="text"
                readOnly
                className="form-input code-font"
                value="blockchain/chaincode/asset-contract"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Local Peer Endpoint</label>
              <input
                type="text"
                readOnly
                className="form-input code-font"
                value={readiness.dependencies?.fabric?.endpoint || 'localhost:7051'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Organization MSP ID</label>
              <input type="text" readOnly className="form-input code-font" value="Org1MSP" />
            </div>

            <div className="form-group">
              <label className="form-label">Fabric CA URL</label>
              <input type="text" readOnly className="form-input code-font" value="https://localhost:7054" />
            </div>

            <div className="form-group">
              <label className="form-label">World State Database</label>
              <input
                type="text"
                readOnly
                className="form-input code-font"
                value="CouchDB (Fabric-managed only)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MinIO Object Store Settings */}
      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Database size={18} style={{ color: 'var(--warning)' }} />
            <span>MinIO Evidence Store Settings</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Off-Chain Object Store</span>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">MinIO Server Endpoint</label>
              <input
                type="text"
                readOnly
                className="form-input code-font"
                value={readiness.dependencies?.minio?.endpoint || 'localhost:9000'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Evidence Storage Bucket</label>
              <input type="text" readOnly className="form-input code-font" value="tessera-evidence" />
            </div>

            <div className="form-group">
              <label className="form-label">Hash Integrity Standard</label>
              <input type="text" readOnly className="form-input code-font" value="SHA-256 (256-bit digest)" />
            </div>

            <div className="form-group">
              <label className="form-label">Confidential Data Isolation</label>
              <input
                type="text"
                readOnly
                className="form-input code-font"
                value="Fabric Private Data Collections (PDC)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control Specification */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={18} style={{ color: 'var(--accent-purple)' }} />
            <span>Server-Enforced Role Permissions Matrix</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>6 Canonical Roles</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Permitted Operations</th>
                <th>Fabric Identity / MSP Requirement</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.value}>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{r.name}</td>
                  <td>{r.desc}</td>
                  <td className="code-font">{r.msp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
