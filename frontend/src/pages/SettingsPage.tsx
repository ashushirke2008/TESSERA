import React from 'react';
import { Server, Database, Key, UserCheck } from 'lucide-react';
import { SystemReadinessData, BusinessRole } from '../types';

interface SettingsPageProps {
  readiness: SystemReadinessData;
  currentRole: BusinessRole;
  onRoleChange: (role: BusinessRole) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  readiness,
  currentRole,
  onRoleChange,
}) => {
  const roles: { value: BusinessRole; name: string; desc: string; msp: string }[] = [
    {
      value: 'ADMINISTRATOR',
      name: 'System Administrator',
      desc: 'Network configuration, channel updates, CA management, system health inspection',
      msp: 'Admin MSP certificate',
    },
    {
      value: 'ISSUER_REGISTRAR',
      name: 'Asset Issuer / Registrar',
      desc: 'Stage asset draft, submit registration transactions, attach metadata & evidence',
      msp: 'Org1MSP with Registrar attribute',
    },
    {
      value: 'VERIFIER',
      name: 'Independent Verifier',
      desc: 'Attest evidence validity, verify claims, perform external adapter checks',
      msp: 'Accredited Verifier MSP',
    },
    {
      value: 'COMPLIANCE_OFFICER',
      name: 'Compliance Officer (Approver)',
      desc: 'Multi-signature approval of asset registration & tokens (Maker-Checker enforced)',
      msp: 'Governance Board MSP identity',
    },
    {
      value: 'INVESTOR_BUYER',
      name: 'Investor / Buyer',
      desc: 'Holds fractional asset tokens, simulates transfers, pledges tokens as collateral',
      msp: 'Investor / Participant MSP',
    },
    {
      value: 'AUDITOR',
      name: 'Regulatory Auditor',
      desc: 'Read-only audit log query, cryptographic hash inspection, passport verification',
      msp: 'Compliance Auditor identity',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Platform & Network Configuration</h2>
          <p className="page-subtitle">
            Inspect Hyperledger Fabric network topology, MinIO object store credentials, and role access controls
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <UserCheck size={18} style={{ color: 'var(--primary)' }} />
            <span>Active Session Role & Identity Switcher</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Current: <strong style={{ color: 'var(--primary)' }}>{currentRole}</strong>
          </span>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Switching your active role dynamically authenticates your session against the backend API with the corresponding DID identity and MSP role credentials.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {roles.map((r) => {
              const isActive = currentRole === r.value;
              return (
                <div
                  key={r.value}
                  style={{
                    padding: '1rem',
                    borderRadius: 8,
                    background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => onRoleChange(r.value)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: isActive ? 'var(--primary)' : '#fff', fontSize: '0.9rem' }}>
                      {r.name}
                    </span>
                    {isActive && <span className="badge badge-success">Active</span>}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    {r.desc}
                  </p>
                  <span className="code-font" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    MSP: {r.msp}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Server size={18} style={{ color: 'var(--primary)' }} />
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
              <label className="form-label">Fabric World State Database</label>
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

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Key size={18} style={{ color: 'var(--accent-purple)' }} />
            <span>Role-Based Access Control (RBAC) Specification</span>
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
