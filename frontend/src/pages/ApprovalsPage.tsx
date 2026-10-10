import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { AssetRecord } from '../types';
import { fetchAssets, submitApproval } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const ApprovalsPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await fetchAssets();
      setAssets(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = async (assetId: string, decision: 'APPROVED' | 'REJECTED') => {
    setSubmittingId(assetId);
    setFeedback(null);
    try {
      await submitApproval(assetId, 'REGISTRATION', decision, `Governance ${decision.toLowerCase()} via UI portal`);
      setFeedback(`Asset '${assetId}' successfully ${decision.toLowerCase()} on Fabric ledger.`);
      await loadData();
    } catch (err) {
      setFeedback(`Approval Action Failed: ${(err as Error).message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Governance & Approvals Queue</h2>
          <p className="page-subtitle">
            Multi-stakeholder authorization with maker-checker separation of duties and threshold verification
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${feedback.includes('Failed') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            padding: '0.85rem 1rem',
            borderRadius: 8,
            color: feedback.includes('Failed') ? 'var(--danger)' : 'var(--success)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          {feedback}
        </div>
      )}

      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Users size={18} style={{ color: 'var(--accent-purple)' }} />
            <span>Multi-Party Governance Policy</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>M-of-N Endorsement</span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff', marginBottom: 4 }}>
                Maker-Checker Separation of Duties
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Asset creators and owners are cryptographically forbidden from approving their own assets.
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff', marginBottom: 4 }}>
                Tokenization Issuance Prerequisite
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Assets must reach APPROVED or VERIFIED status before tokens can be minted.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
            <span>Registered Assets Governance Queue</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live Assets: {assets.length}</span>
        </div>
        <div className="panel-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading queue...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.assetId}>
                    <td className="code-font">{a.assetId}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{a.name}</td>
                    <td className="code-font" style={{ fontSize: '0.75rem' }}>{a.owner}</td>
                    <td>${a.declaredValue.toLocaleString()} {a.currency}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          disabled={submittingId === a.assetId || a.status === 'APPROVED' || a.status === 'TOKENIZED'}
                          onClick={() => handleDecision(a.assetId, 'APPROVED')}
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                          disabled={submittingId === a.assetId || a.status === 'REJECTED'}
                          onClick={() => handleDecision(a.assetId, 'REJECTED')}
                        >
                          <XCircle size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
