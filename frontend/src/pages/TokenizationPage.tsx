import React, { useState, useEffect } from 'react';
import { Coins, PieChart, ShieldAlert, Plus, CheckCircle2 } from 'lucide-react';
import { AssetRecord } from '../types';
import { fetchAssets, issueTokens } from '../services/api';

export const TokenizationPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [symbol, setSymbol] = useState('LAND1');
  const [totalSupply, setTotalSupply] = useState('1000000');
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await fetchAssets();
      setAssets(list);
      const eligible = list.find((a) => (a.status === 'APPROVED' || a.status === 'VERIFIED') && !a.tokenId);
      if (eligible) {
        setSelectedAssetId(eligible.assetId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    setIssuing(true);
    setFeedback(null);
    try {
      const token = await issueTokens(selectedAssetId, symbol, Number(totalSupply));
      setFeedback(`Tokens successfully minted: ${token.symbol} (${token.totalSupply.toLocaleString()} units) bound to asset ${token.assetId}`);
      await loadData();
    } catch (err) {
      setFeedback(`Issuance Failed: ${(err as Error).message}`);
    } finally {
      setIssuing(false);
    }
  };

  const tokenizedAssets = assets.filter((a) => a.tokenId);
  const totalValueTokenized = tokenizedAssets.reduce((acc, a) => acc + (a.declaredValue || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Asset Fractionalization & Tokenization</h2>
          <p className="page-subtitle">
            Token unit issuance, fractional holding registers, and regulatory compliance rules
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Tokenized Value</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Coins size={18} />
            </div>
          </div>
          <div className="stat-value">${totalValueTokenized.toLocaleString()}</div>
          <div className="stat-subtext">Total active on-chain fractional pool</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Token Pools Active</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
              <PieChart size={18} />
            </div>
          </div>
          <div className="stat-value">{tokenizedAssets.length}</div>
          <div className="stat-subtext">Fractionalized asset pools</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Transfer Restrictions</span>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="stat-value">Enforced</div>
          <div className="stat-subtext">Pledge & valuation freshness rules</div>
        </div>
      </div>

      {/* Issuance Form */}
      <div className="panel" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title">
            <Plus size={18} style={{ color: 'var(--primary)' }} />
            <span>Issue New Fractional Tokens for Approved Asset</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Requires ADMINISTRATOR role & fresh valuation
          </span>
        </div>
        <div className="panel-body">
          <form onSubmit={handleIssue}>
            <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Eligible Approved Asset</label>
                <select
                  className="form-select"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                >
                  <option value="">-- Select Asset --</option>
                  {assets
                    .filter((a) => !a.tokenId)
                    .map((a) => (
                      <option key={a.assetId} value={a.assetId}>
                        {a.assetId} — {a.name} ({a.status})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Token Symbol</label>
                <input
                  type="text"
                  required
                  className="form-input code-font"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Total Fractional Supply</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={issuing || !selectedAssetId}>
              <Coins size={16} />
              <span>{issuing ? 'Minting on Fabric...' : 'Mint & Bind Tokens on Ledger'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Active Token Pools */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Coins size={18} style={{ color: 'var(--primary)' }} />
            <span>Active Fractional Token Pools ({tokenizedAssets.length})</span>
          </div>
        </div>
        <div className="panel-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading token holdings...
            </div>
          ) : tokenizedAssets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No assets have been tokenized yet. Approve an asset above and issue tokens to create a fractional pool.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Underlying Asset</th>
                  <th>Symbol</th>
                  <th>Total Supply</th>
                  <th>Asset Status</th>
                  <th>Initial Holding</th>
                </tr>
              </thead>
              <tbody>
                {tokenizedAssets.map((a) => (
                  <tr key={a.tokenId}>
                    <td className="code-font">{a.tokenId}</td>
                    <td>{a.name} ({a.assetId})</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>LND-FRACTION</td>
                    <td>1,000,000 units</td>
                    <td>
                      <span className="badge badge-tokenized">
                        <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                        TOKENIZED
                      </span>
                    </td>
                    <td className="code-font" style={{ fontSize: '0.75rem' }}>{a.owner}</td>
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
