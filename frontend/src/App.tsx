import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AssetRegistryPage } from './pages/AssetRegistryPage';
import { AssetRegistrationPage } from './pages/AssetRegistrationPage';
import { VerificationPage } from './pages/VerificationPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { TokenizationPage } from './pages/TokenizationPage';
import { TransfersPage } from './pages/TransfersPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  fetchHealth,
  fetchReadiness,
  getStoredUser,
  getAuthToken,
  logout,
  fetchCurrentUser,
} from './services/api';
import {
  NavPage,
  AuthUser,
  SystemHealthData,
  SystemReadinessData,
} from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
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

  // Verify existing token on initial load
  useEffect(() => {
    loadStatus();
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          // Token expired or invalid: clear session
          setUser(null);
        });
    }

    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentPage('dashboard');
  };

  // If user is not authenticated, display enterprise LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderPage = () => {
    // Role-based route guard: ensure users cannot accidentally see pages they lack rights to
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard health={health} readiness={readiness} onNavigate={setCurrentPage} />;
      case 'registry':
        return <AssetRegistryPage onNavigate={setCurrentPage} />;
      case 'registration':
        if (user.role !== 'ISSUER_REGISTRAR' && user.role !== 'ADMINISTRATOR') {
          return <Dashboard health={health} readiness={readiness} onNavigate={setCurrentPage} />;
        }
        return <AssetRegistrationPage onNavigate={setCurrentPage} />;
      case 'verification':
        return <VerificationPage />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'tokenization':
        if (user.role !== 'ADMINISTRATOR') {
          return <Dashboard health={health} readiness={readiness} onNavigate={setCurrentPage} />;
        }
        return <TokenizationPage />;
      case 'transfers':
        return <TransfersPage />;
      case 'audit':
        return <AuditPage />;
      case 'settings':
        return <SettingsPage readiness={readiness} currentRole={user.role} />;
      default:
        return <Dashboard health={health} readiness={readiness} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        currentRole={user.role}
        readiness={readiness}
      />
      <div className="main-layout">
        <TopNav
          user={user}
          onLogout={handleLogout}
          onRefresh={loadStatus}
          isRefreshing={isRefreshing}
        />
        <main className="content-area">{renderPage()}</main>
      </div>
    </div>
  );
};

export default App;
