import React from 'react';
import {
  Boxes,
  FileCheck2,
  CheckCheck,
  Coins,
  Server,
  Database,
  Cpu,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { SystemHealthData, SystemReadinessData, NavPage } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';

interface DashboardProps {
  health: SystemHealthData;
  readiness: SystemReadinessData;
  onNavigate: (page: NavPage) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ health, readiness, onNavigate }) => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Enterprise Dashboard</h2>
          <p className="page-subtitle">
            Hyperledger Fabric Asset Registry, Evidence Management & Tokenization Operations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('registry')}>
            <Boxes size={16} />
            <span>Browse Registry</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('registration')}>
            <Layers size={16} />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Registered Assets</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
              <Boxes size={18} />
            </div>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-subtext">
            <span>Stage 1 Chaincode ledger pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Pending Claims</span>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <FileCheck2 size={18} />
            </div>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-subtext">
            <span>Stage 2 External adapters pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Approvals Queue</span>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
              <CheckCheck size={18} />
            </div>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-subtext">
            <span>Multi-party approval stage</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Tokenized Holdings</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Coins size={18} />
            </div>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-subtext">
            <span>Stage 3 Tokenization pending</span>
          </div>
        </div>
      </div>

      {/* System Infrastructure Readiness Panel */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Server size={18} style={{ color: 'var(--primary)' }} />
            <span>Infrastructure & Gateway Readiness</span>
          </div>
          <StatusBadge status={readiness.status} />
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Express API */}
            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cpu size={16} style={{ color: 'var(--primary)' }} /> Express REST API
                </span>
                <StatusBadge status={health.status} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Uptime: {health.uptime}s | Env: {health.environment} | Version: {health.version}
              </p>
            </div>

            {/* Hyperledger Fabric Gateway */}
            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={16} style={{ color: 'var(--accent-blue)' }} /> Fabric Gateway (Org1MSP)
                </span>
                <StatusBadge status={readiness.dependencies?.fabric?.status || 'unconfigured'} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {readiness.dependencies?.fabric?.message || 'Fabric peer connection uninitialized'}
              </p>
            </div>

            {/* MinIO Object Store */}
            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={16} style={{ color: 'var(--warning)' }} /> MinIO Evidence Store
                </span>
                <StatusBadge status={readiness.dependencies?.minio?.status || 'unconfigured'} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {readiness.dependencies?.minio?.message || 'MinIO off-chain evidence uninitialized'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Stage Roadmap Banner */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ExternalLink size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>TESSERA Implementation Milestones</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>M1 Foundation Active</span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>M1: App Foundation</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>React UI & Express API Ready</div>
            </div>
            <div style={{ borderLeft: '3px solid var(--border-prominent)', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>M2: Fabric Registry</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Go chaincode & CouchDB</div>
            </div>
            <div style={{ borderLeft: '3px solid var(--border-prominent)', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>M3: Evidence & MinIO</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SHA-256 integrity & PDC</div>
            </div>
            <div style={{ borderLeft: '3px solid var(--border-prominent)', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>M4: Tokenization</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Holdings & transfer restrictions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
