import React, { useState, useEffect } from 'react';
import { Boxes, Search, Filter, Plus, ShieldCheck, QrCode } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { PassportModal } from '../components/common/PassportModal';
import { AssetRecord, NavPage } from '../types';
import { fetchAssets } from '../services/api';

interface AssetRegistryPageProps {
  onNavigate: (page: NavPage) => void;
}

export const AssetRegistryPage: React.FC<AssetRegistryPageProps> = ({ onNavigate }) => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedPassportId, setSelectedPassportId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchAssets(selectedType);
      setAssets(data);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const filtered = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.fingerprint.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Blockchain Asset Registry</h2>
          <p className="page-subtitle">
            Authoritative real-world asset ledger records stored in Hyperledger Fabric CouchDB world-state
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('registration')}>
          <Plus size={16} />
          <span>Register New Asset</span>
        </button>
      </div>

      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-body" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by Asset ID, Name, or Normalized Fingerprint..."
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="ALL">All Asset Types</option>
                <option value="LAND">Real Estate (LAND)</option>
                <option value="VEHICLE">Vehicles (VEHICLE)</option>
                <option value="GRAIN">Commodities (GRAIN)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Boxes size={18} style={{ color: 'var(--accent-blue)' }} />
            <span>Fabric Ledger Asset Records ({filtered.length})</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Live authoritative state from backend ledger engine
          </span>
        </div>

        <div className="table-responsive">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Querying ledger world state...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Fingerprint</th>
                  <th>Owner Identity</th>
                  <th>Declared Value</th>
                  <th>Evidence SHA-256</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr key={asset.assetId}>
                    <td className="code-font">{asset.assetId}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{asset.name}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>
                        {asset.assetType}
                      </span>
                    </td>
                    <td className="code-font" style={{ fontSize: '0.75rem' }}>
                      {asset.fingerprint}
                    </td>
                    <td className="code-font" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {asset.owner}
                    </td>
                    <td>${asset.declaredValue.toLocaleString()} {asset.currency}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>
                        <ShieldCheck size={14} />
                        {asset.evidenceHashes.length} hashes anchored
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={asset.status} />
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setSelectedPassportId(asset.assetId)}
                        title="View Public QR Passport"
                      >
                        <QrCode size={14} />
                        <span>Passport</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedPassportId && (
        <PassportModal
          assetId={selectedPassportId}
          onClose={() => setSelectedPassportId(null)}
        />
      )}
    </div>
  );
};
