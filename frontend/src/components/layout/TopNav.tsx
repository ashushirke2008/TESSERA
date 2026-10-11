import React from 'react';
import { Shield, User, RefreshCw, Server, LogOut } from 'lucide-react';
import { AuthUser } from '../../types';

interface TopNavProps {
  user: AuthUser | null;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  user,
  onLogout,
  onRefresh,
  isRefreshing,
}) => {
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
          title="Refresh Backend Readiness & Health"
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          <span>Status</span>
        </button>

        {/* Authenticated Identity & Server-Derived Role Badge */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.3rem 0.75rem',
              borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.2)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={13} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff' }}>
                {user.displayName.split('(')[0].trim()}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.04em',
                }}
              >
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Secure Sign Out Button */}
        <button
          className="btn btn-secondary"
          onClick={onLogout}
          title="Sign out and revoke session token"
          style={{
            padding: '0.35rem 0.65rem',
            fontSize: '0.75rem',
            color: '#f87171',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
