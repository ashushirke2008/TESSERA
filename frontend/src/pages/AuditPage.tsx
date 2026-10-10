import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Hash, FileCheck, Layers, Search, RefreshCw, CheckCircle2, Filter } from 'lucide-react';
import { fetchAuditHistory } from '../services/api';
import { AuditLogEntry } from '../types';
import { EmptyState } from '../components/common/EmptyState';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAsset, setFilterAsset] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditHistory(filterAsset ? filterAsset.trim() : undefined);
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [filterAsset]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const uniqueAssets = Array.from(new Set(logs.map((l) => l.assetId).filter(Boolean)));
  const verifiedTxCount = logs.filter((l) => l.verifiedOnChain).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Cryptographic Audit & Provenance Trail</h2>
          <p className="page-subtitle">
            Hyperledger Fabric immutable transaction history, endorsement verifications, and audit trail
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadAuditLogs} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh Trail</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Ledger Height</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-value">Block #{logs.length > 0 ? logs.length : 1}</div>
          <div className="stat-subtext">Verified channel block height</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Committed Transactions</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)' }}>
              <Hash size={18} />
            </div>
          </div>
          <div className="stat-value">{verifiedTxCount}</div>
          <div className="stat-subtext">Cryptographically confirmed txs</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Tracked Assets</span>
            <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
              <FileCheck size={18} />
            </div>
          </div>
          <div className="stat-value">{uniqueAssets.length}</div>
          <div className="stat-subtext">Assets with immutable log history</div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <strong>Audit Service Error:</strong> {error}
        </div>
      )}

      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Filter size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Filter Audit Stream</span>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Filter by Asset ID (e.g. AST-LAND-001) or leave empty for all events..."
                value={filterAsset}
                onChange={(e) => setFilterAsset(e.target.value)}
              />
            </div>
            {filterAsset && (
              <button className="btn btn-secondary" onClick={() => setFilterAsset('')}>
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldAlert size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Immutable Blockchain Transaction History</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing {logs.length} transactions
          </span>
        </div>
        <div className="panel-body">
          {logs.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No Audit Records Found"
              description="No transaction events match the current filter criteria."
              stageNotice="Stage 5 Milestone: React dashboards, QR Asset Passport and audit views"
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Asset ID</th>
                    <th>Actor Identity</th>
                    <th>Fabric Tx ID</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-info">{log.eventType}</span>
                      </td>
                      <td className="code-font" style={{ fontWeight: 600 }}>
                        {log.assetId || '—'}
                      </td>
                      <td className="code-font" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.actor}
                      </td>
                      <td className="code-font" style={{ fontSize: '0.75rem' }} title={log.txId}>
                        {log.txId.substring(0, 16)}...
                      </td>
                      <td>
                        {log.verifiedOnChain ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Committed
                          </span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedLog(log)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">
                <Hash size={18} style={{ color: 'var(--primary)' }} />
                <span>Transaction Envelope #{selectedLog.txId.substring(0, 16)}...</span>
              </div>
              <button className="btn-close" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Event Type</label>
                <input type="text" readOnly className="form-input" value={selectedLog.eventType} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Committed Timestamp</label>
                <input type="text" readOnly className="form-input" value={selectedLog.timestamp} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Submitting Actor Identity</label>
                <input type="text" readOnly className="form-input code-font" value={selectedLog.actor} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Hyperledger Fabric Transaction ID</label>
                <input type="text" readOnly className="form-input code-font" value={selectedLog.txId} />
              </div>
              <div className="form-group">
                <label className="form-label">Ledger Payload & Metadata</label>
                <pre
                  className="code-font"
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '1rem',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
