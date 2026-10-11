import React, { useState, useEffect } from 'react';
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
  Info,
  RefreshCw,
} from 'lucide-react';
import { SystemHealthData, SystemReadinessData, NavPage, DashboardStats } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { fetchDashboardStats } from '../services/api';

interface DashboardProps {
  health: SystemHealthData;
  readiness: SystemReadinessData;
  onNavigate: (page: NavPage) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ health, readiness, onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Honest Data Source Attribution Banner */}
      {stats?.isDemonstrationData && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#ffffff' }}>DEMONSTRATION FIXTURE DATA ACTIVE:</strong> Metrics reflect
              authoritative records from the backend ledger engine (including canonical seed assets).
              Production Hyperledger Fabric Gateway & CouchDB network connection is pending.
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={loadStats}
            title="Refresh Ledger Metrics"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flexShrink: 0 }}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        {/* Card 1: Registered Assets */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Registered Assets</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
              <Boxes size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading && !stats ? '...' : error ? '—' : stats?.registeredAssets ?? 0}
          </div>
          <div className="stat-subtext">
            <span>
              {loading && !stats
                ? 'Querying ledger state...'
                : error
                ? `Query error: ${error}`
                : stats?.isDemonstrationData
                ? 'Demonstration assets active'
                : 'Confirmed Fabric world-state'}
            </span>
          </div>
        </div>

        {/* Card 2: Pending Claims */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Pending Claims</span>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <FileCheck2 size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading && !stats ? '...' : error ? '—' : stats?.pendingClaims ?? 0}
          </div>
          <div className="stat-subtext">
            <span>
              {loading && !stats
                ? 'Querying claims...'
                : stats?.pendingClaims === 0
                ? 'No claims awaiting review'
                : `${stats?.pendingClaims} claims in verification queue`}
            </span>
          </div>
        </div>

        {/* Card 3: Approvals Queue */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Approvals Queue</span>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
              <CheckCheck size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading && !stats ? '...' : error ? '—' : stats?.approvalsQueue ?? 0}
          </div>
          <div className="stat-subtext">
            <span>
              {loading && !stats
                ? 'Querying approvals...'
                : stats?.approvalsQueue === 0
                ? 'No pending approvals'
                : `${stats?.approvalsQueue} assets pending approval`}
            </span>
          </div>
        </div>

        {/* Card 4: Tokenized Holdings */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Tokenized Holdings</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Coins size={18} />
            </div>
          </div>
          <div className="stat-value">
            {loading && !stats ? '...' : error ? '—' : stats?.tokenizedHoldings ?? 0}
          </div>
          <div className="stat-subtext">
            <span>
              {loading && !stats
                ? 'Querying tokens...'
                : stats?.tokenizedHoldings === 0
                ? 'No fractional tokens issued'
                : `${stats?.tokenizedHoldings} active token issues`}
            </span>
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
                {readiness.dependencies?.fabric?.message || 'Fabric peer connection uninitialized (Stage 1 Pending)'}
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
                {readiness.dependencies?.minio?.message || 'MinIO off-chain evidence uninitialized (Stage 2 Pending)'}
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
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>M1 Foundation & Auth Active</span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>M1: App Foundation & Auth</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>React UI, Express API & RBAC Ready</div>
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
