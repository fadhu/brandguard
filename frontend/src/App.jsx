import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import IssuesPage from './pages/IssuesPage';
import GuidelinesPage from './pages/GuidelinesPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} />,
    upload: <UploadPage />,
    issues: <IssuesPage />,
    guidelines: <GuidelinesPage />,
    assets: <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Assets Library</h2>
      <p>Coming soon — manage your approved brand assets here.</p>
    </div>,
    team: <TeamPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="main-content">
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
