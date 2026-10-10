import React from 'react';
import { Shield, User, RefreshCw, Server } from 'lucide-react';
import { BusinessRole, SystemHealthData } from '../../types';

interface TopNavProps {
  currentRole: BusinessRole;
  onRoleChange: (role: BusinessRole) => void;
  health: SystemHealthData;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentRole,
  onRoleChange,
  health,
  onRefresh,
  isRefreshing,
}) => {
  const roles: { value: BusinessRole; label: string }[] = [
    { value: 'ADMINISTRATOR', label: 'Administrator' },
    { value: 'ISSUER_REGISTRAR', label: 'Asset Registrar' },
    { value: 'VERIFIER', label: 'Independent Verifier' },
    { value: 'INVESTOR_BUYER', label: 'Investor / Buyer' },
    { value: 'COMPLIANCE_OFFICER', label: 'Compliance Officer' },
    { value: 'AUDITOR', label: 'Auditor' },
  ];

  return (
    <header className="top-nav">
      <div className="nav-left-badge">
        <div className="chain-env-badge">
          <Shield size={14} />
          <span>Hyperledger Fabric • Org1MSP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Server size={14} />
          <span>Channel: <strong style={{ color: 'var(--text-secondary)' }}>mychannel</strong></span>
        </div>
      </div>

      <div className="nav-right-controls">
        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          title="Refresh Backend Readiness"
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          <span>Status</span>
        </button>

        <div className="role-selector-wrap">
          <User size={14} style={{ color: 'var(--primary)' }} />
          <span>Active Role:</span>
          <select
            className="role-select"
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as BusinessRole)}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 6,
            background: health.status === 'UP' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: health.status === 'UP' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${health.status === 'UP' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span className={`status-dot ${health.status === 'UP' ? 'green' : 'red'}`} />
          <span>API: {health.status}</span>
        </div>
      </div>
    </header>
  );
};
