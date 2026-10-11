import React, { useState, useEffect } from 'react';
import {
  Layers,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  KeyRound,
  Check,
} from 'lucide-react';
import { login, fetchDemoAccounts } from '../services/api';
import { AuthUser, DemoAccount } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoPanelOpen, setDemoPanelOpen] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoAuthEnabled, setDemoAuthEnabled] = useState(false);
  const [demoPasswordHint, setDemoPasswordHint] = useState<string | undefined>(undefined);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  useEffect(() => {
    // Fetch demo accounts metadata (disabled in production)
    fetchDemoAccounts()
      .then((data) => {
        if (data.demoAuthEnabled && data.accounts.length > 0) {
          setDemoAuthEnabled(true);
          setDemoAccounts(data.accounts);
          setDemoPasswordHint(data.demoPasswordHint);
        } else {
          setDemoAuthEnabled(false);
        }
      })
      .catch(() => {
        setDemoAuthEnabled(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(trimmedUser, password);
      onLoginSuccess(data.user, data.token);
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setUsername(acc.username);
    setSelectedUsername(acc.username);
    if (demoPasswordHint) {
      setPassword(demoPasswordHint);
    }
    setErrorMessage(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #111827 0%, #030712 100%)',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 54,
              height: 54,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
              marginBottom: '1rem',
            }}
          >
            <Layers size={28} />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#ffffff',
              margin: '0 0 0.25rem 0',
            }}
          >
            TESSERA
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            Verifiable Real-World Asset Tokenization Platform
          </p>
        </div>

        {/* Login Card */}
        <div
          className="panel"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            background: 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="panel-body" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
                Enterprise Sign In
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Fabric Gateway credentials & authenticated role verification
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="username" style={{ fontSize: '0.8rem' }}>
                  Username / Identity ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    placeholder="e.g. demo.admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                  />
                  <User
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="password" style={{ fontSize: '0.8rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%' }}
                  />
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <span className="spin" style={{ display: 'inline-block' }}>⏳</span>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Sign In to TESSERA</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Local Demonstration Accounts Collapsible Panel */}
          {demoAuthEnabled && demoAccounts.length > 0 && (
            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <button
                type="button"
                onClick={() => setDemoPanelOpen(!demoPanelOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>LOCAL DEMONSTRATION ACCOUNTS — NOT FOR PRODUCTION</span>
                </div>
                {demoPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {demoPanelOpen && (
                <div style={{ padding: '0 1.5rem 1.25rem 1.5rem' }}>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      margin: '0 0 0.85rem 0',
                    }}
                  >
                    Select an account to prefill credentials. Click <strong>Sign In</strong> to authenticate.
                    Shared demo password:{' '}
                    <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 5px', borderRadius: 4, color: '#ffffff' }}>
                      {demoPasswordHint || 'TesseraDemo@2026'}
                    </code>
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                      gap: '0.5rem',
                    }}
                  >
                    {demoAccounts.map((acc) => {
                      const isSelected = selectedUsername === acc.username;
                      return (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => handleSelectDemoAccount(acc)}
                          style={{
                            textAlign: 'left',
                            padding: '0.6rem 0.75rem',
                            borderRadius: 6,
                            background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-elevated)',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff' }}>
                              {acc.username}
                            </span>
                            {isSelected && <Check size={12} style={{ color: 'var(--primary)' }} />}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: 2 }}>
                            {acc.role}
                          </div>
                          <div
                            style={{
                              fontSize: '0.65rem',
                              color: 'var(--text-muted)',
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {acc.displayName}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security Notice Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>Hyperledger Fabric X.509 MSP • AES/SHA-256 Confidential PDC • MinIO Off-Chain</span>
        </div>
      </div>
    </div>
  );
};
