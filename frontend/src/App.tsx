import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { Dashboard } from './pages/Dashboard';
import { AssetRegistryPage } from './pages/AssetRegistryPage';
import { AssetRegistrationPage } from './pages/AssetRegistrationPage';
import { VerificationPage } from './pages/VerificationPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { TokenizationPage } from './pages/TokenizationPage';
import { TransfersPage } from './pages/TransfersPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';
import { fetchHealth, fetchReadiness, loginAsRole } from './services/api';
import {
  NavPage,
  BusinessRole,
  SystemHealthData,
  SystemReadinessData,
} from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [currentRole, setCurrentRole] = useState<BusinessRole>('ADMINISTRATOR');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [health, setHealth] = useState<SystemHealthData>({
    status: 'OFFLINE',
    timestamp: new Date().toISOString(),
    uptime: 0,
    version: '1.0.0',
    environment: 'development',
  });

  const [readiness, setReadiness] = useState<SystemReadinessData>({
    status: 'NOT_READY',
    timestamp: new Date().toISOString(),
    service: 'tessera-api',
    dependencies: {
      environment: { status: 'loading' },
      fabric: { status: 'unconfigured', connected: false },
      minio: { status: 'unconfigured', connected: false },
      adapters: { status: 'unconfigured', configuredCount: 0 },
    },
  });

  const loadStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [h, r] = await Promise.all([fetchHealth(), fetchReadiness()]);
      setHealth(h);
      setReadiness(r);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRoleChange = useCallback(async (newRole: BusinessRole) => {
    setCurrentRole(newRole);
    try {
      await loginAsRole(newRole);
    } catch (err) {
      console.warn('Failed to switch JWT token for role:', newRole, err);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Initialize token for default role
    handleRoleChange('ADMINISTRATOR');
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus, handleRoleChange]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard health={health} readiness={readiness} onNavigate={setCurrentPage} />;
      case 'registry':
        return <AssetRegistryPage onNavigate={setCurrentPage} />;
      case 'registration':
        return <AssetRegistrationPage onNavigate={setCurrentPage} />;
      case 'verification':
        return <VerificationPage />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'tokenization':
        return <TokenizationPage />;
      case 'transfers':
        return <TransfersPage />;
      case 'audit':
        return <AuditPage />;
      case 'settings':
        return (
          <SettingsPage
            readiness={readiness}
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
          />
        );
      default:
        return <Dashboard health={health} readiness={readiness} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        health={health}
        readiness={readiness}
      />
      <div className="main-layout">
        <TopNav
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          health={health}
          onRefresh={loadStatus}
          isRefreshing={isRefreshing}
        />
        <main className="content-area">{renderPage()}</main>
      </div>
    </div>
  );
};

export default App;
