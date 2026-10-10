import React, { useEffect, useState } from 'react';
import { X, Printer, ShieldCheck, ExternalLink, QrCode } from 'lucide-react';
import { AssetPassport } from '../../types';
import { fetchPassport, fetchPassportQr } from '../../services/api';
import { StatusBadge } from './StatusBadge';

interface PassportModalProps {
  assetId: string;
  onClose: () => void;
}

export const PassportModal: React.FC<PassportModalProps> = ({ assetId, onClose }) => {
  const [passport, setPassport] = useState<AssetPassport | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [p, qr] = await Promise.all([fetchPassport(assetId), fetchPassportQr(assetId)]);
        setPassport(p);
        setQrDataUrl(qr.qrDataUrl);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assetId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-prominent)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div className="panel-header" style={{ background: 'var(--bg-elevated)' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={20} style={{ color: 'var(--primary)' }} />
            <span>Verifiable QR Asset Passport</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="panel-body" style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading cryptographic passport data...
            </div>
          ) : error || !passport ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>
              Failed to load passport: {error}
            </div>
          ) : (
            <div>
              {/* Top Certificate Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Hyperledger Fabric Trust Anchor
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                    {passport.name}
                  </h3>
                  <div className="code-font" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                    {passport.passportId}
                  </div>
                </div>
                <StatusBadge status={passport.status} />
              </div>

              {/* QR and Verified Details Grid */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                {qrDataUrl && (
                  <div
                    style={{
                      background: '#ffffff',
                      padding: 10,
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    <img src={qrDataUrl} alt="Passport QR" style={{ width: 140, height: 140 }} />
                    <span style={{ fontSize: '0.65rem', color: '#111827', fontWeight: 700, marginTop: 4 }}>
                      SCAN TO VERIFY
                    </span>
                  </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Asset Category: </span>
                    <strong style={{ color: '#ffffff' }}>{passport.assetType}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Fingerprint (Normalized): </span>
                    <div className="code-font" style={{ fontSize: '0.75rem' }}>
                      {passport.fingerprintNormalized}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Certified Valuation: </span>
                    <strong style={{ color: 'var(--success)' }}>
                      ${passport.latestValuation.toLocaleString()} {passport.currency}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Verified Evidence Files: </span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      {passport.evidenceCount} SHA-256 hashes anchored
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Issuance Date: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {new Date(passport.issuedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Public Proof Hash */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                  IMMUTABLE PROOF DIGEST (SHA-256)
                </div>
                <div className="code-font" style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                  {passport.publicProofHash}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Privacy-Preserving Public View
                </span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" onClick={handlePrint}>
                    <Printer size={15} />
                    <span>Print Passport</span>
                  </button>
                  <a
                    href={`/api/passport/${passport.assetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={15} />
                    <span>Raw JSON Proof</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
