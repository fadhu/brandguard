import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Upload, AlertCircle, BookOpen,
  Copy, Users, Settings, LogOut
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload & Scan', icon: Upload },
    { id: 'issues', label: 'Issues', icon: AlertCircle },
  ]},
  { section: 'Brand', items: [
    { id: 'guidelines', label: 'Guidelines', icon: BookOpen },
    { id: 'assets', label: 'Assets', icon: Copy },
    { id: 'team', label: 'Team', icon: Users },
  ]},
  { section: 'Settings', items: [
    { id: 'settings', label: 'Configuration', icon: Settings },
  ]},
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '??';

  return (
    <aside style={{
      width: 260,
      background: 'var(--bg-sidebar)',
      color: 'var(--text-inverse)',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 20px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, padding: '0 4px' }}>
        <div style={{
          width: 34, height: 34, background: 'var(--accent)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: -0.5,
        }}>Bg</div>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500 }}>Brandguard</span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {navItems.map(({ section, items }) => (
          <div key={section} style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
              color: 'rgba(255,255,255,0.3)', padding: '0 12px', marginBottom: 12,
              fontWeight: 600,
            }}>{section}</div>
            {items.map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                onClick={() => onNavigate(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, marginBottom: 2,
                  color: activePage === id ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontWeight: activePage === id ? 500 : 400,
                  background: activePage === id ? 'rgba(43,92,230,0.2)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (activePage !== id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                onMouseLeave={e => {
                  if (activePage !== id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  }
                }}
              >
                <Icon size={18} style={{ opacity: activePage === id ? 1 : 0.7 }} />
                {label}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 12px 0',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: 'white',
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{user?.role}</div>
        </div>
        <LogOut
          size={16}
          style={{ opacity: 0.4, cursor: 'pointer' }}
          onClick={logout}
        />
      </div>
    </aside>
  );
}
