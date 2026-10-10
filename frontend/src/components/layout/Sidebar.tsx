import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  FileCheck2,
  CheckCheck,
  Coins,
  ArrowLeftRight,
  ShieldAlert,
  Settings,
  Layers,
  LucideIcon,
} from 'lucide-react';
import { NavPage, SystemHealthData, SystemReadinessData } from '../../types';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  health: SystemHealthData;
  readiness: SystemReadinessData;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  health,
  readiness,
}) => {
  const navItems: { id: NavPage; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registry', label: 'Asset Registry', icon: Boxes },
    { id: 'registration', label: 'Register Asset', icon: PlusCircle },
    { id: 'verification', label: 'Verification & Claims', icon: FileCheck2 },
    { id: 'approvals', label: 'Approvals Queue', icon: CheckCheck },
    { id: 'tokenization', label: 'Tokenization', icon: Coins },
    { id: 'transfers', label: 'Transfers & Holdings', icon: ArrowLeftRight },
    { id: 'audit', label: 'Audit & Provenance', icon: ShieldAlert },
    { id: 'settings', label: 'Network Settings', icon: Settings },
  ];

  const isUp = health.status === 'UP';
  const fabricConnected = readiness.dependencies?.fabric?.connected ?? false;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <Layers size={22} />
        </div>
        <div className="brand-text">
          <h1>TESSERA</h1>
          <span>Fabric Enterprise Registry</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="fabric-node-info">
          <div className="node-status-row">
            <span style={{ color: 'var(--text-muted)' }}>API Server:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span className={`status-dot ${isUp ? 'green' : 'red'}`} />
              {health.status}
            </span>
          </div>
          <div className="node-status-row">
            <span style={{ color: 'var(--text-muted)' }}>Fabric Gateway:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span className={`status-dot ${fabricConnected ? 'green' : 'yellow'}`} />
              {fabricConnected ? 'Connected' : 'Stage 1 Pending'}
            </span>
          </div>
          <div className="node-status-row">
            <span style={{ color: 'var(--text-muted)' }}>Off-Chain Store:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span className="status-dot yellow" />
              MinIO Pending
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
