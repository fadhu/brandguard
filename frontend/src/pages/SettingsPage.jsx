import { Settings, Key, Bell, Globe } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26 }}>Configuration</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Manage your Brandguard settings
        </p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {[
          { icon: Key, title: 'API Configuration', desc: 'Set your Anthropic API key for Claude-powered compliance analysis', action: 'Configure' },
          { icon: Bell, title: 'Notifications', desc: 'Set up alerts for new issues, scan completions, and compliance drops', action: 'Manage' },
          { icon: Globe, title: 'Integrations', desc: 'Connect Figma, Slack, Google Drive, and other tools', action: 'Browse' },
          { icon: Settings, title: 'General', desc: 'Default scan settings, thresholds, and team preferences', action: 'Edit' },
        ].map(({ icon: Icon, title, desc, action }) => (
          <div key={title} className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0,
            }}>
              <Icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
            </div>
            <button className="btn btn-secondary btn-sm">{action}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
