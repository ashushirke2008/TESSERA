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
  Activity,
  Layers,
  LucideIcon,
} from 'lucide-react';
import { NavPage, BusinessRole, SystemReadinessData } from '../../types';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  currentRole: BusinessRole;
  readiness: SystemReadinessData;
}

const ROLE_NAV_PAGES: Record<BusinessRole, NavPage[]> = {
  ADMINISTRATOR: [
    'dashboard',
    'registry',
    'registration',
    'verification',
    'approvals',
    'tokenization',
    'transfers',
    'audit',
    'settings',
  ],
  ISSUER_REGISTRAR: [
    'dashboard',
    'registry',
    'registration',
    'verification',
    'approvals',
  ],
  VERIFIER: [
    'dashboard',
    'verification',
    'registry',
    'audit',
  ],
  INVESTOR_BUYER: [
    'dashboard',
    'registry',
    'transfers',
  ],
  COMPLIANCE_OFFICER: [
    'dashboard',
    'registry',
    'verification',
    'approvals',
    'audit',
  ],
  AUDITOR: [
    'dashboard',
    'registry',
    'audit',
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  currentRole,
  readiness,
}) => {
  const allNavItems: { id: NavPage; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registry', label: 'Asset Registry', icon: Boxes },
    { id: 'registration', label: 'Register Asset', icon: PlusCircle },
    { id: 'verification', label: 'Verification & Claims', icon: FileCheck2 },
    { id: 'approvals', label: 'Approvals Queue', icon: CheckCheck },
    { id: 'tokenization', label: 'Tokenization', icon: Coins },
    { id: 'transfers', label: 'Transfers & Holdings', icon: ArrowLeftRight },
    { id: 'audit', label: 'Audit & Provenance', icon: ShieldAlert },
    { id: 'settings', label: 'System Health', icon: Activity },
  ];

  const permittedPages = ROLE_NAV_PAGES[currentRole] || ROLE_NAV_PAGES.ADMINISTRATOR;
  const visibleNavItems = allNavItems.filter((item) => permittedPages.includes(item.id));

  const fabricConnected = readiness.dependencies?.fabric?.connected ?? false;
  const minioConnected = readiness.dependencies?.minio?.connected ?? false;

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
        <div className="nav-section-title">Navigation • {currentRole.replace('_', ' ')}</div>
        {visibleNavItems.map((item) => {
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

      {/* Sidebar Footer with truthful infrastructure connectivity */}
      <div className="sidebar-footer">
        <div className="fabric-node-info">
          <div className="node-status-row">
            <span style={{ color: 'var(--text-muted)' }}>Fabric Gateway:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span className={`status-dot ${fabricConnected ? 'green' : 'yellow'}`} />
              {fabricConnected ? 'Connected' : 'Offline (Simulated)'}
            </span>
          </div>
          <div className="node-status-row">
            <span style={{ color: 'var(--text-muted)' }}>Off-Chain Store:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span className={`status-dot ${minioConnected ? 'green' : 'yellow'}`} />
              {minioConnected ? 'MinIO Ready' : 'Local Storage'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
