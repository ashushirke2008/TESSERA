import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, ShieldCheck, Play, CheckCircle2, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { AssetRecord, PledgeRecord, TransferSimulationResult } from '../types';
import { fetchAssets, fetchPledges, createPledge, releasePledge, simulateTransfer, executeTransfer } from '../services/api';

export const TransfersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulate' | 'execute' | 'pledges'>('simulate');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [pledges, setPledges] = useState<PledgeRecord[]>([]);

  // Simulation form
  const [simTokenId, setSimTokenId] = useState('');
  const [simFrom, setSimFrom] = useState('did:fabric:org1:owner892');
  const [simTo, setSimTo] = useState('did:fabric:investor:buyer01');
  const [simAmount, setSimAmount] = useState('5000');
  const [simResult, setSimResult] = useState<TransferSimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Execution form
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);

  // Pledge form
  const [pledgeAssetId, setPledgeAssetId] = useState('AST-LAND-001');
  const [lender, setLender] = useState('did:fabric:bank:senior_debt');
  const [borrower, setBorrower] = useState('did:fabric:org1:owner892');
  const [pledgeAmount, setPledgeAmount] = useState('500000');
  const [pledgeFeedback, setPledgeFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [aList, pList] = await Promise.all([fetchAssets(), fetchPledges()]);
      setAssets(aList);
      setPledges(pList);
      const tokenized = aList.find((a) => a.tokenId);
      if (tokenized && tokenized.tokenId) {
        setSimTokenId(tokenized.tokenId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimResult(null);
    setSimError(null);
    try {
      const res = await simulateTransfer({
        tokenId: simTokenId,
        fromOwner: simFrom,
        toOwner: simTo,
        amount: Number(simAmount),
      });
      setSimResult(res);
    } catch (err) {
      setSimError((err as Error).message);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await executeTransfer({
        tokenId: simTokenId,
        fromOwner: simFrom,
        toOwner: simTo,
        amount: Number(simAmount),
      });
      setExecResult(res);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setPledgeFeedback(null);
    try {
      await createPledge({
        assetId: pledgeAssetId,
        lender,
        borrower,
        amountPledged: Number(pledgeAmount),
      });
      setPledgeFeedback(`Pledge successfully created and encumbered on Fabric ledger.`);
      await loadData();
    } catch (err) {
      setPledgeFeedback(`Pledge Creation Failed: ${(err as Error).message}`);
    }
  };

  const handleReleasePledge = async (id: string) => {
    try {
      await releasePledge(id);
      setPledgeFeedback(`Pledge '${id}' successfully released.`);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Transfers, Simulation & Pledge Controls</h2>
          <p className="page-subtitle">
            Evaluate on-chain transfer policies, simulate transfers read-only, execute atomic ownership changes, and manage encumbrances
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'simulate' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('simulate')}
        >
          <Play size={16} />
          <span>Read-Only Transfer Simulation</span>
        </button>
        <button
          className={`btn ${activeTab === 'execute' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('execute')}
        >
          <ArrowLeftRight size={16} />
          <span>Execute On-Chain Transfer</span>
        </button>
        <button
          className={`btn ${activeTab === 'pledges' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pledges')}
        >
          <Lock size={16} />
          <span>Pledges & Restrictions ({pledges.filter((p) => p.status === 'ACTIVE').length} Active)</span>
        </button>
      </div>

      {activeTab === 'simulate' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <ShieldCheck size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span>Simulate Transfer Policy & Invariants (Read-Only)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Does not mutate blockchain state
            </span>
          </div>
          <div className="panel-body">
            <form onSubmit={handleSimulate}>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Token Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TKN-LAN-xxx"
                    className="form-input code-font"
                    value={simTokenId}
                    onChange={(e) => setSimTokenId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Amount (Units)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sender Identity (From)</label>
                  <input
                    type="text"
                    required
                    className="form-input code-font"
                    value={simFrom}
                    onChange={(e) => setSimFrom(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Identity (To)</label>
                  <input
                    type="text"
                    required
                    className="form-input code-font"
                    value={simTo}
                    onChange={(e) => setSimTo(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                <Play size={16} />
                <span>Simulate Transfer Decision</span>
              </button>
            </form>

            {simError && (
              <div
                style={{
                  marginTop: '1.25rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '1rem',
                  borderRadius: 8,
                  color: 'var(--danger)',
                }}
              >
                {simError}
              </div>
            )}

            {simResult && (
              <div
                style={{
                  marginTop: '1.5rem',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${simResult.allowed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  padding: '1.25rem',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {simResult.allowed ? (
                    <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
                  ) : (
                    <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
                  )}
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: simResult.allowed ? 'var(--success)' : 'var(--danger)' }}>
                    {simResult.allowed ? 'TRANSFER PERMITTED BY POLICY' : 'TRANSFER PROHIBITED BY ON-CHAIN RULES'}
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>Asset Status: <strong style={{ color: '#ffffff' }}>{simResult.assetStatus}</strong></div>
                  <div>Valuation Valid: <strong style={{ color: simResult.valuationValid ? 'var(--success)' : 'var(--danger)' }}>{simResult.valuationValid ? 'Fresh' : 'Stale/Expired'}</strong></div>
                  <div>Active Pledge: <strong style={{ color: simResult.pledgeActive ? 'var(--danger)' : 'var(--success)' }}>{simResult.pledgeActive ? 'Active Lien' : 'Clear'}</strong></div>
                  <div>Policy Compliant: <strong style={{ color: simResult.policyCompliant ? 'var(--success)' : 'var(--danger)' }}>Compliant</strong></div>
                </div>

                {simResult.reasonCodes.length > 0 && (
                  <div style={{ marginTop: 12, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, color: 'var(--danger)', fontSize: '0.8rem' }}>
                    Blocking Reasons: <strong>{simResult.reasonCodes.join(', ')}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'execute' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <ArrowLeftRight size={18} style={{ color: 'var(--primary)' }} />
              <span>Execute Atomic Transfer on Fabric Ledger</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Revalidates all rules and mutates ownership balance
            </span>
          </div>
          <div className="panel-body">
            <form onSubmit={handleExecute}>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Token Identifier</label>
                  <input
                    type="text"
                    required
                    className="form-input code-font"
                    value={simTokenId}
                    onChange={(e) => setSimTokenId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Amount (Units)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sender Identity (From)</label>
                  <input
                    type="text"
                    required
                    className="form-input code-font"
                    value={simFrom}
                    onChange={(e) => setSimFrom(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Identity (To)</label>
                  <input
                    type="text"
                    required
                    className="form-input code-font"
                    value={simTo}
                    onChange={(e) => setSimTo(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={executing}>
                <ArrowLeftRight size={16} />
                <span>{executing ? 'Committing Transaction...' : 'Commit Ownership Transfer'}</span>
              </button>
            </form>

            {execResult && (
              <div
                style={{
                  marginTop: '1.5rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1.25rem',
                  borderRadius: 8,
                }}
              >
                <div style={{ color: 'var(--success)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={18} />
                  <span>Transaction Confirmed & Committed to Fabric Ledger!</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Status: <strong>{execResult.transactionStatus}</strong> | Token: <span className="code-font">{execResult.token.tokenId}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pledges' && (
        <div>
          {pledgeFeedback && (
            <div
              style={{
                background: pledgeFeedback.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${pledgeFeedback.includes('Failed') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                padding: '0.85rem 1rem',
                borderRadius: 8,
                color: pledgeFeedback.includes('Failed') ? 'var(--danger)' : 'var(--success)',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
              }}
            >
              {pledgeFeedback}
            </div>
          )}

          {/* Create Pledge Panel */}
          <div className="panel" style={{ marginBottom: '2rem' }}>
            <div className="panel-header">
              <div className="panel-title">
                <Lock size={18} style={{ color: 'var(--warning)' }} />
                <span>Create Asset Pledge (Double-Pledge Defense Enforced)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Requires COMPLIANCE_OFFICER role
              </span>
            </div>
            <div className="panel-body">
              <form onSubmit={handleCreatePledge}>
                <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Asset ID to Pledge</label>
                    <select
                      className="form-select"
                      value={pledgeAssetId}
                      onChange={(e) => setPledgeAssetId(e.target.value)}
                    >
                      {assets.map((a) => (
                        <option key={a.assetId} value={a.assetId}>
                          {a.assetId} — {a.name} ({a.activePledgeId ? 'Currently Pledged' : 'Clear'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pledge Amount ($)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={pledgeAmount}
                      onChange={(e) => setPledgeAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Secured Lender Identity</label>
                    <input
                      type="text"
                      required
                      className="form-input code-font"
                      value={lender}
                      onChange={(e) => setLender(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Borrower Identity</label>
                    <input
                      type="text"
                      required
                      className="form-input code-font"
                      value={borrower}
                      onChange={(e) => setBorrower(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Lock size={16} />
                  <span>Create Encumbrance on Ledger</span>
                </button>
              </form>
            </div>
          </div>

          {/* Active Pledges Table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <span>Active & Released Pledges</span>
              </div>
            </div>
            <div className="panel-body">
              {pledges.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No active or historical pledges registered on the ledger.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pledge ID</th>
                      <th>Asset ID</th>
                      <th>Lender</th>
                      <th>Borrower</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pledges.map((p) => (
                      <tr key={p.pledgeId}>
                        <td className="code-font">{p.pledgeId}</td>
                        <td className="code-font">{p.assetId}</td>
                        <td className="code-font" style={{ fontSize: '0.75rem' }}>{p.lender}</td>
                        <td className="code-font" style={{ fontSize: '0.75rem' }}>{p.borrower}</td>
                        <td>${p.amountPledged.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${p.status === 'ACTIVE' ? 'badge-warn' : 'badge-draft'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          {p.status === 'ACTIVE' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleReleasePledge(p.pledgeId)}
                            >
                              <Unlock size={13} />
                              <span>Release</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
