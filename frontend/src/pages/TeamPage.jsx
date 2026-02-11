import { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, User } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const ROLE_CONFIG = {
  admin: { icon: Shield, color: 'var(--error)', bg: 'var(--error-bg)', label: 'Admin' },
  manager: { icon: UserCheck, color: 'var(--accent)', bg: 'var(--accent-light)', label: 'Manager' },
  member: { icon: User, color: 'var(--text-secondary)', bg: 'var(--bg)', label: 'Member' },
};

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTeam()
      .then(setTeam)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26 }}>Team</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Manage your brand compliance team
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Team Members</span>
          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {team.length} members
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto', borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : (
          <div>
            {team.map(member => {
              const role = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
              const RoleIcon = role.icon;
              const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
              const isMe = member.id === currentUser?.id;

              return (
                <div key={member.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px',
                  borderBottom: '1px solid var(--border-light)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0,
                  }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {member.name} {isMe && <span style={{ fontSize: 11, color: 'var(--text-light)' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{member.email}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{member.team}</div>
                  <span className="badge" style={{ background: role.bg, color: role.color }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RoleIcon size={11} /> {role.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
